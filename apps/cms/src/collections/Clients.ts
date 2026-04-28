import type { CollectionConfig } from 'payload'

const authenticated = ({ req: { user } }: { req: { user: unknown } }) => Boolean(user)

export const Clients: CollectionConfig = {
  slug: 'clients',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'status', 'createdAt'],
    description: 'People/orgs we send proposals to and work with.',
  },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'tagline',
      type: 'text',
      admin: {
        description: "Optional. Renders below the project name in proposal headers.",
      },
    },
    { name: 'defaultLogo', type: 'upload', relationTo: 'media' },
    {
      name: 'contacts',
      type: 'array',
      fields: [
        { name: 'name', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'phone', type: 'text' },
        { name: 'role', type: 'text' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'prospect',
      options: [
        { label: 'Prospect', value: 'prospect' },
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Archived', value: 'archived' },
      ],
      index: true,
    },
    { name: 'notes', type: 'richText' },
  ],
  timestamps: true,
}
