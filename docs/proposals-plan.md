# Proposals — design & status

Authoring, rendering, and tracking client proposals from the CMS. Supersedes the hand-rolled HTML proposals in the separate `quotes/` repo for any proposal that follows the standard template (consultway, goodricke, washi, voric, malkum, tend, happyleaf, your-anecdotes, hms). Bespoke one-offs like `digantara` stay outside the CMS.

Workflow: author in Payload admin → live preview the rendered page in the iframe panel → publish → open the public URL → browser Print → Save as PDF → send.

## Status

### ✅ Shipped

- [x] **`Clients` collection** — name, tagline, contacts (array), logo, status, notes (richText). Inline-create from the proposal form.
- [x] **`Proposals` collection** — drafts on, full version history, every save creates a new revision.
- [x] **Renderer** at `/proposals/<slug>` on `apps/web` (SSR). Tailwind via CDN, print CSS ported, version label rendered into the HTML so it carries through to the printed PDF.
- [x] **`?v=<versionId>`** URL renders a specific past version with a slug-cross-check.
- [x] **Live preview** at `/preview/proposals/<slug>` — Payload admin iframe + postMessage merge, with `client` and `client.logo` rehydrated from bare IDs.
- [x] **Lifecycle hook** — `sentAt` auto-fills when status flips to `sent` (overridable); `lastContactAt` mirrors `sentAt` on first send; new notes get `author` + `createdAt` stamped from the logged-in user.
- [x] **Cold-flag route** at `/cold-flag-cron` (Bearer-token auth) — flips proposals from `sent` to `cold` when `lastContactAt` is older than 21 days.
- [x] **Custom admin UX** for proposals:
  - HTML color picker for `accentColor` with hex text input
  - "Duplicate this proposal" button (resets lifecycle + appends `(copy)` and a fresh slug)
  - Multi-select `sentMethod`
  - Array row labels show the row's title/label/etc. instead of "Item 01"
  - Live total readout under `costItems` (₹-formatted, updates as you type)
  - Live red/green readout under `paymentTerms` (sum vs 100%)
  - Hard validation: `paymentTerms` shares must add to 100% on save
  - Descriptive validation toasts (replace Payload's generic "field is invalid")
  - Scroll-to-first-error on save
  - Error labels stop truncating when the form column is narrow
  - Notes-feed: textarea composer at top, chronological feed below, ⌘/Ctrl+Enter shortcut, per-note delete
- [x] **`Users` extras** — `firstName` (required, auto-derived from email local part if blank) and `lastName`. Drives the author label in the notes feed (`"Shreshth M."`).
- [x] **Seed** — Consultway client + Proposal A as a draft, mirroring `quotes/consultway/proposal-a.html`.
- [x] **`Engagements` collection** — `internalTitle`, `client`, `sourceProposal`, `stage` (scoping/design/development/testing/deployment/maintenance/done), start/target/actualEndDate, notes feed.
- [x] **`Tasks` collection** — `title`, `description`, `engagement`, `assignee`, `status` (todo/in-progress/done/blocked), `priority`, `dueDate`, `attachments` (multi-upload), `comments` (chronological feed; reuses `NotesFeed`).
- [x] **Cron worker** at `apps/cron/` — separate Cloudflare Worker with a `scheduled()` handler (daily 04:00 UTC) that hits `/cold-flag-cron` on the CMS via a **service binding** (`env.CMS.fetch`). Doubles as the service-binding spike — proves Payload-on-OpenNext is reachable through bindings.
- [x] **`dev` env** — added to both `apps/cms/wrangler.jsonc` and `apps/web/wrangler.jsonc` (and `apps/cron/wrangler.jsonc`). Targets `cms-dev.codeuncode.com` / `dev.codeuncode.com`. D1 database id is a placeholder until you run `wrangler d1 create codeuncode-dev`.
- [x] **WYSIWYG-like in-place editor** at `/edit/proposals/<slug>` on `apps/web` — click any text in the rendered proposal to edit it. Debounced PATCH-on-blur to the CMS via a small proxy endpoint that forwards the editor's auth cookie. Status pill in the corner. Editable: `projectName`, `subtitle`, `overview`, all summary cards, scope titles + descriptions, cost section/total labels, cost item names + amounts, tech stack rows, recurring cost rows, payment-term milestones + share percentages.

### 🔲 Remaining

Everything in the original plan has shipped.

### ⚙️ Operational follow-ups (not code)

These are deploy-time setup, not "remaining tasks" in a code sense:

- [ ] **Provision dev infra** — `wrangler d1 create codeuncode-dev`, `wrangler r2 bucket create codeuncode-dev`, paste the D1 id into `apps/cms/wrangler.jsonc` (replace `REPLACE_WITH_DEV_D1_ID`), add the `cms-dev.codeuncode.com` and `dev.codeuncode.com` DNS records.
- [ ] **Set `CRON_SECRET` per env** — `wrangler secret put CRON_SECRET --env=dev` etc., on **both** the cron worker (so it sends the bearer) and the CMS worker (so it accepts the bearer).
- [ ] **Deploy order** — CMS first, then cron (cron's service binding requires the target worker to exist). Per env: `pnpm --filter cu-core deploy` then `pnpm --filter cu-cron deploy` with `CLOUDFLARE_ENV` set.

## How it works

### Data model summary

`Clients`: lightweight directory.

`Proposals`: drafts + full version history. Key fields:

- Identity: `internalTitle` (admin-only), `urlSlug` (unique, public URL), `proposalDate`.
- Branding: `accentColor`, `fontFamily`. Logo lives on the client.
- Content: `overview` (textarea), `summaryCards` (label/value/caption — flexible enough to cover both project and maintenance shapes without a `proposalType` field), `scopeItems`, `costItems`, `costSectionLabel`, `costTotalLabel`, `techStack`, `recurringCosts`, `paymentTerms`.
- Lifecycle: `status` (`draft | sent | accepted | rejected | cold | withdrawn`), `sentAt`, `sentTo`, `sentMethod` (multi), `lastContactAt`, `respondedAt`, `attachedPdf`.
- History: `notes` (array; auto-stamped author + createdAt).

Optional sections (`costItems`, `recurringCosts`, `paymentTerms`, `techStack`) skip rendering when empty — same renderer covers project proposals and maintenance contracts.

Multi-phase support is **not** in v1. All current proposals run as single-phase (sometimes split as separate Proposal A vs Proposal B). Add the array-of-phases shape when a real multi-phase proposal comes up.

### Rendering

- `apps/web/src/layouts/ProposalLayout.astro` — full-document layout. Self-contained Tailwind via CDN, print CSS, no marketing-site chrome.
- `apps/web/src/pages/proposals/[slug].astro` — public route (SSR). Fetches by slug, renders the layout. `?v=<id>` fetches that specific version.
- `apps/web/src/pages/preview/proposals/[slug].astro` — admin live-preview route. Forwards the editor's auth cookie, merges Live Preview postMessage data, rehydrates `client` and `client.logo` from bare IDs.
- Drafts auto-filtered for unauthenticated reads (Payload's `_status: 'published'` default).
- Version label is rendered into the page header — carries through to the printed PDF for free.

### Lifecycle automations

- `beforeChange` hook (`Proposals.ts`) does three things:
  1. When `status` flips to `sent` and `sentAt` is blank → fill with now.
  2. When `sentAt` is set and `lastContactAt` is blank → mirror to `sentAt`.
  3. For each note in the array missing `author` or `createdAt` → stamp from `req.user.id` and the server clock.
- The `/cold-flag-cron` route flips `sent → cold` when `lastContactAt < now - 21d`. Driven externally (cron trigger pending).

### Validations

- `paymentTerms` must sum to exactly 100% (within 0.01 tolerance for fractional splits like 33.33/33.33/33.34) when non-empty. Empty array is allowed.
- `urlSlug` is unique and indexed.
- `firstName` (Users) is required, but a `beforeValidate` field hook fills it from the email's local part if blank.

### Custom admin components

All under `apps/cms/src/components/`:

- `ColorField.tsx` — HTML color picker + hex text input
- `DuplicateProposalButton.tsx` + route at `/duplicate-proposal`
- `ArrayRowLabel.tsx` — row labels via title/label/item/milestone/name/email/note
- `CostTotalDisplay.tsx` — live ₹ sum under `costItems`
- `PaymentTermsTotalDisplay.tsx` — live red/green % indicator under `paymentTerms`
- `ProposalFormEnhancements.tsx` — global stylesheet for un-truncating error labels + scroll-to-first-error + descriptive toasts on save
- `NotesFeed.tsx` — textarea composer + chronological feed for proposal notes; fetches users for author labels

## How to test locally

1. `cd apps/cms && pnpm dev` (admin at `http://localhost:3000/admin`).
2. `cd apps/web && pnpm dev` (frontend at `http://localhost:4321`).
3. Seed: `curl -X POST http://localhost:3000/seed?only=clients,proposals`.
4. In the admin: open the seeded proposal, edit the live preview iframe, save, publish.
5. Public URL: `http://localhost:4321/proposals/consultway-proposal-a`.
6. Print → Save as PDF from the browser.

### Cold-flag route (manual)

```sh
curl -i -X POST http://localhost:3000/cold-flag-cron \
  -H "authorization: Bearer $CRON_SECRET"
```

Set `CRON_SECRET` in `apps/cms/.env`. Returns the IDs of any proposals it flipped to `cold`.

## Files

```
apps/cms/src/
  collections/
    Clients.ts
    Proposals.ts
    Engagements.ts
    Tasks.ts
    Users.ts                                # extended with firstName/lastName
  components/
    ArrayRowLabel.tsx
    ColorField.tsx
    CostTotalDisplay.tsx
    DuplicateProposalButton.tsx
    NotesFeed.tsx                           # also used by Engagements + Tasks
    PaymentTermsTotalDisplay.tsx
    ProposalFormEnhancements.tsx
  app/
    cold-flag-cron/route.ts
    duplicate-proposal/route.ts
  lib/formatINR.ts
  seed/
    clients-data.ts
    proposals-data.ts

apps/cron/                                  # separate Worker, scheduled() + fetch()
  src/index.ts
  wrangler.jsonc                            # service binding to CMS per env

apps/web/src/
  layouts/ProposalLayout.astro              # editMode prop emits data-edit-path attrs
  scripts/proposal-editor.ts                # click-to-edit client script
  pages/
    proposals/[slug].astro                  # public, SSR
    preview/proposals/[slug].astro          # admin live preview, SSR
    edit/proposals/[slug].astro             # WYSIWYG editor, SSR + auth
    api/proposal-edit/save.ts               # cookie-forwarding PATCH proxy
  lib/cms.ts                                # adds getProposalBySlug, getProposalBySlugPreview, getProposalVersionById, getClientById
```
