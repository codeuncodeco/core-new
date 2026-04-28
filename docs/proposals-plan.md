# Proposals — CMS Plan

Plan for adding a `Proposals` collection to `apps/cms` so we can author, version, render, and track proposals (the things currently lived as hand-written HTML files in the `quotes/` repo).

## Goals

1. Author proposals as structured data in the Payload admin (no more hand-rolled HTML).
2. Render each proposal as a print-ready HTML page (the existing `quotes/` styling) at a stable URL — that's still our "browser → Print to PDF" workflow.
3. Track lifecycle state — when a proposal was sent, to whom, and what happened next (accepted / rejected / cold). No `expired` state; instead we flag a proposal as **cold** automatically if there's no communication with the client for 3 weeks.
4. Allow the team to add running notes against each proposal (negotiation history, follow-ups).
5. Be flexible enough to cover all the real proposals in `quotes/` that follow the standard template (consultway, goodricke, washi, voric, malkum, tend, happyleaf, your-anecdotes, hms). Bespoke one-offs like `digantara/` stay as hand-written HTML and are not in scope for the CMS.

## Sections in a proposal (and what changed)

Reverse-engineered from `quotes/proposal-generation-prompt.md` and the actual files. Common structure for our standard proposals:

- **Header** — logo OR text title, "Proposal" eyebrow, subtitle, client tagline, "Prepared by Code Uncode", date.
- **Overview** — 1-3 sentence paragraph (project name in bold where relevant).
- **At a Glance** — summary cards. For project proposals: timeline + total cost. **TODO:** maintenance contracts look different (monthly fee, contract length, no one-time total) — see [Maintenance contracts](#maintenance-contracts) below.
- **Scope** — bulleted list. Each item is `<bold feature> — short description`.
- **Cost Breakdown** — table of `Item, Cost`, with a Total footer row. Admin UI must **live-calculate the total** as the user edits the row amounts.
- **Technical Architecture** — key/value table (Frontend, Backend, Database, Hosting…).
- **Recurring Costs** — table of `Item, Cost, Notes`.
- **Payment Terms** — milestone / share / amount table. Optional; not all proposals have one.
- **Contact / Footer** — Code Uncode contact only. (Validity disclaimer is dropped.)

**Removed from earlier draft:**

- Optional Add-ons section — dropped.
- Validity disclaimer ("This proposal is valid for 30 days…") — dropped.
- "Show GST note" toggle — GST note is always on.
- Multi-phase proposals — current proposals don't use them; assume single-phase implicit. We'll add the array-of-phases shape later if/when a real multi-phase proposal comes up.

Theming knobs we keep: accent colour (default `#f97316`), font (default League Spartan), logo image vs text title.

### Maintenance contracts

A proposal for ongoing maintenance is shaped differently from a project build:

- "At a Glance" cards: monthly fee + contract length, not timeline + one-time total.
- "Cost Breakdown" may be a single line ("₹X/mo, includes Y hours") rather than a multi-row table.
- Scope reads as included services / SLA rather than build deliverables.
- Payment terms section often doesn't apply.

**Approach:** make the schema flexible enough to cover both shapes without a dedicated `proposalType` field or a parallel template. The way we get there:

- Replace the fixed `timeline` field + auto-derived "Total Cost" card with a flexible **`summaryCards`** array — each card is `{ label, value, caption? }`. For a project: Timeline + Total Cost. For maintenance: Monthly Fee + Contract Length.
- Allow optional overrides for the cost-section heading (`costSectionLabel`, default "Cost Breakdown") and total-row label (`costTotalLabel`, default "Total").
- All optional sections (`costItems`, `recurringCosts`, `paymentTerms`) skip rendering when empty — so a maintenance proposal can naturally have only summary cards + scope + a single-row cost table.

This way the same collection serves both, and we don't fork the renderer.

## Proposed data model — `Proposals` collection

A single Payload collection. SQLite/D1-friendly: arrays via `array` fields, no JSON soup. Drafts on, full version history on (so we can render any past version — see Rendering below).

```ts
{
  slug: 'proposals',
  versions: { drafts: true, maxPerDoc: 0 }, // 0 = unlimited revisions
  admin: {
    useAsTitle: 'internalTitle',
    defaultColumns: ['internalTitle', 'client', 'status', 'sentAt', 'lastContactAt'],
  },
  fields: [
    // --- identity ---
    { name: 'internalTitle', type: 'text', required: true,
      admin: { description: 'For our admin only — e.g. "Consultway — Proposal A".' } },
    { name: 'urlSlug', type: 'text', required: true, unique: true, index: true,
      admin: { description: 'Public URL: /proposals/<urlSlug>. Should be hard-to-guess.' } },

    // --- client (relationship; inline create from the proposal form) ---
    { name: 'client', type: 'relationship', relationTo: 'clients', required: true },

    // --- header / branding ---
    { name: 'projectName', type: 'text', required: true },
    { name: 'subtitle', type: 'text',
      admin: { description: 'e.g. "Website Development", "Companies & Tender Platform".' } },
    { name: 'logo', type: 'upload', relationTo: 'media',
      admin: { description: 'Falls back to the client\'s default logo if blank.' } },
    { name: 'accentColor', type: 'text', defaultValue: '#f97316' },
    { name: 'fontFamily', type: 'select',
      options: ['League Spartan', 'Inter', 'Space Mono', 'Custom'],
      defaultValue: 'League Spartan' },
    { name: 'proposalDate', type: 'date', required: true,
      admin: { description: 'Date shown in header. Defaults to today.' } },

    // --- content ---
    { name: 'overview', type: 'textarea', required: true },

    // --- summary cards ("At a Glance") ---
    { name: 'summaryCards', type: 'array', minRows: 1, fields: [
      { name: 'label', type: 'text', required: true,
        admin: { description: 'e.g. "Timeline", "Total Cost", "Monthly Fee", "Contract Length".' } },
      { name: 'value', type: 'text', required: true,
        admin: { description: 'e.g. "10–12 Weeks", "₹12,50,000", "₹50,000/mo".' } },
      { name: 'caption', type: 'text',
        admin: { description: 'Small line under the value. e.g. "Design through launch", "+18% GST", "Includes 10 hrs/mo".' } },
    ]},
    // The admin UI shows the live cost-items total nearby so the user can copy it
    // into a "Total Cost" card value as ₹X,XX,XXX.

    // --- scope ---
    { name: 'scopeItems', type: 'array', fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'description', type: 'textarea', required: true },
    ]},

    // --- cost breakdown (skips rendering if empty; live total shown in admin UI) ---
    { name: 'costSectionLabel', type: 'text', defaultValue: 'Cost Breakdown',
      admin: { description: 'Override e.g. for maintenance: "Monthly Fee".' } },
    { name: 'costTotalLabel', type: 'text', defaultValue: 'Total',
      admin: { description: 'Override e.g. "Monthly Total".' } },
    { name: 'costItems', type: 'array', fields: [
      { name: 'item', type: 'text', required: true },
      { name: 'amount', type: 'number', required: true,
        admin: { description: 'In rupees. Formatted as ₹X,XX,XXX in render.' } },
    ]},
    // grandTotal derived from sum(costItems.amount).
    // Admin UI: a custom Field component that subscribes to costItems and shows
    // the running total above/below the array — no backend round-trip.

    // --- architecture ---
    { name: 'techStack', type: 'array', fields: [
      { name: 'label', type: 'text', required: true },     // "Frontend"
      { name: 'value', type: 'text', required: true },     // "Next.js + Tailwind"
    ]},

    // --- recurring costs ---
    { name: 'recurringCosts', type: 'array', fields: [
      { name: 'item', type: 'text', required: true },
      { name: 'cost', type: 'text', required: true,
        admin: { description: 'Free-form, e.g. "₹500–2,000/mo".' } },
      { name: 'notes', type: 'text' },
    ]},

    // --- payment terms (optional; render skipped if empty) ---
    { name: 'paymentTerms', type: 'array', fields: [
      { name: 'milestone', type: 'text', required: true },
      { name: 'sharePercent', type: 'number', required: true },
      // amount derived = sharePercent * grandTotal / 100
    ]},

    // --- lifecycle / tracking ---
    { name: 'status', type: 'select', required: true, defaultValue: 'draft',
      options: ['draft', 'sent', 'accepted', 'rejected', 'cold', 'withdrawn'],
      index: true },
    { name: 'sentAt', type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' },
               description: 'When you sent the PDF/link. Defaults to now when status flips to "sent" — editable.' } },
    { name: 'sentTo', type: 'array', fields: [
      { name: 'name', type: 'text' },
      { name: 'email', type: 'email' },
    ]},
    { name: 'sentMethod', type: 'select',
      options: ['email', 'whatsapp', 'in-person', 'other'] },
    { name: 'lastContactAt', type: 'date',
      admin: { description: 'Updated whenever you have any back-and-forth with the client. Drives the "cold" auto-flag (3 weeks of silence → cold).' } },
    { name: 'respondedAt', type: 'date' },
    { name: 'attachedPdf', type: 'upload', relationTo: 'media',
      admin: { description: 'Optional: archive the exact PDF you sent.' } },
    { name: 'notes', type: 'array', fields: [
      { name: 'author', type: 'relationship', relationTo: 'users' },
      { name: 'note', type: 'textarea', required: true },
      { name: 'createdAt', type: 'date',
        admin: { date: { pickerAppearance: 'dayAndTime' } } },
    ], admin: { description: 'Running negotiation/follow-up notes. Each note timestamped.' } },
  ],
  hooks: {
    beforeChange: [
      // If status flipped draft → sent and sentAt is blank, fill sentAt = now.
      // Same hook can stamp lastContactAt = sentAt if blank.
    ],
  },
  timestamps: true,
}
```

### Auto "cold" status

A scheduled Worker (cron) flips proposals from `sent` → `cold` once `now - lastContactAt > 21 days` and there's no `respondedAt`. Updating `lastContactAt` resets the clock.

### Derived fields (computed in render, not stored)

- **Grand total** = `sum(costItems.amount)`
- **Payment term amount** = `sharePercent * grandTotal / 100`
- **Indian rupee format** — `₹1,00,000` / `₹12,50,000` (Indian grouping, not Western). Util in `apps/cms/src/lib/formatINR.ts`.

## `Clients` collection (new)

Lightweight; created inline from the proposal form via Payload's relationship field default UI.

```ts
{
  slug: 'clients',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'status', 'createdAt'] },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'tagline', type: 'text',
      admin: { description: 'Renders below the project name on proposal header.' } },
    { name: 'defaultLogo', type: 'upload', relationTo: 'media' },
    { name: 'contacts', type: 'array', fields: [
      { name: 'name', type: 'text' },
      { name: 'email', type: 'email' },
      { name: 'phone', type: 'text' },
      { name: 'role', type: 'text' },
    ]},
    { name: 'status', type: 'select', defaultValue: 'prospect',
      options: ['prospect', 'active', 'inactive', 'archived'] },
    { name: 'notes', type: 'richText' },
  ],
  timestamps: true,
}
```

## Rendering — on `apps/web`

The rendered, print-ready proposal page lives on **`apps/web`** (Astro), not on the admin app. Client-facing URL: `https://<web-domain>/proposals/<urlSlug>`.

- Astro page at `apps/web/src/pages/proposals/[slug].astro`.
- Fetches the proposal from the CMS via Payload's REST/GraphQL API (or local fetch if same Cloudflare account).
- Tailwind via CDN inside the rendered page (matches the existing `quotes/` files; keeps print rendering unaffected by the marketing site's own Tailwind config).
- Print CSS block (`@media print { @page { margin: 2cm; } … }`) ported verbatim.
- 404 if the proposal doesn't exist or its status is `draft` (drafts only viewable in the CMS admin live preview).

The browser "Print → Save as PDF" flow keeps working — same output as today.

### Versioned URLs

Every save creates a new Payload version. The URL supports `?v=<versionId>` to render a specific past version (useful for "what exactly did the client see when I sent it"). Default (no `v`) renders the current published version.

- `/proposals/<slug>` → latest published.
- `/proposals/<slug>?v=<id>` → that exact version.
- We'll capture the version id at the moment of "send" so we can always reproduce the sent state.

## The bigger picture — Clients, Engagements, Tasks

Open question from your notes: _when does a proposal become a project? what stages?_ Sketching one direction so we can react to it together — none of this is committed yet.

### Naming caveat

There's already a `Projects` collection in the CMS, but it's the **portfolio** (showcased on the marketing site). We need a separate collection for active client work. Suggested name: **`Engagements`** (clear separation from portfolio Projects).

### Suggested lifecycle

```
[Lead]                 (informal — could be just a Client with status "prospect")
   ↓
[Proposal]             (Proposals collection — owns its own lifecycle: draft → sent → accepted/rejected/cold)
   ↓ on accepted
[Engagement]           (Engagements collection — active work, references the accepted Proposal)
   stages: scoping → design → development → testing → deployment → maintenance → done
   ↓
[Tasks]                (Tasks collection — granular work items, optionally tied to an Engagement)
```

### Proposed collections (sketch)

- **Clients** — defined above.
- **Proposals** — defined above.
- **Engagements** — created (button or hook) when a proposal flips to `accepted`. Fields: `client`, `sourceProposal`, `name`, `stage` (the enum above), `startDate`, `targetEndDate`, `actualEndDate`, `notes`. Stages drive a kanban view.
- **Tasks** — `title`, `description`, `assignee`, `engagement` (optional), `status` (todo/in-progress/done/blocked), `dueDate`, `priority`.

### Decisions on the bigger picture

- **Phased rollout**: (1) Clients + Proposals first, (2) Engagements next once Proposals is solid, (3) Tasks last.
- **Maintenance contracts** live as a long-running `Engagement` that stays in a `maintenance` stage indefinitely.
- **Tasks** are built in-house (not Linear/Notion), with comments and attachments.
- **Stages** confirmed: `scoping → design → development → testing → deployment → maintenance → done`.
- **Collection name** confirmed: `Engagements`.

## Decisions

- No automatic sending from the CMS yet. Manual.
- Public proposal pages openly readable (hard-to-guess slug).
- PDF generation stays manual ("browser Print to PDF").
- Multi-phase shape: dropped from v1, single-phase implicit.
- Tailwind via CDN inside the rendered page.
- Clients as a relation, with inline-create from the proposal form.
- Payment terms optional.
- Add-ons removed.
- Bespoke designs (digantara) not supported in the CMS.
- `sentAt` defaults to now when status flips to `sent`; user can override.
- Render on `apps/web`, not `apps/cms`.
- Full version history on; render specific versions via `?v=<versionId>`.
- Maintenance handled via a flexible schema (summary cards + optional cost-section labels), not a dedicated `proposalType`.
- Notes admin UI: custom Field component, chronological feed, auto-stamps `author` from the logged-in user (`req.user`) and `createdAt` from the server clock. The user only types the note body.
- The "cold" auto-flag runs in a daily cron added to `apps/cms/wrangler.jsonc`.

## Service-binding spike

Before wiring `apps/web` to the CMS, run a small spike to confirm the Payload-on-OpenNext Worker plays nicely when called via service binding rather than its public URL. Goal: hit `env.CMS.fetch(new Request('https://internal/api/proposals/...'))` from the web Worker and get back proposal JSON.

**Run it locally** — that's enough for the spike. `wrangler dev` proxies service bindings between locally-running Workers exactly like prod (via Miniflare), so wiring and auth behaviour resolve here.

What to verify in the spike:

1. The binding is reachable from `apps/web` and Payload's REST route returns the expected shape.
2. The auth path: try anonymous (relying on Payload collection access rules — `read: () => true` for proposals where `status !== 'draft'`) and try shared-secret header. Pick whichever feels less fragile.
3. Calling the binding doesn't pull in admin-only auth side-effects (cookies, CSRF) that break for a server-to-server call.

Defaulting to **service binding + shared-secret header** unless the spike surfaces something annoying — then we fall back to a public REST call from `apps/web`.

After the spike: a single deploy-time smoke test against real D1 + the production routing setup, just to be sure. Nothing about the auth/wiring question itself needs prod to answer.
