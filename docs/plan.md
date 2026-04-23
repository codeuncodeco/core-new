# codeuncode/core-new — plan

Clean-slate replacement for `codeuncode/core`, built to fix infrastructure mistakes we hit while retrofitting the original:

- Dev and prod shared the same remote D1 (wrangler had `"remote": true` at the top level).
- Payload `push` mode ran against the shared DB in prod, inserting dev-mode sentinel rows and wedging `payload migrate`.
- No reproducible seed script; admin-UI-only content drifted from code.
- Switching an existing collection to `versions: { drafts: true }` retrofit was painful — required hand-edited migrations to backfill `_status` from `published`.
- Astro SSR with `@astrojs/cloudflare` on Workers needed specific wrangler config (`main`, `.assetsignore`, `nodejs_compat`) we only discovered via failing CI.
- Live preview requires `ready()` + POST-back-and-swap to actually work — reload-on-postMessage feels broken.
- Auth cookies have to be scoped to the parent domain up front, or cross-subdomain preview requests fail.

**CMS template baseline:** https://github.com/payloadcms/payload/tree/main/templates/with-cloudflare-d1

Everything below executes in phases. Each phase has a clear end gate — nothing in Phase N+1 starts until Phase N is validated and approved.

---

## Resolved decisions

| # | Topic | Resolution |
|---|---|---|
| 1 | Environments | **Three**: local (miniflare), beta (remote), prod (remote). Independent D1s, R2s, and workers. |
| 2 | Local dev DB | **Miniflare file-based D1.** No remote dev DB. |
| 3 | Data migration (Phase 6) | **Export from old prod D1, import into new prod D1.** Media migrated from old R2. |
| 4 | Repo name | **`core-new`** locally. Rename to `core` as part of Phase 6 cutover. |
| 5 | Redesign vs port | Port as-is, but apply all the infra/schema lessons below from Phase 0 so we're not retrofitting. |

---

## Architecture

### Environments & bindings

| Env | CMS worker | CMS domain | D1 | R2 | Web worker | Web domain |
|---|---|---|---|---|---|---|
| local | `next dev` | http://localhost:3000 | miniflare (`.wrangler/`) | miniflare | `astro dev` | http://localhost:4321 |
| beta | `cu-core-beta` | cms-beta.codeuncode.com | `cu-core-staging` (D1) | `cu-core-staging` (R2) | `cu-web-beta` | beta.codeuncode.com |
| prod | `cu-core` | cms.codeuncode.com | `cu-core-prod` (D1) | `cu-core-prod` (R2) | `cu-web` | codeuncode.com |

Wrangler config layout:
- **Top-level** = beta (so `wrangler deploy` without `--env` deploys beta, reducing accidental-prod risk).
- **`env.production`** = prod. Deploys require explicit `--env production`.
- **No `"remote": true` anywhere.** CLI operations that need remote bindings pass `--remote` explicitly (e.g. `wrangler d1 execute --remote`), or rely on `NODE_ENV=production` triggering remote bindings via `getCloudflareContext`.

### Push vs migrate

- **Local** (miniflare D1): `push: true`. Fast iteration, schema auto-syncs.
- **Staging + prod** (remote D1): `push: false`. Migrations only, applied via `pnpm deploy:db` per environment.
- Gated on `NODE_ENV` inside `apps/cms/src/payload.config.ts` from Phase 1 (not retrofitted).

### Drafts + live preview (baked in from Phase 1)

- Every draftable collection (Partners, Brands, Services, Projects) declares `versions: { drafts: true }` from the first migration. No `published: boolean` field — ever.
- `admin.livePreview.url` + `admin.livePreview.breakpoints` configured per collection. Shared preview routes use `?collection=<slug>` query param.
- SSR `/preview/*` routes forward the editor's auth cookie on upstream CMS fetches, respond to POST by merging body into the fetched list, then return fresh HTML.
- Client bridge (`apps/web/src/scripts/live-preview.ts`): calls `ready({ serverURL })`, listens via `isLivePreviewEvent()`, POSTs back to its own URL, swaps `document.body.innerHTML` with the response. No reloads.
- Preview routes set `X-Robots-Tag: noindex` + CSP `frame-ancestors 'self' https://cms.codeuncode.com https://cms-beta.codeuncode.com http://localhost:3000`.

### Auth cookies

- `Users.auth.cookies.domain` set to `.codeuncode.com` in beta + prod. Undefined locally (default port-scoped). Allows `codeuncode.com` (and beta equivalent) to forward the session cookie to `cms.codeuncode.com` for authenticated draft reads.

### Seeding

- `apps/cms/src/app/seed/route.ts` endpoint with `?only=<comma-separated collections>` query param to scope wipes + reseeds. In prod, auth'd via `?secret=$SEED_SECRET`.
- All `payload.create` calls use `draft: false` so seeded rows land as published.
- Collections with relational dependencies (services/categories/tags) must be seeded together — the endpoint validates this and 400s on partial subsets.
- `/wipe` endpoint covers the same collection set in reverse dependency order.

### Web infra (Cloudflare Workers, Astro hybrid)

- Astro config: `output: 'static'` + `@astrojs/cloudflare@^12` adapter. Public pages prerendered; `/preview/*` routes opt out via `export const prerender = false`.
- `apps/web/wrangler.jsonc`:
  - `main: "./dist/_worker.js/index.js"` so wrangler deploys the SSR worker.
  - `compatibility_flags: ["nodejs_compat"]` for the Astro runtime.
  - `assets.binding: "ASSETS"`.
- `apps/web/public/.assetsignore` lists `_worker.js` + `_routes.json` so wrangler doesn't upload them as public static files. Astro copies `public/*` into `dist/` at build.

### Tooling

- Node 20, pnpm 10 (match current), Astro 5, Payload 3.79+ (match old core).
- Monorepo: `pnpm workspaces`, `apps/cms` + `apps/web` + `packages/*`.
- No turbo.
- Pre-commit hook to nudge about migration files (but with bypass for obvious false positives like field-level hooks).

---

## Phases

### Phase 0 — Scaffolding + Cloudflare resources

**Goals:** repo initialized, monorepo skeleton, all CF resources provisioned across the three envs.

**Deliverables:**
- `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.prettierrc`, `.editorconfig`, `README.md`.
- Empty `apps/cms/` and `apps/web/` directories.
- Cloudflare resources created and their IDs recorded in wrangler.jsonc:
  - D1: `cu-core-staging` (used for beta), `cu-core-prod`.
  - R2: `cu-core-staging` (used for beta), `cu-core-prod`.
  - Naming note: beta-env resources kept their original "-staging" names (they were created before the env was renamed).
- `.env.example` for CMS and web with all required keys (D1 IDs, R2 names, Resend API key, PAYLOAD_SECRET, WEB_URL, PUBLIC_CMS_URL, SEED_SECRET).
- Local dev doesn't need remote bindings — miniflare handles D1 + R2 emulation.

**Validation:**
- `pnpm install` succeeds.
- `wrangler d1 list` shows both remote DBs.
- `wrangler r2 bucket list` shows both buckets.

**End gate:** CF resources exist, env template documented.

---

### Phase 1 — CMS foundation (Partners vertical slice)

**Goals:** Payload app running locally against miniflare, with Partners drafts-enabled from day 1, seeded, served via REST API with `?draft=true` working for auth'd reads.

**Deliverables:**
- `apps/cms/` bootstrapped from Payload `with-cloudflare-d1` template.
- `apps/cms/wrangler.jsonc`:
  - Top-level (beta): worker name `cu-core-beta`, D1 binding to `cu-core-staging`, R2 binding to `cu-core-staging`, `routes: [{ pattern: "cms-beta.codeuncode.com", custom_domain: true }]`, `vars: { WEB_URL: "https://beta.codeuncode.com" }`.
  - `env.production`: `cu-core` worker, `cu-core-prod` D1 + R2, `cms.codeuncode.com` route, `WEB_URL: "https://codeuncode.com"`.
- `payload.config.ts`:
  - D1 adapter with `push: process.env.NODE_ENV !== 'production'`.
  - R2 storage plugin.
  - Server-side logger for prod.
- `Users.ts`: `auth.cookies.domain = process.env.NODE_ENV === 'production' ? '.codeuncode.com' : undefined`.
- `Partners.ts` — the one collection for this phase:
  - `versions: { drafts: true }`.
  - Fields: name, tagline, href, icon (text), image (optional upload), displayOrder.
  - `admin.livePreview.url: () => \`${WEB_URL}/preview/about?collection=partners\``.
  - Breakpoints: mobile/tablet/desktop.
  - Hooks: `triggerWebDeployAfterChange`, `triggerWebDeployAfterDelete` (stub for now).
- Seed endpoint `app/seed/route.ts` with `?only=` filter, uses `draft: false` on create.
- `partners-data.ts` with the 4 starter partners.

**Validation:**
- `pnpm dev:cms` starts cleanly, no schema-push prompt.
- `curl http://localhost:3000/seed?only=partners` populates 4 partners.
- Admin shows **Save Draft** + **Publish Changes** buttons.
- `curl http://localhost:3000/api/partners` returns only published docs.
- Editing a partner as draft doesn't affect the public API.

**End gate:** drafts work locally. Partner admin is functional.

---

### Phase 2 — Web foundation (Partners on /about + live preview)

**Goals:** Astro app running locally, public `/about` fetches from CMS, `/preview/about` shows drafts via working live-preview iframe.

**Deliverables:**
- `apps/web/` scaffolded as Astro 5 with `@astrojs/cloudflare@^12` adapter.
- `astro.config.mjs`: `output: 'static'`, adapter: `cloudflare()`.
- `apps/web/wrangler.jsonc`:
  - Top-level (beta): `cu-web-beta` name, `main: "./dist/_worker.js/index.js"`, `compatibility_flags: ["nodejs_compat"]`, `assets.binding: "ASSETS"`, beta.codeuncode.com route.
  - `env.production`: `cu-web` name, `codeuncode.com` route.
- `public/.assetsignore` with `_worker.js` + `_routes.json`.
- `src/lib/cms.ts`: `getPartners()` + `getPartnersPreview(cookie)` + `mediaUrl()` + graceful empty-list fallback on CMS down.
- `src/components/Partners.astro` accepts optional `partners` prop.
- `src/pages/about.astro` renders Partners section.
- `src/pages/preview/about.astro`: `export const prerender = false`, reads cookie, fetches draft partners, handles POST (merges incoming doc into fetched list by id), sets `X-Robots-Tag: noindex` + CSP frame-ancestors.
- `src/scripts/live-preview.ts`: `ready()` → listen for `isLivePreviewEvent` → debounce 300ms → POST self → DOMParser + body swap.

**Validation:**
- `pnpm dev:web` + `pnpm dev:cms` → http://localhost:4321/about shows 4 Partners from CMS.
- http://localhost:4321/preview/about returns 200.
- From admin, edit a Partner → iframe live-updates as you type (no reload).
- Save Draft → public /about unchanged. Publish → public /about reflects change.

**End gate:** end-to-end drafts + live preview working locally.

---

### Phase 3 — Staging deployment (infra validation)

**Goals:** deploy both apps to beta; verify the local ≠ beta separation; prove the migration + deploy workflow works without CLI fights. Prod deployment intentionally deferred to Phase 6 — until then, old-core remains prod.

**Deliverables:**
- Deploy scripts:
  - `pnpm --filter cu-core deploy:beta` → `deploy:db:beta && deploy:app:beta`.
  - Same pattern for web app.
- Migration for Partners + versions tables generated locally, committed.
- Staging Cloudflare build integration wired (auto-deploy on push to main, or a specific branch).
- Prod config present in `wrangler.jsonc` (`env.production`) but not deployed yet.

**Validation:**
- CMS beta at https://cms-beta.codeuncode.com/admin loads. Partners visible, seeded.
- Web beta at https://beta.codeuncode.com/about renders Partners.
- Cross-env isolation: wipe + reseed local → beta unaffected. Wipe + reseed beta → local unaffected.
- Beta `/preview/about` iframe works end-to-end from the beta CMS admin.

**End gate:** beta is working, publicly accessible, live preview confirmed.

---

### Phase 4 — Port remaining CMS schema

**Goals:** every collection, global, hook, and plugin from old core lives in new core. Drafts enabled on draftable collections from day 1 of each port.

**Collections to port:** Users (done in P1), Media, Categories, Tags, Services, Projects, Brands, ContactSubmissions.
**Globals:** RateCardSettings, EmailSettings.
**Hooks:** `triggerWebDeploy`, `slugify`, `blockDeleteIfReferenced`, `normalizeDomain`.
**Email:** Resend adapter.
**Plugins:** `@codeuncode/plugin-speed-analysis` (copy source from old repo into `packages/`).

**Per-collection approach (applied in batches):**
1. Add collection to `payload.config.ts`.
2. If draftable → `versions: { drafts: true }` + `admin.livePreview.url`. No `published` field.
3. Extend seed with `<collection>-data.ts`, include in `/seed` handler with `?only=` support.
4. Generate + commit migration.
5. Apply locally via miniflare push; apply to beta via `deploy:db:beta`.
6. Validate admin UI + API + seed endpoint for the new collection.

Batches in order:
- **Users + Media** (foundation, no draft).
- **Tags + Categories** (simple lookup collections, no draft).
- **Services** (drafts, references Categories + Tags).
- **Projects** (drafts, no relational deps).
- **Brands** (drafts, references Media).
- **ContactSubmissions** (no draft, no public exposure).
- **Globals** (RateCard + Email settings).

**Validation:** every collection visible in admin, seeded, API routes return expected data. Drafts-enabled collections show Save Draft + Publish Changes buttons.

**End gate:** CMS feature parity with old core.

---

### Phase 5 — Port remaining web pages + preview routes

**Goals:** every page from old web lives in new web. Each editable page has an SSR preview counterpart.

**Public pages to port:** `index.astro`, `about.astro` (expand beyond Partners), `contact.astro`, `services/*`, `work/*`.
**Shared:** layouts, components (Clients, ServiceIcon, ContactWizard, ContactPreview, ProjectCard, ServicesMenu, etc.), styles, fonts, assets.
**Any hardcoded data** → migrate to CMS as part of this phase.

**Preview routes to add:**
- `/preview/about` (Partners + Brands; disambiguated via `?collection=`).
- `/preview/` (Services — renders home listing).
- `/preview/work` (Projects — renders /work listing).

**Per-preview approach:**
1. Share the rendering components between public + preview by accepting an optional prop (the pattern from old-core Partners/Clients/ServicesMenu).
2. Preview route fetches draft content with cookie forwarding.
3. Handles POST body merge by id.
4. Imports the shared `live-preview.ts` bridge script.
5. Wires CSP + robots headers.

**Validation:** every old URL has an equivalent in new web, renders correctly. Every draftable collection has a working live-preview iframe from its admin.

**End gate:** FE feature parity + live preview parity.

---

### Phase 6 — Cutover (superseded by `docs/move.md`)

The original plan called for claiming the `cu-core` / `cu-web` worker names from old-core during cutover. We instead renamed new-core's deployable resources under the `codeuncode-*` scheme (see [`docs/move.md`](./move.md)), which removes the namespace race and makes cutover a pure DNS/route swap.

See `docs/move.md` for:
- Test env rename (`beta` → `test`, new `codeuncode-test` D1/R2, worker `codeuncode-cms-test` / `codeuncode-web-test` at `cms-test.codeuncode.com` / `test.codeuncode.com`).
- Live env provisioning (`codeuncode-live` D1/R2, worker `codeuncode-cms` / `codeuncode-web`).
- Cutover sequence (content migration + release routes from old-core + claim them on new-core's `env.live`).

Content migration mechanics live in [`docs/content-migration.md`](./content-migration.md).

---

## Current status

- [x] Plan drafted and decisions locked in.
- [x] Phase 0 — Scaffolding + CF resources (D1 + R2 provisioned, repo skeleton in).
- [x] Phase 1 — CMS foundation scaffolded: Partners collection with drafts + livePreview + breakpoints, Users cookie-scoped for prod, seed/wipe routes with `?only=` filter, `push` gated on NODE_ENV, wrangler points at beta D1/R2.
- [x] Phase 2 — Web foundation scaffolded: Astro + @astrojs/cloudflare adapter, `/preview/about` SSR with cookie forwarding + POST-body merge, shared `live-preview.ts` bridge (`ready()` + POST-back + body swap), `.assetsignore` + `main` for Workers deploy.
- [ ] Phase 3 — Beta deploy + infra validation (migrations auto-applying on deploy; admin signup + partners seed + live preview smoke test remaining).
- [x] Phase 4 — Remaining collections scaffolded: Categories, Tags, Services (drafts), Projects (drafts), Brands (drafts), ContactSubmissions, Globals (RateCard + Email). Migration generated, applied to beta D1.
- [x] Phase 5 — Remaining web pages + preview routes scaffolded: index.astro, about.astro, contact.astro, services/*, work/*, shared components (Clients, ServicesMenu, ContactWizard, ContactPreview, ProjectCard, etc.), full cms.ts with preview helpers, /preview/about + /preview/index + /preview/work SSR routes with live-preview bridge. CSP scoped to cms-beta.codeuncode.com. Web typecheck: 0 errors.
- [ ] Phase 6 — Content cutover.

Phases 1 and 2 are scaffolded in code but NOT yet validated end-to-end (needs a fresh `pnpm dev:cms` + admin user creation + seed + browser check). That verification is the Phase 3 end-gate work.

## Before Phase 0 kicks off — things you do

1. Ensure you have a Cloudflare API token with scopes for D1, R2, Workers, and DNS/Routes (for beta domain setup). If using `wrangler login` interactively that's fine too.
2. Make sure DNS for `cms-beta.codeuncode.com` + `beta.codeuncode.com` can be added — either Cloudflare controls the zone (ideal) or we coordinate with whoever does.
3. Keep a Resend API key handy (reuse old-core's or issue a fresh one) — used starting Phase 4.

Everything else Phase 0 generates from scratch.
