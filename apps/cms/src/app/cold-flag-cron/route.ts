import configPromise from '@payload-config'
import { getPayload } from 'payload'

// Endpoint to flip stale proposals from `sent` → `cold`.
//
// Auth: shared secret. Pass it as `Authorization: Bearer <CRON_SECRET>` so a
// Cloudflare Cron Trigger (or any external scheduler) can call this without
// going through Payload's user-session auth.
//
// Wiring a Cron Trigger:
//   1. Set CRON_SECRET in the wrangler env (`vars` or as a secret).
//   2. Add a daily `triggers.crons` entry to apps/cms/wrangler.jsonc (e.g.
//      ["0 4 * * *"] for 4am UTC daily).
//   3. The OpenNext-generated worker exposes `scheduled` indirectly; the
//      easiest path is to invoke this route via a tiny separate Worker on
//      the same account, or set up a scheduled fetch from outside.
//
// For local testing: curl with -H "authorization: Bearer <secret>".
export const POST = async (request: Request) => {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return Response.json(
      { error: 'CRON_SECRET not configured on the server' },
      { status: 500 },
    )
  }
  const auth = request.headers.get('authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(auth)
  if (!match || match[1] !== expected) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config: configPromise })

  // 21 days of silence flips a sent proposal to cold.
  const STALE_AFTER_DAYS = 21
  const cutoff = new Date(Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const stale = await payload.find({
    collection: 'proposals',
    where: {
      and: [
        { status: { equals: 'sent' } },
        { lastContactAt: { less_than: cutoff } },
      ],
    },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })

  const flipped: (string | number)[] = []
  for (const doc of stale.docs) {
    const id = (doc as { id: string | number }).id
    await payload.update({
      collection: 'proposals',
      id,
      data: { status: 'cold' },
      overrideAccess: true,
    })
    flipped.push(id)
  }

  return Response.json({ ok: true, flipped: flipped.length, ids: flipped, cutoff })
}

// Allow GET as well so a Cloudflare Cron Trigger pointed at this URL via the
// dashboard "Trigger via fetch" option works too.
export const GET = POST
