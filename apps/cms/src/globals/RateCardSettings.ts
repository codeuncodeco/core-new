import type { GlobalConfig } from 'payload'
import { triggerWebDeployAfterGlobalChange } from '../hooks/triggerWebDeploy'

const authenticated = ({ req: { user } }: { req: { user: unknown } }) => Boolean(user)

export const RateCardSettings: GlobalConfig = {
  slug: 'rate-card-settings',
  access: {
    read: () => true,
    update: authenticated,
  },
  hooks: {
    afterChange: [triggerWebDeployAfterGlobalChange],
  },
  fields: [
    { name: 'taxNote', type: 'text', defaultValue: 'Plus GST' },
    {
      name: 'currency',
      type: 'select',
      options: [
        { label: 'INR', value: 'INR' },
        { label: 'USD', value: 'USD' },
      ],
      defaultValue: 'INR',
    },
    { name: 'footerDisclaimer', type: 'textarea' },
    { name: 'contactCta', type: 'text' },
  ],
}
