import type { CollectionConfig, FieldHook } from 'payload'

const deriveCookieDomain = (): string | undefined => {
  const cmsUrl = process.env.CMS_URL
  if (!cmsUrl) return undefined
  try {
    const host = new URL(cmsUrl).hostname
    if (host === 'codeuncode.com' || host.endsWith('.codeuncode.com')) {
      return '.codeuncode.com'
    }
    return undefined
  } catch {
    return undefined
  }
}

// Derive a default firstName from the email's local part when blank, e.g.
// "sm@gmail.com" → "sm". Lets us keep firstName required without forcing
// users to type it on every account creation.
const deriveFromEmail: FieldHook = ({ value, data }) => {
  if (typeof value === 'string' && value.trim().length > 0) return value
  const email = (data as { email?: string } | undefined)?.email
  if (typeof email === 'string') {
    const local = email.split('@')[0]?.trim()
    if (local) return local
  }
  return value
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    // Scope the auth cookie to the parent domain on any codeuncode.com
    // deployment so the web app at e.g. dev.codeuncode.com can forward it
    // upstream to cms-dev.codeuncode.com (used by SSR preview/edit routes
    // to authenticate draft content + save requests). In local dev we
    // leave it undefined so the default localhost-scoped cookie works.
    //
    // Derived from CMS_URL (a wrangler var) rather than NODE_ENV — NODE_ENV
    // can be unset on Cloudflare Workers depending on how the runtime is
    // started, while CMS_URL is reliably set per env.
    cookies: {
      domain: deriveCookieDomain(),
    },
  },
  fields: [
    // Email added by default
    {
      name: 'firstName',
      type: 'text',
      required: true,
      admin: { description: 'Auto-derived from the email when left blank (e.g. "sm@example.com" → "sm").' },
      hooks: { beforeValidate: [deriveFromEmail] },
    },
    { name: 'lastName', type: 'text' },
  ],
}
