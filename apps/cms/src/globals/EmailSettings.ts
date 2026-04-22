import type { GlobalConfig } from 'payload'

const authenticated = ({ req: { user } }: { req: { user: unknown } }) => Boolean(user)

export const EmailSettings: GlobalConfig = {
  slug: 'email-settings',
  admin: {
    description:
      'Sender identity and recipient lists for outbound and form-notification emails.',
  },
  access: {
    read: authenticated,
    update: authenticated,
  },
  fields: [
    {
      name: 'fromName',
      type: 'text',
      required: true,
      defaultValue: 'Code Uncode',
    },
    {
      name: 'fromEmail',
      type: 'email',
      required: true,
      defaultValue: 'hello@send.codeuncode.com',
      admin: {
        description:
          'Must be on a domain verified in Resend. Used as the default From for forgot-password and notification emails.',
      },
    },
    {
      name: 'contactRecipients',
      type: 'array',
      labels: { singular: 'Recipient', plural: 'Recipients' },
      admin: {
        description:
          'Emails that receive a notification when the website contact form is submitted.',
      },
      fields: [
        { name: 'email', type: 'email', required: true },
      ],
    },
  ],
}
