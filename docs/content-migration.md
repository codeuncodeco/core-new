# Content migration: old-core → core-new

Part of Phase 6 of [`plan.md`](./plan.md). This doc fleshes out the "how": export every piece of real content + media from old-core's prod, then seed it into core-new's beta or prod D1 without manual re-entry.

## Goals

- **Preserve** every published piece of CMS content (Services, Projects, Brands, Partners, Categories, Tags) with references intact.
- **Preserve** all uploaded media (logos, project covers) in R2, with Payload's Media docs pointing at the new R2 URLs.
- **Preserve** global settings (RateCardSettings, EmailSettings once it exists).
- **Skip** private collections (Users — fresh accounts) and ephemeral data (ContactSubmissions).
- **Idempotent** enough to run twice — re-importing should overwrite, not duplicate.
- **Dry-runnable** — every step has a mode that reports "what would happen" without writing.

## What we're NOT migrating

- **Users / auth** — editors sign up fresh in the new admin. Cleaner permissions start.
- **ContactSubmissions** — private, historical, no value on new infra.
- **`payload-migrations` rows** — the new DB has its own migration history.
- **Drafts** (`_status = 'draft'`) — first pass imports published only. Can revisit if editors want in-flight drafts carried over, but default is clean slate.
- **Payload versions tables (`_v` rows)** — only the current published snapshot is migrated; version history starts fresh.

---

## Export phase

### Output layout

```
migration/
  export/
    collections/
      categories.json
      tags.json
      services.json
      projects.json
      brands.json
      partners.json
    globals/
      rate-card-settings.json
      email-settings.json   # when it exists
    media/
      manifest.json         # array of { id, filename, url, alt, createdAt, mimeType }
      files/
        <filename>          # raw file bytes for each media doc
    meta.json               # exportedAt, source URL, collection counts
```

All written to `migration/export/` at the repo root, gitignored.

### Script: `migration/scripts/export-old.mjs`

Node script. Hits old-core's public REST API at `https://cms.codeuncode.com`.

**Collections export (per collection):**
```js
// Paginate through all published docs at depth=0 (ids-only for relationships).
// depth=0 keeps the export compact and avoids circular expansion; relationships
// are re-resolved during import by slug or by id-map.
GET /api/<slug>?limit=500&depth=0&page=<n>
```
Save the `docs` array to `collections/<slug>.json`.

**Globals export:**
```js
GET /api/globals/rate-card-settings?depth=0
```
Save to `globals/<slug>.json`.

**Media export** — this is the trickiest part:
1. Paginate `/api/media?depth=0&limit=500` → write metadata array to `media/manifest.json`.
2. For each doc, read its `url` (Payload returns the R2 public URL) and `filename`.
3. `fetch(url)` → write bytes to `media/files/<filename>`.
4. If old-core had local variants (thumbnails/sizes via Payload's imageSizes), treat the original as canonical — the new import will regenerate sizes.

### Auth

Public API returns only published docs for drafts-enabled collections, which is exactly what we want. **No auth needed** for the export.

### Pagination + safety

- `limit: 500`, loop while `hasNextPage`.
- Rate-limit to 1 request/300ms so we don't hammer prod.
- Retry on transient errors (exponential backoff, 3 attempts).
- Write files atomically (temp file + rename) so a crash doesn't leave partial JSON.

### Dry-run

`node migration/scripts/export-old.mjs --dry-run` prints the planned fetches + file writes, touches nothing.

---

## Import phase

### Prerequisites

- New core-new worker already deployed to beta (cms-beta.codeuncode.com).
- Beta D1 has all collections migrated (Phase 4 complete) — schema matches what the export expects.
- Beta R2 bucket (`cu-core-staging`) is empty or known-to-not-conflict.
- `PAYLOAD_SECRET` + `SEED_SECRET` env vars known.

### Script: `migration/scripts/import-new.mjs`

Node CLI running against core-new's Payload via the **local API** (`getPayload({ config })`), not REST. Reason: local API lets us inject into the DB directly, preserves timestamps with `overrideAccess + forceCreate`, and handles relationships cleanly.

**Ordered pass (dependencies respected):**

1. **Media** — upload each file in `media/files/` via `payload.create({ collection: 'media', data: manifest[i], file: { name, data: fs.readFileSync(...) }, overrideAccess: true, draft: false })`. Record old-id → new-id in an in-memory map. Preserve `alt` + `createdAt` from the manifest.
2. **Categories** — direct create. No relationship refs.
3. **Tags** — direct create. No relationship refs.
4. **Brands** — create with `image: newMediaIdByOldId[brand.image]`.
5. **Projects** — create with `cover: newMediaIdByOldId[project.cover]`.
6. **Services** — create with `category: newCategoryIdByOldSlug[svc.category.slug]` and `tags: svc.tags.map(t => newTagIdByOldSlug[t.slug])`.
7. **Partners** — create with `image: newMediaIdByOldId[partner.image]` when present.
8. **Globals** — `payload.updateGlobal({ slug, data, overrideAccess: true })` for rate-card + email settings.

All creates pass `draft: false` to mark as published in the new `versions: { drafts: true }` schema.

### Idempotency

Option: script takes `--mode=replace` (default) which deletes existing docs of each collection before importing, or `--mode=append` which inserts only when a matching slug/name isn't already present.

For a one-shot cutover, `replace` is cleanest. For iterative testing during Phase 6 dry-runs, `append` or a scoped `--only=<collections>` flag lets you re-run safely.

### Preserving timestamps

By default Payload sets `createdAt`/`updatedAt` to `now()` on create. To preserve originals:

```js
payload.create({
  collection,
  data: { ...doc, createdAt: doc.createdAt, updatedAt: doc.updatedAt },
  overrideAccess: true,
  draft: false,
})
```

D1 schema stores these as plain text columns, Payload accepts them if passed explicitly.

### Dry-run

`--dry-run` flag: walks the export, resolves all relationship maps, reports what it would create, writes nothing.

---

## Execution sequence (Phase 6 day-of)

1. **Pre-flight.**
   - Export-dry-run: confirm counts match expectations.
   - Import-dry-run against a scratch D1 (or reset beta): confirm all relationships resolve.
   - Confirm R2 free space / quota on prod bucket.

2. **Export.**
   - `node migration/scripts/export-old.mjs`
   - Verify `migration/export/meta.json` counts match old prod admin counts.
   - Commit the export snapshot to a branch (for provenance) OR archive separately — don't leave it in main.

3. **Beta rehearsal.**
   - Wipe beta D1 + R2: `pnpm --filter cu-core exec wrangler d1 execute D1 --remote --command "DELETE FROM ..."` (or export + restore fresh).
   - `node migration/scripts/import-new.mjs --target=beta`
   - Spot-check beta.codeuncode.com + cms-beta.codeuncode.com — all content visible.

4. **Cutover — prod.**
   - Add `env.production` to `apps/cms/wrangler.jsonc` + `apps/web/wrangler.jsonc` with `cu-core` / `cu-web` worker names + `cms.codeuncode.com` / `codeuncode.com` routes. (See plan.md Phase 6 for the exact config.)
   - Release those routes from old-core (remove from old-core wrangler, redeploy old-core, or delete routes in dashboard).
   - `pnpm --filter cu-core run deploy --env=production` (both db + app).
   - `pnpm --filter cu-web deploy --env=production`.
   - `node migration/scripts/import-new.mjs --target=prod`
   - Smoke test.

5. **Post-cutover.**
   - Archive old-core repo on GitHub.
   - Rename `core-new` → `core`.
   - Remove `migration/export/` from the tree (or move to an archived branch).

---

## Rollback

If import fails or content looks wrong, the plan is:

1. **Prod import botched** — rollback prod D1 to backup:
   - Before step 4, `wrangler d1 export D1 --remote --env production --output prod-backup-<ts>.sql`.
   - If needed: drop current prod DB content and replay the backup.
2. **Routes pointing at broken new-core** — re-add routes to old-core wrangler, redeploy old-core. Old-core is never turned off until Phase 6 step 5.
3. **Media uploaded but DB rolled back** — uploaded R2 objects become orphans. Periodically clean by listing R2 and diffing against `media` table.

---

## Open questions to resolve before executing

- **Media re-upload vs R2-to-R2 copy.** Download-then-upload via Payload is simplest but slow for large media libraries. Alternative: `wrangler r2 object copy` across buckets in the same account is instant. We'd then only need to create the Media docs in DB with matching filenames. Decide based on asset count.
- **URL stability.** If old R2 public URLs are in rendered HTML somewhere (e.g. rich-text blocks with embedded images), those URLs pointing at the old bucket keep working as long as the old bucket exists. Safer to keep the old bucket read-only for a grace period post-cutover instead of deleting it immediately.
- **RichText relationships.** Some Payload richText values embed media references by id inline. The export/import needs to rewrite those old-ids → new-ids during import, not just at top-level relationship fields. Scan each richText for embedded refs.
- **Image sizes / imageSizes plugin.** If old core uses Payload `imageSizes`, the new core must match the config before import so Payload regenerates the variants correctly on upload. Otherwise variants are missing until re-saved.
- **Partial re-runs.** If export succeeds and import fails halfway, re-running the full import should be safe because `--mode=replace` wipes before inserting. But verify no FK-cascade surprises.

---

## Deliverables checklist

- [ ] `migration/scripts/export-old.mjs` with dry-run + real modes.
- [ ] `migration/scripts/import-new.mjs` with dry-run, `--mode`, `--target`, `--only`.
- [ ] `migration/export/` gitignored at repo root.
- [ ] `migration/README.md` inside the dir — usage + env var reference.
- [ ] `.env.example` entries for migration scripts: `OLD_CMS_URL`, `TARGET_CMS_URL`, `SEED_SECRET`.
- [ ] Rehearsal run on beta with real export — verified before prod cutover.
