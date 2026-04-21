import configPromise from '@payload-config'
import { getPayload } from 'payload'
import type { CollectionSlug } from 'payload'
import { allSeedPartners } from '../../seed/partners-data'

const isProduction = process.env.NODE_ENV === 'production'

type AnyPayload = Awaited<ReturnType<typeof getPayload>>

// Replace all docs of a collection with the provided list. `draft: false`
// forces published status on drafts-enabled collections so seed data lands
// as live (not sitting in the draft version table).
const replaceAll = async <T>(
  payload: AnyPayload,
  collection: CollectionSlug,
  data: T[],
  buildDoc: (item: T) => Promise<Record<string, unknown>> | Record<string, unknown>,
): Promise<string[]> => {
  const existing = await payload.find({ collection, limit: 1000, depth: 0, overrideAccess: true, draft: true })
  for (const doc of existing.docs) {
    await payload.delete({
      collection,
      id: (doc as { id: string | number }).id,
      overrideAccess: true,
    })
  }
  const createdSlugs: string[] = []
  for (const item of data) {
    const body = await buildDoc(item)
    const doc = await payload.create({ collection, data: body, overrideAccess: true, draft: false })
    createdSlugs.push((doc as { slug?: string }).slug ?? String((doc as { id: string | number }).id))
  }
  return createdSlugs
}

const KNOWN_TARGETS = ['partners'] as const
type Target = (typeof KNOWN_TARGETS)[number]

const runSeed = async (request: Request) => {
  const url = new URL(request.url)
  const secret = url.searchParams.get('secret')
  if (isProduction && secret !== process.env.SEED_SECRET) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const onlyParam = url.searchParams.get('only')
  let only: Set<Target> | null = null
  if (onlyParam) {
    const requested = onlyParam.split(',').map((s) => s.trim()).filter(Boolean)
    const invalid = requested.filter((t) => !KNOWN_TARGETS.includes(t as Target))
    if (invalid.length) {
      return Response.json(
        { error: `Unknown targets: ${invalid.join(', ')}. Valid: ${KNOWN_TARGETS.join(', ')}` },
        { status: 400 },
      )
    }
    only = new Set(requested as Target[])
  }
  const shouldRun = (target: Target) => !only || only.has(target)

  const payload = await getPayload({ config: configPromise })

  const result: Record<string, unknown> = { ok: true, ran: [] as string[] }
  const ran = result.ran as string[]

  if (shouldRun('partners')) {
    const partnersCreated = await replaceAll(payload, 'partners', allSeedPartners, (p) => ({
      name: p.name,
      tagline: p.tagline,
      href: p.href,
      icon: p.icon,
      displayOrder: p.displayOrder,
    }))
    result.partnersCreated = partnersCreated.length
    result.partners = partnersCreated
    ran.push('partners')
  }

  return Response.json(result)
}

export const POST = runSeed
export const GET = runSeed
