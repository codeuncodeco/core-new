import type { CollectionConfig } from 'payload'
import {
  triggerWebDeployAfterChange,
  triggerWebDeployAfterDelete,
} from '../hooks/triggerWebDeploy'
import { slugifyFrom } from '../hooks/slugify'
import { blockDeleteIfReferenced } from '../hooks/blockDeleteIfReferenced'

const authenticated = ({ req: { user } }: { req: { user: unknown } }) => Boolean(user)

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'displayOrder', 'icon'],
    description: 'Top-level groupings for services (Design, Development, etc.).',
  },
  hooks: {
    afterChange: [triggerWebDeployAfterChange],
    afterDelete: [triggerWebDeployAfterDelete],
    beforeDelete: [
      blockDeleteIfReferenced({
        referencingCollection: 'services',
        referencingField: 'category',
        label: 'category',
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
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      hooks: { beforeValidate: [slugifyFrom('title')] },
      admin: { description: 'Auto-generated from title if left blank.' },
    },
    { name: 'blurb', type: 'textarea', admin: { description: 'Shown under the category heading on /services.' } },
    {
      name: 'icon',
      type: 'text',
      required: true,
      defaultValue: 'pen-ruler',
      admin: {
        description:
          'Font Awesome icon name (e.g. "code", "palette", "pen-ruler"). Rendered as fa-slab fa-regular fa-{name}. Browse at https://fontawesome.com/icons?s=slab&m=regular',
      },
    },
    { name: 'displayOrder', type: 'number', defaultValue: 0, index: true, required: true },
  ],
  timestamps: true,
}
