import type { CollectionConfig } from 'payload'
import { triggerWebDeployAfterChange, triggerWebDeployAfterDelete } from '../hooks/triggerWebDeploy'

const authenticated = ({ req: { user } }: { req: { user: unknown } }) => Boolean(user)

const WEB_URL = process.env.WEB_URL || 'http://localhost:4321'

export const Projects: CollectionConfig = {
  slug: 'projects',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'client', '_status', 'featured', 'displayOrder'],
    livePreview: {
      url: () => `${WEB_URL}/preview/work`,
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
    // Drafts enabled: default published-only filter for unauthenticated.
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'summary', type: 'text', admin: { description: 'Short blurb for cards.' } },
    { name: 'url', type: 'text', admin: { description: 'Live URL.' } },
    { name: 'repoUrl', type: 'text', admin: { description: 'Source repo URL, if public.' } },
    {
      name: 'client',
      type: 'text',
      admin: { description: 'Client name, or blank for internal/personal.' },
    },
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Cover image for listings.' },
    },
    {
      name: 'fetchCoverAction',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/FetchCoverButton#FetchCoverButton',
        },
      },
    },
    {
      name: 'tags',
      type: 'text',
      hasMany: true,
      admin: {
        description:
          'Free-form tags - mix of tech and domain (e.g. "astro", "shopify", "pwa", "visualization").',
      },
    },
    { name: 'description', type: 'richText' },
    { name: 'featured', type: 'checkbox', defaultValue: false, index: true },
    { name: 'displayOrder', type: 'number', defaultValue: 0, index: true },
    { name: 'internalNotes', type: 'textarea', admin: { description: 'Not rendered publicly.' } },
  ],
  timestamps: true,
}
