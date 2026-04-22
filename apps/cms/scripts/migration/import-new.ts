#!/usr/bin/env tsx
// Must come before any other import that pulls payload.config —
// `getPayload({ config })` validates PAYLOAD_SECRET at init, which needs
// the .env to be loaded before buildConfig runs.
import 'dotenv/config'

/**
 * Import content from the export dump into new-core.
 *
 * Uses Payload's local API (not REST) so hooks run + drafts/publish status
 * is controlled precisely + relationships resolve cleanly via id-maps.
 *
 * Run order (respects relational deps):
 *   Media → Categories → Tags → Brands → Projects → Services → Partners → Globals.
 *
 * Every create passes `draft: false` so rows land as published in drafts-enabled
 * collections (Services/Projects/Brands/Partners). Timestamps preserved when
 * present in the export.
 *
 * Usage (from apps/cms/):
 *   CLOUDFLARE_ENV=local  tsx scripts/migration/import-new.ts --in=../../migration/export
 *   CLOUDFLARE_ENV=beta   NODE_ENV=production PAYLOAD_SECRET=ignore tsx scripts/migration/import-new.ts
 *
 * Flags:
 *   --in=<path>      Input dir. Default: ../../migration/export (repo root).
 *   --only=<slugs>   Comma-separated. Default: everything.
 *   --mode=replace|append   Default: replace (wipes each collection first).
 *   --dry-run        Resolve relationships + report counts; touch nothing.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPayload } from 'payload'
import type { CollectionSlug, Payload } from 'payload'
import configPromise from '../../src/payload.config'

const __filename = fileURLToPath(import.meta.url)
const repoRoot = path.resolve(path.dirname(__filename), '../../../..')

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v = 'true'] = a.slice(2).split('=')
      return [k, v]
    }),
)

const IN = path.isAbsolute(args.in ?? '')
  ? args.in
  : path.join(repoRoot, args.in ?? 'migration/export')
const DRY = args['dry-run'] === 'true' || args['dry-run'] === ''
const MODE: 'replace' | 'append' = args.mode === 'append' ? 'append' : 'replace'
const ONLY = args.only ? new Set(args.only.split(',').map((s) => s.trim())) : null

const shouldRun = (name: string) => !ONLY || ONLY.has(name)

const log = (...a: unknown[]) => console.log('[import]', ...a)
const note = (...a: unknown[]) => console.log('         ', ...a)

// --- id-maps, populated as we import ---
const mediaIdMap = new Map<number, number>() // old → new
const categoryIdMap = new Map<number, number>()
const tagIdMap = new Map<number, number>()
// slug maps are the most useful secondary key
const categoryIdBySlug = new Map<string, number>()
const tagIdBySlug = new Map<string, number>()

// --- helpers ---

async function readJson<T>(rel: string): Promise<T | null> {
  try {
    const buf = await fs.readFile(path.join(IN, rel), 'utf8')
    return JSON.parse(buf) as T
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw e
  }
}

async function wipeCollection(payload: Payload, collection: CollectionSlug) {
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
  return existing.docs.length
}

type MediaExportDoc = {
  id: number
  filename?: string
  alt?: string
  mimeType?: string
  createdAt?: string
  updatedAt?: string
}

async function importMedia(payload: Payload) {
  const manifest = await readJson<MediaExportDoc[]>('media/manifest.json')
  if (!manifest) {
    note('no media/manifest.json — skipping Media import')
    return 0
  }

  if (MODE === 'replace') {
    const wiped = await wipeCollection(payload, 'media')
    note(`wiped ${wiped} existing media docs`)
  }

  let created = 0
  for (const m of manifest) {
    if (!m.filename) {
      note(`skip media id=${m.id}: no filename`)
      continue
    }
    const filePath = path.join(IN, 'media/files', m.filename)
    let data: Buffer
    try {
      data = await fs.readFile(filePath)
    } catch {
      note(`skip ${m.filename}: file not in export`)
      continue
    }

    if (DRY) {
      mediaIdMap.set(m.id, -created - 1) // placeholder
      created++
      continue
    }

    const doc = await payload.create({
      collection: 'media',
      data: {
        alt: m.alt ?? m.filename,
        ...(m.createdAt ? { createdAt: m.createdAt } : {}),
        ...(m.updatedAt ? { updatedAt: m.updatedAt } : {}),
      },
      file: {
        name: m.filename,
        data,
        size: data.byteLength,
        mimetype: m.mimeType ?? 'application/octet-stream',
      },
      overrideAccess: true,
      draft: false,
    })
    mediaIdMap.set(m.id, (doc as { id: number }).id)
    created++
    if (created % 10 === 0) log(`  media: ${created}/${manifest.length}`)
  }
  return created
}

type SlugDoc = { id: number; slug: string }

async function importSimple<T extends Record<string, unknown>>(
  payload: Payload,
  collection: CollectionSlug,
  file: string,
  onImport?: (doc: T, created: { id: number; slug?: string }) => void,
) {
  const docs = await readJson<T[]>(`collections/${file}.json`)
  if (!docs) {
    note(`no collections/${file}.json — skipping`)
    return 0
  }

  if (MODE === 'replace') {
    const wiped = await wipeCollection(payload, collection)
    note(`wiped ${wiped} existing ${collection}`)
  }

  let created = 0
  for (const doc of docs) {
    const { id: oldId, createdAt, updatedAt, ...rest } = doc as T & {
      id: number
      createdAt?: string
      updatedAt?: string
    }

    if (DRY) {
      created++
      continue
    }

    const body = {
      ...rest,
      ...(createdAt ? { createdAt } : {}),
      ...(updatedAt ? { updatedAt } : {}),
    }
    const saved = await payload.create({
      collection,
      data: body,
      overrideAccess: true,
      draft: false,
    })
    const slim = { id: (saved as { id: number }).id, slug: (saved as { slug?: string }).slug }
    onImport?.(doc, slim)
    created++
  }
  return created
}

// --- main ---

async function main() {
  log(`in:   ${IN}`)
  log(`mode: ${MODE}`)
  log(`dry:  ${DRY}`)
  if (ONLY) log(`only: ${[...ONLY].join(', ')}`)

  const payload = await getPayload({ config: await configPromise })

  const report: Record<string, number> = {}

  if (shouldRun('media')) {
    log('\n→ media')
    report.media = await importMedia(payload)
  }

  if (shouldRun('categories')) {
    log('\n→ categories')
    report.categories = await importSimple(payload, 'categories', 'categories', (old, s) => {
      const o = old as unknown as SlugDoc
      categoryIdMap.set(o.id, s.id)
      if (o.slug) categoryIdBySlug.set(o.slug, s.id)
    })
  }

  if (shouldRun('tags')) {
    log('\n→ tags')
    report.tags = await importSimple(payload, 'tags', 'tags', (old, s) => {
      const o = old as unknown as SlugDoc
      tagIdMap.set(o.id, s.id)
      if (o.slug) tagIdBySlug.set(o.slug, s.id)
    })
  }

  if (shouldRun('brands')) {
    log('\n→ brands')
    const docs = await readJson<Array<Record<string, unknown> & { id: number; image?: number }>>(
      'collections/brands.json',
    )
    if (docs) {
      if (MODE === 'replace') await wipeCollection(payload, 'brands')
      let created = 0
      for (const doc of docs) {
        const { id: _oldId, image, createdAt, updatedAt, ...rest } = doc
        const newImageId = typeof image === 'number' ? mediaIdMap.get(image) : undefined
        if (!newImageId) {
          note(`skip brand "${rest.name}": missing/unresolved image ref`)
          continue
        }
        if (DRY) {
          created++
          continue
        }
        await payload.create({
          collection: 'brands',
          data: {
            ...rest,
            image: newImageId,
            ...(createdAt ? { createdAt } : {}),
            ...(updatedAt ? { updatedAt } : {}),
          } as Record<string, unknown>,
          overrideAccess: true,
          draft: false,
        })
        created++
      }
      report.brands = created
    }
  }

  if (shouldRun('projects')) {
    log('\n→ projects')
    const docs = await readJson<Array<Record<string, unknown> & { id: number; cover?: number }>>(
      'collections/projects.json',
    )
    if (docs) {
      if (MODE === 'replace') await wipeCollection(payload, 'projects')
      let created = 0
      for (const doc of docs) {
        const { id: _oldId, cover, createdAt, updatedAt, ...rest } = doc
        const newCoverId = typeof cover === 'number' ? mediaIdMap.get(cover) : cover
        if (DRY) {
          created++
          continue
        }
        await payload.create({
          collection: 'projects',
          data: {
            ...rest,
            ...(newCoverId ? { cover: newCoverId } : {}),
            ...(createdAt ? { createdAt } : {}),
            ...(updatedAt ? { updatedAt } : {}),
          } as Record<string, unknown>,
          overrideAccess: true,
          draft: false,
        })
        created++
      }
      report.projects = created
    }
  }

  if (shouldRun('services')) {
    log('\n→ services')
    const docs = await readJson<
      Array<Record<string, unknown> & { id: number; category?: number; tags?: number[] }>
    >('collections/services.json')
    if (docs) {
      if (MODE === 'replace') await wipeCollection(payload, 'services')
      let created = 0
      for (const doc of docs) {
        const { id: _oldId, category, tags, createdAt, updatedAt, ...rest } = doc
        const newCatId = typeof category === 'number' ? categoryIdMap.get(category) : undefined
        if (!newCatId) {
          note(`skip service "${rest.slug}": unresolved category ref (${category})`)
          continue
        }
        const newTagIds = Array.isArray(tags)
          ? tags.map((t) => tagIdMap.get(t as number)).filter(Boolean)
          : []
        if (DRY) {
          created++
          continue
        }
        await payload.create({
          collection: 'services',
          data: {
            ...rest,
            category: newCatId,
            tags: newTagIds,
            ...(createdAt ? { createdAt } : {}),
            ...(updatedAt ? { updatedAt } : {}),
          } as Record<string, unknown>,
          overrideAccess: true,
          draft: false,
        })
        created++
      }
      report.services = created
    }
  }

  if (shouldRun('partners')) {
    log('\n→ partners')
    const docs = await readJson<Array<Record<string, unknown> & { id: number; image?: number }>>(
      'collections/partners.json',
    )
    if (docs) {
      if (MODE === 'replace') await wipeCollection(payload, 'partners')
      let created = 0
      for (const doc of docs) {
        const { id: _oldId, image, createdAt, updatedAt, ...rest } = doc
        const newImageId = typeof image === 'number' ? mediaIdMap.get(image) : undefined
        if (DRY) {
          created++
          continue
        }
        await payload.create({
          collection: 'partners',
          data: {
            ...rest,
            ...(newImageId ? { image: newImageId } : {}),
            ...(createdAt ? { createdAt } : {}),
            ...(updatedAt ? { updatedAt } : {}),
          } as Record<string, unknown>,
          overrideAccess: true,
          draft: false,
        })
        created++
      }
      report.partners = created
    }
  }

  if (shouldRun('globals')) {
    log('\n→ globals')
    for (const slug of ['rate-card-settings', 'email-settings'] as const) {
      const doc = await readJson<Record<string, unknown>>(`globals/${slug}.json`)
      if (!doc) {
        note(`no globals/${slug}.json — skipping`)
        continue
      }
      const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = doc as Record<string, unknown>
      if (DRY) {
        report[`global:${slug}`] = 1
        continue
      }
      await payload.updateGlobal({
        slug,
        data: rest as Record<string, unknown>,
        overrideAccess: true,
      })
      report[`global:${slug}`] = 1
    }
  }

  log('\ndone. counts:', report)
  process.exit(0)
}

main().catch((err) => {
  console.error('[import] failed:', err)
  process.exit(1)
})
