import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

const authenticated = ({ req: { user } }: { req: { user: unknown } }) => Boolean(user)

const stampComments: CollectionBeforeChangeHook = ({ data, req }) => {
  const now = new Date().toISOString()
  if (Array.isArray(data?.comments)) {
    const userId = (req?.user as { id?: string | number } | undefined)?.id
    data.comments = data.comments.map((c) => ({
      ...c,
      author: c?.author ?? userId ?? null,
      createdAt: c?.createdAt ?? now,
    }))
  }
  return data
}

export const Tasks: CollectionConfig = {
  slug: 'tasks',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'engagement', 'assignee', 'status', 'priority', 'dueDate'],
    description: 'Granular work items, optionally tied to an engagement.',
  },
  hooks: {
    beforeChange: [stampComments],
  },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    {
      name: 'engagement',
      type: 'relationship',
      relationTo: 'engagements',
    },
    {
      name: 'assignee',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'todo',
      index: true,
      options: [
        { label: 'To do', value: 'todo' },
        { label: 'In progress', value: 'in-progress' },
        { label: 'Done', value: 'done' },
        { label: 'Blocked', value: 'blocked' },
      ],
    },
    {
      name: 'priority',
      type: 'select',
      defaultValue: 'medium',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
      ],
    },
    { name: 'dueDate', type: 'date' },
    {
      name: 'attachments',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
    },
    {
      name: 'comments',
      type: 'array',
      admin: {
        description:
          'Discussion thread. Author and timestamp are stamped on save.',
        components: {
          // Reuse the same chronological-feed UI as proposal/engagement notes.
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
