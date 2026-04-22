import type { CollectionConfig } from 'payload'
import {
  triggerWebDeployAfterChange,
  triggerWebDeployAfterDelete,
} from '../hooks/triggerWebDeploy'
import { slugifyFrom } from '../hooks/slugify'
import { blockDeleteIfReferenced } from '../hooks/blockDeleteIfReferenced'

const authenticated = ({ req: { user } }: { req: { user: unknown } }) => Boolean(user)

export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'slug'],
    description: 'Reusable keywords/tools shown as chips on services.',
  },
  hooks: {
    afterChange: [triggerWebDeployAfterChange],
    afterDelete: [triggerWebDeployAfterDelete],
    beforeDelete: [
      blockDeleteIfReferenced({
        referencingCollection: 'services',
        referencingField: 'tags',
        label: 'tag',
      }),
    ],
  },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'label', type: 'text', required: true, admin: { description: 'Display form, e.g. "Astro", "E-commerce".' } },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      hooks: { beforeValidate: [slugifyFrom('label')] },
      admin: { description: 'Auto-generated from label if left blank.' },
    },
  ],
  timestamps: true,
}
