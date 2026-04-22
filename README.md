# codeuncode/core-new

Clean-slate replacement for `codeuncode/core`. Drafts + live preview baked in from the start, proper dev/staging/prod isolation, no retrofits.

See [`docs/plan.md`](./docs/plan.md) for the phased build plan and architecture notes.

## Apps

- `apps/cms` — Payload CMS on Cloudflare Workers (D1 + R2).
- `apps/web` — Astro site on Cloudflare Workers (hybrid: static + SSR `/preview/*`).

## Quick start (local dev)

```sh
pnpm install
cp apps/cms/.env.example apps/cms/.env   # fill in PAYLOAD_SECRET at minimum
cp apps/web/.env.example apps/web/.env
pnpm dev:cms   # http://localhost:3000/admin
pnpm dev:web   # http://localhost:4321 — separate terminal
```

Local dev uses miniflare (file-based D1 + R2 emulation). No remote resources touched.

## Environments

| Env | CMS | Web | D1 | R2 |
|---|---|---|---|---|
| local | localhost:3000 | localhost:4321 | miniflare | miniflare |
| beta | cms-beta.codeuncode.com | beta.codeuncode.com | `cu-core-staging` | `cu-core-staging` |
| prod (Phase 6) | cms.codeuncode.com | codeuncode.com | `cu-core-prod` | `cu-core-prod` |

## Environment variables

### `apps/cms`

| Var | When | Where set (local) | Where set (remote) | Purpose |
|---|---|---|---|---|
| `PAYLOAD_SECRET` | runtime | `.env` | `wrangler secret put PAYLOAD_SECRET` | Signs auth JWTs + cookies. Required to boot. |
| `SEED_SECRET` | runtime | `.env` | `wrangler secret put SEED_SECRET` | Guards `/seed` + `/wipe` in production. Not checked in local dev. |
| `WEB_URL` | runtime | `.env` | `wrangler.jsonc vars` | Used by `admin.livePreview.url` to build the preview iframe URL. Baked into prod via wrangler vars; local dev reads `.env`. |
| `RESEND_API_KEY` | runtime | `.env` | `wrangler secret put RESEND_API_KEY` | Transactional email (wired in Phase 4). |
| `WEB_DEPLOY_HOOK_URL` | runtime | `.env` (often blank) | `wrangler secret put` | Triggers a web rebuild on content changes. Optional. |
| `NODE_ENV` | runtime (implicit) | — | Set to `production` by Next.js build | Gates `push: true` local vs `push: false` in prod inside `payload.config.ts`. Never set manually. |
| `CLOUDFLARE_ENV` | deploy scripts | — | passed on `wrangler deploy --env=...` | Picks the wrangler env block during deploy. |

Build time for CMS: none of the above are needed during `next build` / `opennextjs-cloudflare build` itself. Everything is consumed at worker runtime.

### `apps/web`

| Var | When | Where set (local) | Where set (remote) | Purpose |
|---|---|---|---|---|
| `PUBLIC_CMS_URL` | **both** build + runtime | `.env` | `wrangler.jsonc vars` | (a) baked into client JS bundle at build time (used by `live-preview.ts` to match `postMessage` origins); (b) read at runtime by SSR `/preview/*` routes. Must be set in both places. |

Astro inlines `PUBLIC_*` vars into the client bundle at build time, so changing `PUBLIC_CMS_URL` on the deployed worker via `wrangler secret` without rebuilding leaves stale values in the client JS. Rebuild + redeploy after changing.

### Rule of thumb

- **Secret?** Use `.env` locally, `wrangler secret put` remotely. Never put secrets in `wrangler.jsonc`.
- **Not secret?** Use `.env` locally, `wrangler.jsonc → vars` remotely. Checked into git so everyone sees the same config.
- **Shown in client code?** (i.e. Astro `PUBLIC_*`) — it's baked in at build, so rebuilding is the only way to change it.

## Deploy

Deploy target is the **beta** worker until Phase 6 cutover.

```sh
pnpm --filter cu-core deploy         # build + migrate + deploy CMS to cu-core-beta
pnpm --filter cu-web deploy          # build + deploy web to cu-web-beta
# prod deploys land in Phase 6 (cutover from old-core)
```
