import type { CollectionBeforeDeleteHook, CollectionSlug } from 'payload'

type Opts = {
  /** Collection that references this doc (e.g. 'services') */
  referencingCollection: CollectionSlug
  /** Field on the referencing collection that holds the reference (e.g. 'category' or 'tags') */
  referencingField: string
  /** Label used in the error message (e.g. 'category', 'tag') */
  label: string
}

export const blockDeleteIfReferenced = ({
  referencingCollection,
  referencingField,
  label,
}: Opts): CollectionBeforeDeleteHook => {
  return async ({ req, id }) => {
    const referencing = await req.payload.find({
      collection: referencingCollection,
      where: { [referencingField]: { equals: id } },
      limit: 5,
      depth: 0,
    })
    if (referencing.totalDocs > 0) {
      const titles = referencing.docs
        .map((d) => (d as { title?: string; slug?: string }).title ?? (d as { slug?: string }).slug ?? String((d as { id: string | number }).id))
        .join(', ')
      throw new Error(
        `Cannot delete ${label}: still referenced by ${referencing.totalDocs} ${referencingCollection} (${titles}${referencing.totalDocs > 5 ? ', …' : ''}). Reassign them first.`,
      )
    }
  }
}
