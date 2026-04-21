import configPromise from '@payload-config'
import { getPayload } from 'payload'
import type { CollectionSlug } from 'payload'

const isProduction = process.env.NODE_ENV === 'production'

// Order respects referential integrity (services references tags/categories, etc.)
// Phase 1 only has partners. Extend as collections arrive.
const WIPE_ORDER: CollectionSlug[] = ['partners']

const runWipe = async (request: Request) => {
  const secret = new URL(request.url).searchParams.get('secret')
  if (isProduction && secret !== process.env.SEED_SECRET) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config: configPromise })

  const deleted: Record<string, number> = {}
  for (const collection of WIPE_ORDER) {
    const existing = await payload.find({
      collection,
      limit: 1000,
      depth: 0,
      overrideAccess: true,
      draft: true,
    })
    for (const doc of existing.docs) {
      await payload.delete({
        collection,
        id: (doc as { id: string | number }).id,
        overrideAccess: true,
      })
    }
    deleted[collection] = existing.docs.length
  }

  return Response.json({ ok: true, deleted })
}

export const POST = runWipe
export const GET = runWipe
