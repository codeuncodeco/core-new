import type { CollectionConfig } from 'payload'

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
    // Add more fields as needed
  ],
}
