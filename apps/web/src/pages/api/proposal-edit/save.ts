// Save endpoint for the in-place editor. Forwards the editor's auth cookie
// to the CMS so Payload's collection access rules enforce auth there.
//
// Body: { id: string | number, patch: Record<string, unknown> }
// Sends a PATCH /api/proposals/<id> with the patch as the body.
export const prerender = false

import type { APIContext } from 'astro'

const CMS_URL = import.meta.env.PUBLIC_CMS_URL || 'http://localhost:3000'

export const POST = async ({ request }: APIContext): Promise<Response> => {
  const cookie = request.headers.get('cookie')

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
    const res = await fetch(`${CMS_URL}/api/proposals/${id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(patch),
    })
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
