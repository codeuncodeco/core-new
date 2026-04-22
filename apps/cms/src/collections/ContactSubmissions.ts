import type { CollectionConfig } from 'payload'

const authenticated = ({ req: { user } }: { req: { user: unknown } }) => Boolean(user)

export const ContactSubmissions: CollectionConfig = {
  slug: 'contact-submissions',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'help', 'createdAt'],
    description: 'Submissions from the website contact form.',
  },
  access: {
    // Public form posts via an authenticated server route using payload.create,
    // so no unauthenticated create access is needed.
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'message', type: 'textarea', required: true },
    { name: 'help', type: 'text', admin: { description: 'What they need help with.' } },
    { name: 'branch', type: 'text' },
    { name: 'scope', type: 'text' },
    { name: 'goal', type: 'text' },
    { name: 'pain', type: 'text' },
    { name: 'otherContext', type: 'textarea' },
    { name: 'timeline', type: 'text' },
    { name: 'budget', type: 'text' },
    {
      name: 'emailStatus',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Sent', value: 'sent' },
        { label: 'Failed', value: 'failed' },
      ],
      defaultValue: 'pending',
      admin: { readOnly: true },
    },
    {
      name: 'emailError',
      type: 'text',
      admin: { readOnly: true },
    },
    {
      name: 'userAgent',
      type: 'text',
      admin: { readOnly: true },
    },
  ],
  timestamps: true,
}
