import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

const authenticated = ({ req: { user } }: { req: { user: unknown } }) => Boolean(user)

// Stamp author + createdAt on newly added notes.
const stampNotes: CollectionBeforeChangeHook = ({ data, req }) => {
  const now = new Date().toISOString()
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

export const Engagements: CollectionConfig = {
  slug: 'engagements',
  admin: {
    useAsTitle: 'internalTitle',
    defaultColumns: ['internalTitle', 'client', 'stage', 'startDate', 'targetEndDate'],
    description:
      'Active client work. Created when a proposal is accepted; ongoing maintenance lives here as a long-running engagement in the "maintenance" stage.',
  },
  hooks: {
    beforeChange: [stampNotes],
  },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    {
      name: 'internalTitle',
      type: 'text',
      required: true,
      admin: { description: 'Admin-only label, e.g. "Consultway — Platform Build".' },
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
    },
    {
      name: 'sourceProposal',
      type: 'relationship',
      relationTo: 'proposals',
      admin: { description: 'The proposal this engagement was accepted from, if any.' },
    },
    {
      name: 'stage',
      type: 'select',
      required: true,
      defaultValue: 'scoping',
      index: true,
      options: [
        { label: 'Scoping', value: 'scoping' },
        { label: 'Design', value: 'design' },
        { label: 'Development', value: 'development' },
        { label: 'Testing', value: 'testing' },
        { label: 'Deployment', value: 'deployment' },
        { label: 'Maintenance', value: 'maintenance' },
        { label: 'Done', value: 'done' },
      ],
    },
    { name: 'startDate', type: 'date' },
    { name: 'targetEndDate', type: 'date' },
    { name: 'actualEndDate', type: 'date' },
    {
      name: 'notes',
      type: 'array',
      admin: {
        description:
          'Running engagement notes. Author and timestamp are stamped on save.',
        components: {
          Field: '@/components/NotesFeed#NotesFeed',
          RowLabel: '@/components/ArrayRowLabel#ArrayRowLabel',
        },
      },
      fields: [
        { name: 'note', type: 'textarea', required: true },
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
