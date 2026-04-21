# codeuncode/core-new

Clean-slate replacement for `codeuncode/core`. Drafts + live preview baked in from the start, proper dev/staging/prod isolation, no retrofits.

See [`docs/plan.md`](./docs/plan.md) for the phased build plan and architecture notes.

## Apps

- `apps/cms` — Payload CMS on Cloudflare Workers (D1 + R2).
- `apps/web` — Astro site on Cloudflare Workers (hybrid: static + SSR `/preview/*`).

## Quick start (local dev)

```sh
pnpm install
pnpm dev:cms   # http://localhost:3000/admin
pnpm dev:web   # http://localhost:4321 — separate terminal
```

Local dev uses miniflare (file-based D1 + R2 emulation). No remote resources touched.

## Environments

| Env | CMS | Web | D1 | R2 |
|---|---|---|---|---|
| local | localhost:3000 | localhost:4321 | miniflare | miniflare |
| staging | cms-staging.codeuncode.com | staging.codeuncode.com | `cu-core-staging` | `cu-core-staging` |
| prod (Phase 6) | cms.codeuncode.com | codeuncode.com | `cu-core-prod` | `cu-core-prod` |

## Deploy

```sh
pnpm --filter cu-core deploy:staging
pnpm --filter cu-web deploy:staging
# prod deploys land in Phase 6 (cutover from old-core)
```
