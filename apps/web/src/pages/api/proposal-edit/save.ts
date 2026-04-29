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

// Try import.meta.env first (Vite/Astro convention) then process.env
// (Node-style fallback). Astro 5 exposes both server-side, but the
// behaviour can vary slightly under different adapters.
const readEnv = (name: string): string | undefined => {
  const fromMeta = (import.meta.env as Record<string, string | undefined>)[name]
  if (fromMeta) return fromMeta
  if (typeof process !== 'undefined' && process.env) return process.env[name]
  return undefined
}

async function getDevAdminCookie(): Promise<string | null> {
  if (!import.meta.env.DEV) {
    console.warn('[proposal-edit] not in DEV mode; skipping login fallback')
    return null
  }
  if (cachedDevCookie) return cachedDevCookie
  const email = readEnv('PAYLOAD_DEV_EMAIL')
  const password = readEnv('PAYLOAD_DEV_PASSWORD')
  if (!email || !password) {
    console.warn(
      '[proposal-edit] PAYLOAD_DEV_EMAIL/PAYLOAD_DEV_PASSWORD not set in apps/web/.env; cannot fall back',
    )
    return null
  }
  try {
    const res = await fetch(`${CMS_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      console.warn(
        `[proposal-edit] dev login failed: ${res.status} ${res.statusText} — ${await res.text()}`,
      )
      return null
    }
    // Read the JWT directly from the response body and build the cookie
    // ourselves. Avoids set-cookie parsing issues (multiple cookies, attribute
    // ordering) that can mangle the value when forwarded to the next request.
    const data = (await res.json()) as { token?: string; user?: { id: number | string } }
    if (!data.token) {
      console.warn('[proposal-edit] dev login response had no token in body')
      return null
    }
    cachedDevCookie = `payload-token=${data.token}`
    console.log(
      `[proposal-edit] dev login ok as user #${data.user?.id ?? '?'}; cached token`,
    )

    // Verify the cookie actually authenticates by calling /api/users/me.
    try {
      const me = await fetch(`${CMS_URL}/api/users/me`, {
        headers: { cookie: cachedDevCookie },
      })
      const meBody = (await me.json()) as { user?: { id?: number | string } | null }
      if (!me.ok || !meBody.user) {
        console.warn(
          `[proposal-edit] cookie didn't authenticate /api/users/me — ${me.status}, body: ${JSON.stringify(meBody)}`,
        )
      } else {
        console.log(`[proposal-edit] cookie verified — /api/users/me returns user #${meBody.user.id}`)
      }
    } catch (e) {
      console.warn('[proposal-edit] /api/users/me verification threw', e)
    }

    return cachedDevCookie
  } catch (err) {
    console.error('[proposal-edit] dev login threw:', err)
    return null
  }
}

const patchProposal = (
  id: string | number,
  patch: unknown,
  cookie: string | null,
  origin: string,
) =>
  fetch(`${CMS_URL}/api/proposals/${id}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      // Server-to-server fetch doesn't auto-set Origin, but Payload's CSRF
      // protection (csrf: [WEB_URL]) checks Origin/Referer for cookie-auth
      // mutations. Use the actual request's origin so it matches the CMS's
      // allowlist on every env (dev/test/live), not a stale env-var default.
      origin,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(patch),
  })

export const POST = async ({ request, url }: APIContext): Promise<Response> => {
  const userCookie = request.headers.get('cookie')
  // Use the actual incoming request's origin for the CMS CSRF check.
  const origin = url.origin

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
    let res = await patchProposal(id, patch, userCookie, origin)

    if ((res.status === 401 || res.status === 403) && import.meta.env.DEV) {
      console.warn(
        `[proposal-edit] user-cookie patch returned ${res.status}; trying dev login fallback`,
      )
      const devCookie = await getDevAdminCookie()
      if (devCookie) {
        // Drain the first response body so the connection can be reused.
        await res.text()
        res = await patchProposal(id, patch, devCookie, origin)
        if (!res.ok) {
          console.warn(
            `[proposal-edit] retry with dev cookie also failed: ${res.status} ${res.statusText}`,
          )
        }
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
