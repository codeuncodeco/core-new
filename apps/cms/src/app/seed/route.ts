import configPromise from '@payload-config'
import { getPayload } from 'payload'
import type { CollectionSlug } from 'payload'
import { allSeedServices } from '../../seed/services-data'
import { allSeedCategories } from '../../seed/categories-data'
import { allSeedTags } from '../../seed/tags-data'
import { allSeedProjects } from '../../seed/projects-data'
import { allSeedPartners } from '../../seed/partners-data'
import { allSeedClients } from '../../seed/clients-data'
import { allSeedProposals } from '../../seed/proposals-data'

const isProduction = process.env.NODE_ENV === 'production'

type AnyPayload = Awaited<ReturnType<typeof getPayload>>

// Replace all docs of a collection with the provided list.
// Callers pass (data, buildDoc) where buildDoc may be async (to resolve refs).
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
    // draft: false forces published status on collections with versions.drafts
    // enabled (Partners, and more to come). No-op for non-versioned collections.
    const doc = await payload.create({ collection, data: body, overrideAccess: true, draft: false })
    createdSlugs.push((doc as { slug?: string }).slug ?? String((doc as { id: string | number }).id))
  }
  return createdSlugs
}

const KNOWN_TARGETS = ['categories', 'tags', 'services', 'projects', 'partners', 'rate-card', 'clients', 'proposals'] as const
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

    // Services/Categories/Tags are interdependent — must be seeded together or not at all,
    // since Services references Categories + Tags and replaceAll wipes before reseeding.
    const trio = ['services', 'categories', 'tags'] as const
    const touchedTrio = trio.filter((t) => only!.has(t))
    if (touchedTrio.length > 0 && touchedTrio.length < trio.length) {
      return Response.json(
        {
          error:
            'services, categories, and tags must be seeded together (they have relational dependencies). Include all three in ?only= or omit the filter for a full seed.',
        },
        { status: 400 },
      )
    }

    // Proposals reference Clients — if you re-seed clients, you must re-seed
    // proposals in the same run (otherwise proposals end up referencing
    // deleted client IDs).
    if (only.has('clients') && !only.has('proposals')) {
      return Response.json(
        {
          error:
            'clients and proposals must be seeded together. Include both in ?only= or omit the filter for a full seed.',
        },
        { status: 400 },
      )
    }
  }
  const shouldRun = (target: Target) => !only || only.has(target)

  const payload = await getPayload({ config: configPromise })

  const result: Record<string, unknown> = { ok: true, ran: [] as string[] }
  const ran = result.ran as string[]

  // 1) Services reference Categories + Tags, so wipe Services first so we can safely
  //    wipe + reseed Categories + Tags without tripping the "block delete if referenced" hook.
  if (shouldRun('services')) {
    await replaceAll(payload, 'services', [], () => ({}))
  }

  if (shouldRun('categories')) {
    const categoriesCreated = await replaceAll(payload, 'categories', allSeedCategories, (c) => ({
      slug: c.slug,
      title: c.title,
      blurb: c.blurb,
      icon: c.icon,
      displayOrder: c.displayOrder,
    }))
    result.categoriesCreated = categoriesCreated.length
    result.categories = categoriesCreated
    ran.push('categories')
  }

  if (shouldRun('tags')) {
    const tagsCreated = await replaceAll(payload, 'tags', allSeedTags, (t) => ({
      slug: t.slug,
      label: t.label,
    }))
    result.tagsCreated = tagsCreated.length
    result.tags = tagsCreated
    ran.push('tags')
  }

  if (shouldRun('services')) {
    // Resolve category + tag slugs to ids against whatever is currently in the DB
    // (may have just been reseeded, may have been present from a prior run).
    const catDocs = await payload.find({ collection: 'categories', limit: 1000, depth: 0 })
    const catIdBySlug = new Map<string, number>(
      catDocs.docs.map((d) => [(d as { slug: string }).slug, (d as { id: number }).id]),
    )
    const tagDocs = await payload.find({ collection: 'tags', limit: 1000, depth: 0 })
    const tagIdBySlug = new Map<string, number>(
      tagDocs.docs.map((d) => [(d as { slug: string }).slug, (d as { id: number }).id]),
    )

    const servicesCreated: string[] = []
    for (const svc of allSeedServices) {
      const categoryId = catIdBySlug.get(svc.categorySlug)
      if (!categoryId) {
        throw new Error(`Service "${svc.slug}" references unknown category "${svc.categorySlug}".`)
      }
      const tagIds = (svc.tagSlugs ?? []).map((tagSlug) => {
        const id = tagIdBySlug.get(tagSlug)
        if (!id) {
          throw new Error(`Service "${svc.slug}" references unknown tag "${tagSlug}".`)
        }
        return id
      })

      const { categorySlug: _cs, tagSlugs: _ts, ...rest } = svc
      const doc = await payload.create({
        collection: 'services',
        data: { ...rest, category: categoryId, tags: tagIds },
        overrideAccess: true,
        draft: false,
      })
      servicesCreated.push((doc as { slug: string }).slug)
    }
    result.servicesCreated = servicesCreated.length
    result.services = servicesCreated
    ran.push('services')
  }

  if (shouldRun('projects')) {
    const projectsCreated = await replaceAll(
      payload,
      'projects',
      allSeedProjects,
      (p) => p as unknown as Record<string, unknown>,
    )
    result.projectsCreated = projectsCreated.length
    result.projects = projectsCreated
    ran.push('projects')
  }

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

  // Wipe proposals before clients so the FK constraint doesn't trip when
  // re-seeding clients.
  if (shouldRun('proposals')) {
    await replaceAll(payload, 'proposals', [], () => ({}))
  }

  if (shouldRun('clients')) {
    const clientsCreated = await replaceAll(payload, 'clients', allSeedClients, (c) => ({
      ...c,
    }))
    result.clientsCreated = clientsCreated.length
    result.clients = clientsCreated
    ran.push('clients')
  }

  if (shouldRun('proposals')) {
    const clientDocs = await payload.find({ collection: 'clients', limit: 1000, depth: 0 })
    const clientIdByName = new Map<string, number>(
      clientDocs.docs.map((d) => [(d as { name: string }).name, (d as { id: number }).id]),
    )

    const proposalsCreated: string[] = []
    for (const p of allSeedProposals) {
      const clientId = clientIdByName.get(p.clientName)
      if (!clientId) {
        throw new Error(`Proposal "${p.urlSlug}" references unknown client "${p.clientName}".`)
      }
      const { clientName: _cn, ...rest } = p
      const doc = await payload.create({
        collection: 'proposals',
        data: { ...rest, client: clientId },
        overrideAccess: true,
        // Seed proposals as drafts — they don't pretend to be real, sent
        // proposals. Publish via the admin if you want one for end-to-end
        // public-render testing.
        draft: true,
      })
      proposalsCreated.push((doc as { urlSlug: string }).urlSlug)
    }
    result.proposalsCreated = proposalsCreated.length
    result.proposals = proposalsCreated
    ran.push('proposals')
  }

  if (shouldRun('rate-card')) {
    await payload.updateGlobal({
      slug: 'rate-card-settings',
      data: { taxNote: 'Plus GST', currency: 'INR' },
    })
    ran.push('rate-card')
  }

  result.notes = {
    brands: 'Not seeded — Brands.image is a required upload. Add brands via admin UI.',
  }

  return Response.json(result)
}

export const POST = runSeed
export const GET = runSeed
