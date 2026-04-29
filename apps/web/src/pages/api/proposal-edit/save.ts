// Save endpoint for the in-place editor. Forwards the editor's auth cookie
// to the CMS so Payload's collection access rules enforce auth there.
//
// Body: { id: string | number, patch: Record<string, unknown> }
// Sends a PATCH /api/proposals/<id> with the patch as the body.
//
// Local-dev fallback: localhost:4321 and localhost:3000 don't share cookies.
// If the user-cookie patch is rejected with 401/403 AND we're in dev mode,
// the endpoint logs in once with PAYLOAD_DEV_EMAIL / PAYLOAD_DEV_PASSWORD
// (set in apps/web/.env) and retries with that cookie. Cached for the life
// of the worker process. Production never falls back — the user-cookie path
// is the only path.
export const prerender = false

import type { APIContext } from 'astro'

const CMS_URL = import.meta.env.PUBLIC_CMS_URL || 'http://localhost:3000'

let cachedDevCookie: string | null = null

async function getDevAdminCookie(): Promise<string | null> {
  if (!import.meta.env.DEV) return null
  if (cachedDevCookie) return cachedDevCookie
  const email = import.meta.env.PAYLOAD_DEV_EMAIL
  const password = import.meta.env.PAYLOAD_DEV_PASSWORD
  if (!email || !password) return null
  try {
    const res = await fetch(`${CMS_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) return null
    const setCookie = res.headers.get('set-cookie')
    if (!setCookie) return null
    // Use just the "name=value" portion before the first attribute separator.
    cachedDevCookie = setCookie.split(';')[0] ?? null
    return cachedDevCookie
  } catch {
    return null
  }
}

const patchProposal = (id: string | number, patch: unknown, cookie: string | null) =>
  fetch(`${CMS_URL}/api/proposals/${id}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(patch),
  })

export const POST = async ({ request }: APIContext): Promise<Response> => {
  const userCookie = request.headers.get('cookie')

  type SaveBody = { id?: string | number; patch?: Record<string, unknown> }
  let body: SaveBody | null = null
  try {
    body = (await request.json()) as SaveBody
  } catch {
    return Response.json({ error: 'bad json' }, { status: 400 })
  }
  const id = body?.id
  const patch = body?.patch
  if (!id || !patch || typeof patch !== 'object') {
    return Response.json({ error: 'id and patch required' }, { status: 400 })
  }

  try {
    let res = await patchProposal(id, patch, userCookie)

    if ((res.status === 401 || res.status === 403) && import.meta.env.DEV) {
      const devCookie = await getDevAdminCookie()
      if (devCookie) {
        // Drain the first response body so the connection can be reused.
        await res.text()
        res = await patchProposal(id, patch, devCookie)
      }
    }

    const text = await res.text()
    return new Response(text, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
    })
  } catch (err) {
    return Response.json(
      { error: 'cms unreachable', detail: (err as Error).message },
      { status: 502 },
    )
  }
}
