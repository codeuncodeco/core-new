#!/usr/bin/env node
/**
 * Export content from old-core prod.
 *
 * Hits https://cms.codeuncode.com (or --source) public REST API, paginates
 * each published collection + globals, downloads media files. Writes everything
 * under migration/export/ at the repo root. No auth needed — public endpoints
 * return only published docs, which is what we want.
 *
 * Usage:
 *   node apps/cms/scripts/migration/export-old.mjs
 *   node apps/cms/scripts/migration/export-old.mjs --source=https://cms.codeuncode.com
 *   node apps/cms/scripts/migration/export-old.mjs --dry-run
 *
 * Flags:
 *   --source=<url>   Base URL of the source CMS. Default: https://cms.codeuncode.com
 *   --out=<path>     Output dir, absolute or relative to CWD. Default: migration/export
 *   --dry-run        Print what would be fetched + written, touch nothing
 *   --only=<slugs>   Comma-separated list. Default: everything.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

const SOURCE = (args.source ?? 'https://cms.codeuncode.com').replace(/\/+$/, '')
const OUT = path.isAbsolute(args.out ?? '')
  ? args.out
  : path.join(repoRoot, args.out ?? 'migration/export')
const DRY = args['dry-run'] === 'true' || args['dry-run'] === ''
const ONLY = args.only ? new Set(args.only.split(',').map((s) => s.trim())) : null

const PAGE_DELAY_MS = 300
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const log = (...a) => console.log('[export]', ...a)
const note = (...a) => console.log('         ', ...a)

// Partners intentionally omitted — not deployed to old-core prod yet.
// Partners in new-core can be seeded via /seed?only=partners after import.
const COLLECTIONS = ['categories', 'tags', 'services', 'projects', 'brands']
const GLOBALS = ['rate-card-settings', 'email-settings']

const shouldRun = (name) => !ONLY || ONLY.has(name)

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} → ${res.status} ${res.statusText}`)
  return res.json()
}

async function fetchAll(collection) {
  const docs = []
  let page = 1
  while (true) {
    const url = `${SOURCE}/api/${collection}?limit=500&depth=0&page=${page}`
    if (DRY) {
      note(`would GET ${url}`)
      break
    }
    const body = await fetchJson(url)
    docs.push(...body.docs)
    if (!body.hasNextPage) break
    page++
    await sleep(PAGE_DELAY_MS)
  }
  return docs
}

async function writeJson(rel, data) {
  const full = path.join(OUT, rel)
  if (DRY) {
    note(`would write ${full} (${Array.isArray(data) ? data.length + ' items' : 'object'})`)
    return
  }
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.writeFile(full, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

async function downloadMediaFile(url, filename) {
  const target = path.join(OUT, 'media/files', filename)
  if (DRY) {
    note(`would download ${url} → ${target}`)
    return
  }
  await fs.mkdir(path.dirname(target), { recursive: true })
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} → ${res.status} ${res.statusText}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await fs.writeFile(target, buf)
}

async function main() {
  log(`source: ${SOURCE}`)
  log(`out:    ${OUT}`)
  log(`dry:    ${DRY}`)
  if (ONLY) log(`only:   ${[...ONLY].join(', ')}`)

  const counts = {}

  for (const slug of COLLECTIONS) {
    if (!shouldRun(slug)) continue
    log(`\nfetching ${slug}...`)
    const docs = await fetchAll(slug)
    await writeJson(`collections/${slug}.json`, docs)
    counts[slug] = docs.length
    log(`  ${docs.length} docs`)
    await sleep(PAGE_DELAY_MS)
  }

  for (const slug of GLOBALS) {
    if (!shouldRun(slug)) continue
    log(`\nfetching global ${slug}...`)
    try {
      const doc = await fetchJson(`${SOURCE}/api/globals/${slug}?depth=0`)
      await writeJson(`globals/${slug}.json`, doc)
      counts[`global:${slug}`] = 1
    } catch (err) {
      log(`  ${slug}: ${err.message} — skipping`)
    }
    await sleep(PAGE_DELAY_MS)
  }

  if (shouldRun('media')) {
    log(`\nfetching media manifest...`)
    const media = await fetchAll('media')
    await writeJson('media/manifest.json', media)
    counts.media = media.length
    log(`  ${media.length} docs`)

    log(`\ndownloading ${media.length} media files...`)
    for (let i = 0; i < media.length; i++) {
      const m = media[i]
      if (!m.url || !m.filename) {
        log(`  [${i + 1}] missing url/filename — skipping: ${m.id}`)
        continue
      }
      const url = m.url.startsWith('http') ? m.url : `${SOURCE}${m.url}`
      try {
        await downloadMediaFile(url, m.filename)
        if ((i + 1) % 10 === 0) log(`  [${i + 1}/${media.length}] ${m.filename}`)
      } catch (err) {
        log(`  [${i + 1}] ${m.filename}: ${err.message}`)
      }
      await sleep(50)
    }
  }

  await writeJson('meta.json', {
    exportedAt: new Date().toISOString(),
    source: SOURCE,
    counts,
    note: 'Generated by apps/cms/scripts/migration/export-old.mjs',
  })

  log(`\ndone. counts:`, counts)
}

main().catch((err) => {
  console.error('[export] failed:', err)
  process.exit(1)
})
