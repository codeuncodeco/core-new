import type { CollectionConfig, FieldHook } from 'payload'

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
    // Scope the auth cookie to the parent domain in prod so the web app at
    // `codeuncode.com` can forward it on upstream fetches to `cms.codeuncode.com`
    // (used by SSR preview routes to authenticate draft content requests).
    // In local dev we leave domain undefined so the default localhost-scoped
    // cookie works across ports.
    cookies: {
      domain: process.env.NODE_ENV === 'production' ? '.codeuncode.com' : undefined,
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
