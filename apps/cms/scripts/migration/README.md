# Content migration runbook

Copy published content from old-core prod (`cms.codeuncode.com`) into new-core's
beta CMS (`cms-beta.codeuncode.com`). Media files travel too.

Plan (context): [`docs/content-migration.md`](../../../../docs/content-migration.md).

## TL;DR

```sh
cd apps/cms

# 1. Export from old prod → migration/export/ at repo root
pnpm run migration:export

# 2. (optional) Rehearse against local miniflare first
pnpm run migration:import:local

# 3. Import into beta remote
pnpm run migration:import:beta

# 4. Verify
curl -s "https://cms-beta.codeuncode.com/api/services?limit=0" | jq .totalDocs
```

Detailed steps + flags + gotchas follow below.

## All migration commands

Everything runs from `apps/cms/`.

### Schema migrations (Payload DDL)

```sh
# Create a migration file against local miniflare (diffs against current schema)
pnpm run migrate:create                   # prompts for a name

# Apply committed migrations to local miniflare
pnpm run migrate

# Apply committed migrations to remote D1 (the env picked by CLOUDFLARE_ENV).
# --disable-confirm skips the interactive "data loss" prompt so it's CI-safe.
# Usually runs automatically as part of `pnpm run build` on deploy.
pnpm run migrate:prod                     # targets whatever wrangler env is active
```

### Content migration (collections + media)

```sh
# Dump published content + media from old-core prod into migration/export/
pnpm run migration:export
pnpm run migration:export -- --dry-run
pnpm run migration:export -- --only=media,brands
pnpm run migration:export -- --source=https://cms.codeuncode.com --out=../../migration/export

# Ingest into local miniflare (rehearsal)
pnpm run migration:import:local
pnpm run migration:import:local -- --dry-run
pnpm run migration:import:local -- --only=media,brands
pnpm run migration:import:local -- --mode=append   # default is --mode=replace

# Ingest into beta remote
pnpm run migration:import:beta
pnpm run migration:import:beta -- --dry-run
```

### Seed / wipe

```sh
# Seed everything the seed-data files provide, against local miniflare
curl http://localhost:3000/seed

# Seed a single collection locally
curl "http://localhost:3000/seed?only=partners"

# Seed against beta remote (SEED_SECRET required)
curl "https://cms-beta.codeuncode.com/seed?secret=$SEED_SECRET"
curl "https://cms-beta.codeuncode.com/seed?only=partners&secret=$SEED_SECRET"

# Wipe every seedable collection (local)
curl http://localhost:3000/wipe

# Wipe beta
curl "https://cms-beta.codeuncode.com/wipe?secret=$SEED_SECRET"
```

Services/Categories/Tags must be seeded together (relational deps) — the
endpoint 400s if you try to split them.

### D1 / R2 direct access (for diagnostics or one-off fixes)

```sh
# List rows in payload_migrations (confirms which migrations have been applied)
pnpm exec wrangler d1 execute D1 --remote --env beta \
  --command "SELECT name, batch FROM payload_migrations ORDER BY id;"

# Show a table's columns
pnpm exec wrangler d1 execute D1 --remote --env beta \
  --command "PRAGMA table_info(services);"

# Row counts per collection
pnpm exec wrangler d1 execute D1 --remote --env beta \
  --command "SELECT 'services' t, COUNT(*) FROM services UNION ALL
             SELECT 'projects', COUNT(*) FROM projects UNION ALL
             SELECT 'brands',   COUNT(*) FROM brands UNION ALL
             SELECT 'media',    COUNT(*) FROM media;"

# Dump a SQL backup of the beta DB (safety net before a risky import)
pnpm exec wrangler d1 export D1 --remote --env beta \
  --output ../../prod-backup-$(date +%Y%m%d-%H%M).sql

# List R2 objects in the beta bucket
pnpm exec wrangler r2 object list cu-core-staging
```

### Verification (public REST API)

```sh
CMS=https://cms-beta.codeuncode.com

for slug in categories tags services projects brands partners media; do
  n=$(curl -s "$CMS/api/$slug?limit=0" | jq .totalDocs)
  echo "$slug: $n"
done
```

### Redo / recover

```sh
# Full redo: wipe beta, re-import (idempotent default is --mode=replace)
curl "https://cms-beta.codeuncode.com/wipe?secret=$SEED_SECRET"
pnpm run migration:import:beta

# Redo only media (say the import crashed mid-run)
pnpm exec wrangler d1 execute D1 --remote --env beta \
  --command "DELETE FROM media;"
pnpm run migration:import:beta -- --only=media
```


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
