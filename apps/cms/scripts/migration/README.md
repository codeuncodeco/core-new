# Content migration runbook

Copy published content from old-core prod (`cms.codeuncode.com`) into new-core's
beta CMS (`cms-beta.codeuncode.com`). Media files travel too.

Plan (context): [`docs/content-migration.md`](../../../../docs/content-migration.md).

## What gets migrated

- **Collections:** categories, tags, services, projects, brands.
- **Globals:** rate-card-settings, email-settings.
- **Media:** every file + its Payload Media doc (alt, filename, mimeType preserved).

**Not exported from old-core:** partners — the collection wasn't deployed to
old-core prod. After import, seed the default 4 partners on new-core with
`curl "https://cms-beta.codeuncode.com/seed?only=partners&secret=$SEED_SECRET"`.

## What doesn't

- Users (create fresh admin accounts in new-core).
- ContactSubmissions (private, no value on new infra).
- Drafts (only published docs are exported — public API only returns those).
- Payload's versions tables (`_v` rows) — history restarts.

## Prereqs

- Old-core prod is up at `cms.codeuncode.com` (public API reachable).
- New-core beta is deployed + schema migrated + an admin user exists.
- Run commands from `apps/cms/`:
  ```sh
  cd apps/cms
  ```

## Step 1: export

Hits old-core's public REST API, paginates collections + globals, downloads
media files to `migration/export/` at the repo root. No auth needed.

```sh
# dry run — prints what would be fetched, writes nothing
node scripts/migration/export-old.mjs --dry-run

# real run
node scripts/migration/export-old.mjs

# options
node scripts/migration/export-old.mjs --source=https://cms.codeuncode.com --out=../../migration/export
node scripts/migration/export-old.mjs --only=partners,brands,media
```

Output layout:

```
migration/export/
├── collections/
│   ├── categories.json
│   ├── tags.json
│   ├── services.json
│   ├── projects.json
│   ├── brands.json
│   └── partners.json
├── globals/
│   ├── rate-card-settings.json
│   └── email-settings.json
├── media/
│   ├── manifest.json        # array of { id, filename, url, alt, mimeType, ... }
│   └── files/
│       └── <filename>       # raw file bytes, one per media doc
└── meta.json                # exportedAt, source, counts
```

Rate-limited to 300ms/request so we don't hammer prod.

## Step 2: import

Uses Payload's **local API** (not REST) so hooks run, relationships resolve
cleanly by id-map, timestamps preserve, and drafts-enabled collections get
published status (`draft: false` on every create).

### Option A — import into local miniflare (rehearsal)

```sh
CLOUDFLARE_ENV=local pnpm exec tsx scripts/migration/import-new.ts
```

No secrets needed. Writes into the `.wrangler/state/` miniflare DB + R2.
Good for validating the import logic end-to-end before touching remote.

### Option B — import into beta remote

Same trick as `deploy:database` — `NODE_ENV=production` + `CLOUDFLARE_ENV=beta`
makes `getCloudflareContext` bind to remote `cu-core-staging` D1 + R2.

```sh
cross-env NODE_ENV=production PAYLOAD_SECRET=ignore CLOUDFLARE_ENV=beta \
  pnpm exec tsx scripts/migration/import-new.ts
```

Or via the npm script (see below).

### Flags

```sh
tsx scripts/migration/import-new.ts --dry-run         # resolve refs, count, touch nothing
tsx scripts/migration/import-new.ts --mode=append     # don't wipe first (default is replace)
tsx scripts/migration/import-new.ts --only=media,projects
tsx scripts/migration/import-new.ts --in=../../migration/export
```

Import order respects relational deps: Media → Categories → Tags → Brands →
Projects → Services → Partners → Globals.

## Step 3: verify

```sh
# Count docs on beta (REST is fine, no auth needed for public reads)
curl -s "https://cms-beta.codeuncode.com/api/services?limit=0" | jq .totalDocs
curl -s "https://cms-beta.codeuncode.com/api/projects?limit=0" | jq .totalDocs
curl -s "https://cms-beta.codeuncode.com/api/media?limit=0"    | jq .totalDocs
# ...should match meta.json counts in the export
```

Browse `https://beta.codeuncode.com/` — real content should render.

## Known gaps / limitations

- **Rich text fields with embedded media refs** aren't rewritten. If a
  Service/Project description has an inline image, that image ID still points
  at the old media ID, and the reference will 404. Flag for a follow-up pass
  (scan `doc.description` JSON for `{type:"upload", value:<id>}` nodes and
  rewrite `value`).
- **Relationship depth=0 assumption.** Export fetches with depth=0 so
  relationships arrive as numeric ids. If any collection uses polymorphic
  relationships (`relationTo: ['a','b']`), the id-map would need a shape
  tweak. Our current schema doesn't.
- **Drafts don't migrate.** Public API only returns published. If old-core
  has in-flight drafts you want carried over, the export would need
  authenticated `?draft=true` reads. Not in scope here.
- **Users migration is intentionally skipped.** Create fresh accounts via the
  admin signup flow after import.

## Re-runs

`--mode=replace` (default) wipes each collection before re-importing, so
running again with the same export folder is safe. Good for iterating during
dry-runs.
