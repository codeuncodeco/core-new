import type { CollectionConfig } from 'payload'
import {
  triggerWebDeployAfterChange,
  triggerWebDeployAfterDelete,
} from '../hooks/triggerWebDeploy'

const authenticated = ({ req: { user } }: { req: { user: unknown } }) => Boolean(user)

const WEB_URL = process.env.WEB_URL || 'http://localhost:4321'

export const Partners: CollectionConfig = {
  slug: 'partners',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'tagline', 'href', 'displayOrder', '_status'],
    description: 'Partners we collaborate with — rendered on /about.',
    livePreview: {
      // ?collection= tells /preview/about which list to merge live-preview
      // postMessage payloads into (Partners and Brands both render there).
      url: () => `${WEB_URL}/preview/about?collection=partners`,
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 375, height: 667 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },
  versions: { drafts: true },
  hooks: {
    afterChange: [triggerWebDeployAfterChange],
    afterDelete: [triggerWebDeployAfterDelete],
  },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'tagline',
      type: 'text',
      required: true,
      admin: { description: 'Short line shown after the name, e.g. "Brand and interface craft."' },
    },
    {
      name: 'href',
      type: 'text',
      required: true,
      admin: { description: 'External URL the partner name links to.' },
    },
    {
      name: 'icon',
      type: 'text',
      required: true,
      admin: {
        description:
          'Font Awesome icon name (e.g. "palette", "flask", "pen-nib"). Rendered via ServiceIcon. Browse at https://fontawesome.com/icons?s=slab&m=regular',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: false,
      admin: { description: 'Optional. When set, rendered instead of the icon.' },
    },
    { name: 'displayOrder', type: 'number', defaultValue: 0, index: true, required: true },
  ],
  timestamps: true,
}
