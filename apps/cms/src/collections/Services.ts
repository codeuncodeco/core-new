import type { CollectionConfig } from 'payload'
import {
  triggerWebDeployAfterChange,
  triggerWebDeployAfterDelete,
} from '../hooks/triggerWebDeploy'

const authenticated = ({ req: { user } }: { req: { user: unknown } }) => Boolean(user)

const WEB_URL = process.env.WEB_URL || 'http://localhost:4321'

export const Services: CollectionConfig = {
  slug: 'services',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'displayOrder'],
    livePreview: {
      url: () => `${WEB_URL}/preview/`,
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
    // With drafts enabled, Payload applies the default published-only filter
    // on unauthenticated reads; authenticated editors see drafts too.
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      index: true,
      admin: { description: 'Top-level grouping. Controls which section this appears in on /services.' },
    },
    {
      name: 'flagship',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Feature this service as a large card at the top of its category. Flagships sort above the rest; within flagships, lower displayOrder wins.',
      },
    },
    {
      name: 'icon',
      type: 'text',
      admin: {
        description:
          'Font Awesome icon name (e.g. "code", "palette", "pen-ruler"). Rendered as fa-slab fa-regular fa-{name}. Leave blank to inherit the category icon. Browse at https://fontawesome.com/icons?s=slab&m=regular',
      },
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
      admin: {
        description: 'Reusable keywords/tools shown as chips (e.g. Astro, Payload, E-commerce).',
      },
    },
    { name: 'summary', type: 'text', admin: { description: 'Short blurb for cards.' } },
    { name: 'description', type: 'richText' },
    {
      name: 'prices',
      type: 'array',
      minRows: 1,
      admin: {
        description:
          'One row per price variant. A flat-priced service needs a single row with just `amount`.',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          admin: { description: 'e.g. "Single side", "8 pages", "5ft x 5ft". Omit for flat.' },
        },
        { name: 'amount', type: 'number', required: true },
        {
          name: 'suffix',
          type: 'text',
          admin: { description: 'e.g. "per month", "per page", "per word".' },
        },
        {
          name: 'note',
          type: 'text',
          admin: { description: 'e.g. "invoiced based on usage", "starting from".' },
        },
      ],
    },
    {
      name: 'inclusions',
      type: 'array',
      fields: [{ name: 'item', type: 'text', required: true }],
    },
    {
      name: 'exclusions',
      type: 'array',
      fields: [{ name: 'item', type: 'text', required: true }],
    },
    { name: 'displayOrder', type: 'number', defaultValue: 0, index: true },
    { name: 'internalNotes', type: 'textarea', admin: { description: 'Not rendered publicly.' } },
  ],
  timestamps: true,
}
