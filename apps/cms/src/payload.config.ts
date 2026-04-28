import fs from 'fs'
import path from 'path'
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import { CloudflareContext, getCloudflareContext } from '@opennextjs/cloudflare'
import { GetPlatformProxyOptions } from 'wrangler'
import { r2Storage } from '@payloadcms/storage-r2'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Tags } from './collections/Tags'
import { Services } from './collections/Services'
import { Projects } from './collections/Projects'
import { Brands } from './collections/Brands'
import { Partners } from './collections/Partners'
import { ContactSubmissions } from './collections/ContactSubmissions'
import { Clients } from './collections/Clients'
import { Proposals } from './collections/Proposals'
import { RateCardSettings } from './globals/RateCardSettings'
import { EmailSettings } from './globals/EmailSettings'
import { resendAdapter } from './email/resend'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const realpath = (value: string) => (fs.existsSync(value) ? fs.realpathSync(value) : undefined)

// Matches the `payload` bin, and any script run from scripts/migration/* via
// tsx — both need the wrangler platform proxy (with remote bindings in
// production) instead of OpenNext's Next.js-only Cloudflare context.
const isCLI = process.argv.some((value) => {
  const rp = realpath(value)
  if (!rp) return false
  return (
    rp.endsWith(path.join('payload', 'bin.js')) ||
    rp.includes(path.join('scripts', 'migration'))
  )
})
const isProduction = process.env.NODE_ENV === 'production'

const createLog =
  (level: string, fn: typeof console.log) => (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      fn(JSON.stringify({ level, msg: objOrMsg }))
    } else {
      fn(JSON.stringify({ level, ...objOrMsg, msg: msg ?? (objOrMsg as { msg?: string }).msg }))
    }
  }

const cloudflareLogger = {
  level: process.env.PAYLOAD_LOG_LEVEL || 'info',
  trace: createLog('trace', console.debug),
  debug: createLog('debug', console.debug),
  info: createLog('info', console.log),
  warn: createLog('warn', console.warn),
  error: createLog('error', console.error),
  fatal: createLog('fatal', console.error),
  silent: () => {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

const cloudflare =
  isCLI || !isProduction
    ? await getCloudflareContextFromWrangler()
    : await getCloudflareContext({ async: true })

export default buildConfig({
  // Absolute base for admin URLs in system emails (reset password, verify).
  // Without this, Payload falls back to req.host only when it's in the
  // CORS/CSRF allowlist — otherwise emits path-only URLs that mail clients
  // mangle into `https://admin/reset/<token>`.
  serverURL: process.env.CMS_URL || 'http://localhost:3000',
  cors: [process.env.WEB_URL || 'http://localhost:4321'],
  csrf: [process.env.WEB_URL || 'http://localhost:4321'],
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Categories, Tags, Services, Projects, Brands, Partners, ContactSubmissions, Clients, Proposals],
  globals: [RateCardSettings, EmailSettings],
  email: resendAdapter(),
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteD1Adapter({
    binding: cloudflare.env.D1,
    // Prod uses migrations only; local dev (miniflare) auto-syncs schema via push.
    push: process.env.NODE_ENV !== 'production',
  }),
  logger: isProduction ? cloudflareLogger : undefined,
  plugins: [
    r2Storage({
      bucket: cloudflare.env.R2,
      collections: { media: true },
    }),
  ],
})

// Adapted from https://github.com/opennextjs/opennextjs-cloudflare/blob/d00b3a13e42e65aad76fba41774815726422cc39/packages/cloudflare/src/api/cloudflare-context.ts#L328C36-L328C46
function getCloudflareContextFromWrangler(): Promise<CloudflareContext> {
  return import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`).then(
    ({ getPlatformProxy }) =>
      getPlatformProxy({
        environment: process.env.CLOUDFLARE_ENV,
        remoteBindings: isProduction,
      } satisfies GetPlatformProxyOptions),
  )
}
