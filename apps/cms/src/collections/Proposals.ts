import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

const authenticated = ({ req: { user } }: { req: { user: unknown } }) => Boolean(user)

const WEB_URL = process.env.WEB_URL || 'http://localhost:4321'

// Auto-fill sentAt when status flips to 'sent', mirror lastContactAt to
// sentAt on first send, and stamp newly-added notes with author + createdAt.
const lifecycleAndNotes: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  const now = new Date().toISOString()

  if (data?.status === 'sent' && originalDoc?.status !== 'sent' && !data.sentAt) {
    data.sentAt = now
  }
  if (data?.sentAt && !data.lastContactAt) {
    data.lastContactAt = data.sentAt
  }

  if (Array.isArray(data?.notes)) {
    const userId = (req?.user as { id?: string | number } | undefined)?.id
    data.notes = data.notes.map((note) => ({
      ...note,
      author: note?.author ?? userId ?? null,
      createdAt: note?.createdAt ?? now,
    }))
  }

  return data
}


export const Proposals: CollectionConfig = {
  slug: 'proposals',
  admin: {
    useAsTitle: 'internalTitle',
    defaultColumns: ['internalTitle', 'client', 'status', 'sentAt', 'lastContactAt'],
    description:
      'Client proposals — authored here, rendered on apps/web, exported to PDF via the browser. Use the in-form "Duplicate this proposal" button to copy — the default Duplicate action will hit the unique-slug constraint.',
    livePreview: {
      url: ({ data }) => {
        const slug = (data as { urlSlug?: string } | null)?.urlSlug
        // No slug yet (unsaved doc) → land on a 404 placeholder; user has to
        // save the proposal once before live preview becomes meaningful.
        return `${WEB_URL}/preview/proposals/${slug ?? 'new'}`
      },
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 375, height: 667 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },
  versions: { drafts: true, maxPerDoc: 0 },
  hooks: {
    beforeChange: [lifecycleAndNotes],
  },
  access: {
    // Public can read published proposals (drafts are auto-filtered by Payload
    // when versions.drafts is true). The renderer on apps/web hits this.
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    // --- duplicate action (button — appears at the top of the form) ---
    {
      name: 'duplicateAction',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/DuplicateProposalButton#DuplicateProposalButton',
        },
      },
    },

    // --- identity ---
    {
      name: 'internalTitle',
      type: 'text',
      required: true,
      admin: { description: 'Admin-only label. e.g. "Consultway — Proposal A".' },
    },
    {
      name: 'urlSlug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Public URL: /proposals/<urlSlug>. Should be hard to guess.' },
    },

    // --- client ---
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
    },

    // --- header / branding ---
    { name: 'projectName', type: 'text', required: true },
    {
      name: 'subtitle',
      type: 'text',
      admin: {
        description: 'e.g. "Website Development", "Companies & Tender Platform".',
      },
    },
    {
      name: 'accentColor',
      type: 'text',
      defaultValue: '#f97316',
      admin: {
        components: {
          Field: '@/components/ColorField#ColorField',
        },
      },
    },
    {
      name: 'fontFamily',
      type: 'select',
      defaultValue: 'League Spartan',
      options: [
        { label: 'League Spartan', value: 'League Spartan' },
        { label: 'Inter', value: 'Inter' },
        { label: 'Space Mono', value: 'Space Mono' },
        { label: 'Custom', value: 'Custom' },
      ],
    },
    {
      name: 'proposalDate',
      type: 'date',
      required: true,
      admin: { description: 'Date shown in header. Defaults to today.' },
    },

    // --- content ---
    { name: 'overview', type: 'textarea', required: true },

    // --- summary cards ("At a Glance") ---
    {
      name: 'summaryCards',
      type: 'array',
      minRows: 1,
      admin: {
        description:
          'Cards in the "At a Glance" row. e.g. Timeline + Total Cost for a project, or Monthly Fee + Contract Length for maintenance.',
        components: { RowLabel: '@/components/ArrayRowLabel#ArrayRowLabel' },
      },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'value', type: 'text', required: true },
        {
          name: 'caption',
          type: 'text',
          admin: { description: 'Small line under the value. e.g. "+18% GST".' },
        },
      ],
    },

    // --- scope ---
    {
      name: 'scopeItems',
      type: 'array',
      admin: { components: { RowLabel: '@/components/ArrayRowLabel#ArrayRowLabel' } },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'textarea', required: true },
      ],
    },

    // --- cost breakdown ---
    {
      name: 'costSectionLabel',
      type: 'text',
      defaultValue: 'Cost Breakdown',
      admin: { description: 'Override e.g. for maintenance: "Monthly Fee".' },
    },
    {
      name: 'costTotalLabel',
      type: 'text',
      defaultValue: 'Total',
      admin: { description: 'Override e.g. "Monthly Total".' },
    },
    {
      name: 'costItems',
      type: 'array',
      admin: {
        description: 'Renderer skips the cost-breakdown section when empty.',
        components: { RowLabel: '@/components/ArrayRowLabel#ArrayRowLabel' },
      },
      fields: [
        { name: 'item', type: 'text', required: true },
        {
          name: 'amount',
          type: 'number',
          required: true,
          admin: { description: 'In rupees. Formatted as ₹X,XX,XXX in the rendered page.' },
        },
      ],
    },

    // --- architecture ---
    {
      name: 'techStack',
      type: 'array',
      admin: { components: { RowLabel: '@/components/ArrayRowLabel#ArrayRowLabel' } },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'value', type: 'text', required: true },
      ],
    },

    // --- recurring costs ---
    {
      name: 'recurringCosts',
      type: 'array',
      admin: { components: { RowLabel: '@/components/ArrayRowLabel#ArrayRowLabel' } },
      fields: [
        { name: 'item', type: 'text', required: true },
        {
          name: 'cost',
          type: 'text',
          required: true,
          admin: { description: 'Free-form, e.g. "₹500–2,000/mo".' },
        },
        { name: 'notes', type: 'text' },
      ],
    },

    // --- payment terms (optional; renderer skips if empty) ---
    {
      name: 'paymentTerms',
      type: 'array',
      admin: { components: { RowLabel: '@/components/ArrayRowLabel#ArrayRowLabel' } },
      fields: [
        { name: 'milestone', type: 'text', required: true },
        { name: 'sharePercent', type: 'number', required: true },
      ],
    },

    // --- lifecycle / tracking ---
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Sent', value: 'sent' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Cold', value: 'cold' },
        { label: 'Withdrawn', value: 'withdrawn' },
      ],
    },
    {
      name: 'sentAt',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'When you sent the PDF/link. Auto-set to now when status flips to "sent" — editable.',
      },
    },
    {
      name: 'sentTo',
      type: 'array',
      admin: { components: { RowLabel: '@/components/ArrayRowLabel#ArrayRowLabel' } },
      fields: [
        { name: 'name', type: 'text' },
        { name: 'email', type: 'email' },
      ],
    },
    {
      name: 'sentMethod',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Email', value: 'email' },
        { label: 'WhatsApp', value: 'whatsapp' },
        { label: 'In-person', value: 'in-person' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'lastContactAt',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'Update on any back-and-forth. Drives the "cold" auto-flag (3 weeks of silence → cold).',
      },
    },
    { name: 'respondedAt', type: 'date' },
    {
      name: 'attachedPdf',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Optional: archive the exact PDF you sent.' },
    },
    {
      name: 'notes',
      type: 'array',
      admin: {
        description:
          'Running negotiation/follow-up notes. author + createdAt are stamped on save.',
        components: { RowLabel: '@/components/ArrayRowLabel#ArrayRowLabel' },
      },
      fields: [
        {
          name: 'note',
          type: 'textarea',
          required: true,
        },
        {
          name: 'author',
          type: 'relationship',
          relationTo: 'users',
          admin: { readOnly: true },
        },
        {
          name: 'createdAt',
          type: 'date',
          admin: {
            readOnly: true,
            date: { pickerAppearance: 'dayAndTime' },
          },
        },
      ],
    },
  ],
  timestamps: true,
}
