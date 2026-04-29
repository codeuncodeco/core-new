# Setup runbook — things you run

Paired with [`move.md`](./move.md). That doc explains the target state + phases; this one is the action checklist.

Workers will be created via the Cloudflare dashboard with GitHub integration (Workers Builds) so future pushes deploy automatically. Everything below is the one-time setup to get there.

---

## Phase 0 — `dev` env (personal sandbox)

Same shape as Phase A, but pinned to `cms-dev.codeuncode.com` / `dev.codeuncode.com`. Use it as a personal scratchpad without polluting `test`.

### 0.1. Create resources (CLI)

```sh
cd apps/cms

# D1 — record the returned database_id
pnpm exec wrangler d1 create codeuncode-dev
# ⚠ paste the id into apps/cms/wrangler.jsonc > env.dev.d1_databases[0].database_id
#   (currently: "REPLACE_WITH_DEV_D1_ID")

# R2
pnpm exec wrangler r2 bucket create codeuncode-dev
```

Commit the wrangler.jsonc change (D1 id).

### 0.2. DNS (Cloudflare dashboard → `codeuncode.com` zone)

Two **proxied** DNS records. Target doesn't matter — `custom_domain` binding takes over after first deploy.

- `dev.codeuncode.com` — CNAME, proxied
- `cms-dev.codeuncode.com` — CNAME, proxied

### 0.3. Create `codeuncode-cms-dev` worker (dash)

1. Workers & Pages → **Create** → **Import a repository** (Git).
2. Connect the GitHub repo.
3. **Project name:** `codeuncode-cms-dev`.
4. **Production branch:** `add-proposals` (or whichever branch you want auto-deployed to dev).
5. **Root directory:** `apps/cms`.
6. **Build command:** `pnpm install --frozen-lockfile && pnpm --filter cu-core exec opennextjs-cloudflare build --env=dev`
7. **Deploy command:** `pnpm --filter cu-core exec opennextjs-cloudflare deploy --env=dev`
8. **Build environment variables:**
   - `CLOUDFLARE_ENV=dev`
   - `NODE_VERSION=20`
9. Save (do **not** deploy yet — secrets next).

### 0.4. Set `codeuncode-cms-dev` secrets (CLI)

```sh
cd apps/cms
pnpm exec wrangler secret put PAYLOAD_SECRET --env=dev   # openssl rand -hex 32
pnpm exec wrangler secret put SEED_SECRET    --env=dev   # openssl rand -hex 32
pnpm exec wrangler secret put RESEND_API_KEY --env=dev   # reuse test/live key, or a separate one
pnpm exec wrangler secret put CRON_SECRET    --env=dev   # used by /cold-flag-cron; must match the cron worker's
```

### 0.5. Create `codeuncode-web-dev` worker (dash)

1. Workers & Pages → **Create** → **Import a repository**.
2. Same repo.
3. **Project name:** `codeuncode-web-dev`.
4. **Production branch:** same as 0.3.
5. **Root directory:** `apps/web`.
6. **Build command:** `pnpm install --frozen-lockfile && pnpm --filter cu-web run build`
7. **Deploy command:** `pnpm --filter cu-web exec wrangler deploy --env=dev`
8. **Build environment variables:**
   - `NODE_VERSION=20`
9. Save. No secrets needed for web.

### 0.6. First deploys

Push to the chosen branch. Workers Builds runs both workers' builds and deploys.

### 0.7. Bootstrap

```sh
# Browse to https://cms-dev.codeuncode.com/admin → create first admin user.

# Seed
curl "https://cms-dev.codeuncode.com/seed?secret=$SEED_SECRET&only=clients,proposals"
```

### 0.8. Smoke test

- `https://cms-dev.codeuncode.com/admin` loads, you can log in.
- `https://dev.codeuncode.com/proposals/consultway-proposal-a` — public proposal renders. Browser Print → Save as PDF works.
- `https://dev.codeuncode.com/edit/proposals/consultway-proposal-a` — sign in at the CMS admin first (cookie spans `.codeuncode.com`), then click any text on the editor page; status pill should flash *Saving… Saved*.
- Live preview iframe in the proposal admin form re-renders as you type.

### 0.9. Cron worker (only after the CMS worker exists)

See [Phase D — cron worker](#phase-d--cron-worker-any-env).

---

## Phase A — `test` env

### A1. Create resources (CLI)

```sh
cd apps/cms

# D1 — record the returned database_id
pnpm exec wrangler d1 create codeuncode-test
# ⚠ paste the id into apps/cms/wrangler.jsonc > env.test.d1_databases[0].database_id
#   (currently: "97df08dc-07ad-4bfb-a89e-fd1156758e68" — verify it's real, or replace)

# R2
pnpm exec wrangler r2 bucket create codeuncode-test
```

Commit the wrangler.jsonc change (D1 id) so CF Workers Builds picks it up on push.

### A2. DNS (Cloudflare dashboard → `codeuncode.com` zone)

Add two **proxied** DNS records. Target doesn't matter — the worker's `custom_domain` binding takes over after first deploy. Placeholder target `192.0.2.1` is fine, or use `@` CNAME.

- `test.codeuncode.com` — CNAME, proxied
- `cms-test.codeuncode.com` — CNAME, proxied

### A3. Create `codeuncode-cms-test` worker (dash)

1. Workers & Pages → **Create** → **Import a repository** (Git).
2. Connect the GitHub repo.
3. **Project name:** `codeuncode-cms-test`.
4. **Production branch:** `main` (or a dedicated test branch — your call).
5. **Root directory:** `apps/cms`.
6. **Build command:** `pnpm install --frozen-lockfile && pnpm --filter cu-core exec opennextjs-cloudflare build --env=test`
7. **Deploy command:** `pnpm --filter cu-core exec opennextjs-cloudflare deploy --env=test`
8. **Build environment variables:**
   - `CLOUDFLARE_ENV=test`
   - `NODE_VERSION=20`
9. Save (do **not** deploy yet — secrets next).

### A4. Set `codeuncode-cms-test` secrets (CLI)

D1/R2 bindings come from `wrangler.jsonc` automatically — only secrets need setting.

```sh
cd apps/cms
pnpm exec wrangler secret put PAYLOAD_SECRET --env=test   # openssl rand -hex 32
pnpm exec wrangler secret put SEED_SECRET    --env=test   # openssl rand -hex 32
pnpm exec wrangler secret put RESEND_API_KEY --env=test   # reuse old-core's key
```

### A5. Create `codeuncode-web-test` worker (dash)

1. Workers & Pages → **Create** → **Import a repository**.
2. Same repo.
3. **Project name:** `codeuncode-web-test`.
4. **Production branch:** `main`.
5. **Root directory:** `apps/web`.
6. **Build command:** `pnpm install --frozen-lockfile && pnpm --filter cu-web run build`
7. **Deploy command:** `pnpm --filter cu-web exec wrangler deploy --env=test`
8. **Build environment variables:**
   - `NODE_VERSION=20`
9. Save. No secrets needed for web.

### A6. Trigger first deploys

Push any commit to `main`. CF Workers Builds runs both workers' builds + deploys. Monitor:
- Workers & Pages → each project → **Deployments** tab.

Migrations run automatically on CMS deploy because `apps/cms/package.json`'s `build` script calls `migrate:prod` first — against the env picked by `CLOUDFLARE_ENV=test`.

Actually, double-check: the existing `build` script is `pnpm run migrate:prod && next build`. The deploy command I wrote uses `opennextjs-cloudflare build` directly, which may skip `pnpm run build`. **Verify** what CF Workers Builds actually runs — if migrations don't run, change the build command to `pnpm install --frozen-lockfile && pnpm --filter cu-core run build && pnpm --filter cu-core exec opennextjs-cloudflare build --env=test`.

### A7. Bootstrap test env

```sh
# Browse to https://cms-test.codeuncode.com/admin → create first admin user.

# Seed content
curl "https://cms-test.codeuncode.com/seed?secret=$SEED_SECRET"
```

### A8. Smoke test

- `https://cms-test.codeuncode.com/admin` loads, you can log in.
- `https://test.codeuncode.com/` renders public site with seeded partners etc.
- From admin, open a Partner/Service/Project with live preview — iframe updates on edit.

### A9. Decommission old beta

Once test is confirmed healthy:

```sh
pnpm exec wrangler delete --name cu-core-beta
pnpm exec wrangler delete --name cu-web-beta
```

Delete `cu-core-staging` D1 + R2 via dashboard (or `wrangler d1 delete cu-core-staging` / `wrangler r2 bucket delete cu-core-staging`).

---

## Phase B — `live` env (no routes yet)

### B1. Create resources (CLI)

```sh
cd apps/cms

pnpm exec wrangler d1 create codeuncode-live
# ⚠ paste the returned id into apps/cms/wrangler.jsonc > env.live.d1_databases[0].database_id
#   (currently "REPLACE_WITH_codeuncode-live_D1_ID")

pnpm exec wrangler r2 bucket create codeuncode-live
```

Commit the wrangler.jsonc change.

### B2. Create `codeuncode-cms` worker (dash)

Same steps as A3 but:
- **Project name:** `codeuncode-cms`
- **Build command:** `pnpm install --frozen-lockfile && pnpm --filter cu-core exec opennextjs-cloudflare build --env=live`
- **Deploy command:** `pnpm --filter cu-core exec opennextjs-cloudflare deploy --env=live`
- **Build env:** `CLOUDFLARE_ENV=live`, `NODE_VERSION=20`
- **Production branch:** consider a dedicated branch (e.g. `live`) so prod isn't every `main` push. Alternatively leave as `main` and rely on review discipline.

### B3. `codeuncode-cms` secrets

```sh
cd apps/cms
pnpm exec wrangler secret put PAYLOAD_SECRET --env=live   # fresh, openssl rand -hex 32
pnpm exec wrangler secret put SEED_SECRET    --env=live   # fresh
pnpm exec wrangler secret put RESEND_API_KEY --env=live   # same key as test (shared)
```

### B4. Create `codeuncode-web` worker (dash)

Same as A5 but:
- **Project name:** `codeuncode-web`
- **Deploy command:** `pnpm --filter cu-web exec wrangler deploy --env=live`
- **Production branch:** same decision as B2.

### B5. First deploy

Push to the chosen branch. Workers Builds runs → workers serve on their `workers.dev` URLs:
- `https://codeuncode-cms.<account>.workers.dev`
- `https://codeuncode-web.<account>.workers.dev`

### B6. Bootstrap live admin

- Browse to `https://codeuncode-cms.<account>.workers.dev/admin` → create admin user.
- Do **not** seed — real content comes from Phase C content migration.

### B7. Smoke test

- Admin loads + logs in.
- Worker logs clean in Workers → codeuncode-cms → Logs.

---

## Phase C — Cutover

Runs when you're ready to flip prod from old-core to new-core. Detail in [`docs/content-migration.md`](./content-migration.md). Summary:

### C1. Content migration

```sh
cd apps/cms

# Export from old-core prod → migration/export/
pnpm run migration:export

# Rehearse against test (optional)
pnpm run migration:import:test

# Import into live
pnpm run migration:import:live
```

### C2. Release routes from old-core

Either:
- Remove `cms.codeuncode.com` + `codeuncode.com` route blocks from old-core's `wrangler.jsonc` → redeploy old-core, **or**
- Delete the routes in Cloudflare dashboard → Workers → old-core worker → Triggers.

This is the brief serving-gap window. Have C3 ready to push the moment C2 is done.

### C3. Claim routes on new-core

Edit `apps/cms/wrangler.jsonc` → add to `env.live`:

```jsonc
"routes": [{ "pattern": "cms.codeuncode.com", "custom_domain": true }],
```

Edit `apps/web/wrangler.jsonc` → add to `env.live`:

```jsonc
"routes": [{ "pattern": "codeuncode.com", "custom_domain": true }],
```

Commit + push to the live branch → Workers Builds redeploys → routes attach.

### C4. Smoke test

- `https://cms.codeuncode.com/admin` — log in, migrated content present.
- `https://codeuncode.com/` — public site renders real content, no 404s on media.
- Live preview works for Partners/Brands/Services/Projects.

### C5. Decommission old-core

After a few stable days:

- Delete old-core workers (dashboard or `wrangler delete`).
- Back up then delete old prod D1 (`wrangler d1 export ... --output prod-final-backup.sql`, then delete).
- Back up then delete old prod R2 bucket.
- Archive old-core GitHub repo.

---

## Phase D — cron worker (any env)

The cron worker (`apps/cron`) runs the daily `/cold-flag-cron` job. It's a separate Cloudflare Worker that talks to the CMS over a service binding. **Do this after the CMS worker for the env exists** — the binding requires the target worker to be deployable by name.

Repeat for each env (`dev`, `test`, `live`) you want the schedule on.

### D1. Create `codeuncode-cron-<env>` worker (dash)

1. Workers & Pages → **Create** → **Import a repository** (Git).
2. Same repo.
3. **Project name:** `codeuncode-cron-<env>` (e.g. `codeuncode-cron-dev`).
4. **Production branch:** same as the CMS worker for this env.
5. **Root directory:** `apps/cron`.
6. **Build command:** `pnpm install --frozen-lockfile`
7. **Deploy command:** `pnpm --filter cu-cron exec wrangler deploy --env=<env>`
8. **Build environment variables:** `NODE_VERSION=20`
9. Save.

### D2. Set the cron worker's secret (CLI)

The cron worker sends `Authorization: Bearer ${CRON_SECRET}` on every call. Must be the **same** value as the CMS worker's `CRON_SECRET` (set in 0.4 / A4 / B3).

```sh
cd apps/cron
pnpm exec wrangler secret put CRON_SECRET --env=<env>
```

### D3. Trigger / smoke test

- Cron schedule (`triggers.crons` in `apps/cron/wrangler.jsonc`) is `0 4 * * *` — daily at 04:00 UTC.
- Manual fire: `curl -X POST https://codeuncode-cron-<env>.<account>.workers.dev/run` → should log to the cron worker and call `/cold-flag-cron` on the CMS via the service binding.
- Watch: Workers & Pages → `codeuncode-cron-<env>` → Logs.

### D4. Verify in the CMS

After the manual fire, hit the same `/cold-flag-cron` directly to confirm the secret matches:

```sh
curl -i -X POST https://cms-<env>.codeuncode.com/cold-flag-cron \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expect `200` with `{ ok: true, flipped: <n>, ids: [...], cutoff: "..." }`. A `401` means the secret on the cron worker and the CMS worker don't match — re-set both.

---

## Notes / things to verify before kicking off

1. **D1 id for test** — `apps/cms/wrangler.jsonc` currently has `97df08dc-07ad-4bfb-a89e-fd1156758e68`. Confirm that's the real id of the `codeuncode-test` D1 (not a leftover placeholder).
2. **Build command correctness** — A6 flag. The current `apps/cms/package.json`'s `build` script runs migrations first. The deploy commands in this runbook call `opennextjs-cloudflare build` directly, which may skip that step. If first test deploy errors with "missing migrations," change the CF build command to `pnpm install --frozen-lockfile && pnpm --filter cu-core run build && pnpm --filter cu-core exec opennextjs-cloudflare build --env=test`.
3. **Branch strategy for live** — decide before B2 whether live auto-deploys from `main` or a separate branch.
4. **CF account id** — `apps/cms/wrangler.jsonc` hardcodes `account_id`. If Workers Builds picks a different account, that'll conflict. Typically fine since the repo is linked in the same account.
