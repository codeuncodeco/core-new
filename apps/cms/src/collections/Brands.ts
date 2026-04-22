import type { CollectionConfig } from 'payload'
import {
  triggerWebDeployAfterChange,
  triggerWebDeployAfterDelete,
} from '../hooks/triggerWebDeploy'
import { normalizeDomain } from '../hooks/normalizeDomain'

const authenticated = ({ req: { user } }: { req: { user: unknown } }) => Boolean(user)

const WEB_URL = process.env.WEB_URL || 'http://localhost:4321'

export const Brands: CollectionConfig = {
  slug: 'brands',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'domain', 'image', '_status'],
    description: 'Brands we work with — logo, name, and primary domain.',
    livePreview: {
      url: () => `${WEB_URL}/preview/about?collection=brands`,
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
      name: 'domain',
      type: 'text',
      required: true,
      hooks: { beforeValidate: [normalizeDomain] },
      admin: { description: 'Primary domain, e.g. "example.com". Protocol (http://, https://) and trailing slashes are stripped automatically.' },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
  ],
  timestamps: true,
}
