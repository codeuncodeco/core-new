import configPromise from '@payload-config'
import { getPayload } from 'payload'
import type { Proposal } from '@/payload-types'

export const POST = async (request: Request) => {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  let proposalId: string | number | null = null
  try {
    const body = (await request.json()) as { proposalId?: string | number } | null
    proposalId = body?.proposalId ?? null
  } catch {
    return Response.json({ error: 'bad json' }, { status: 400 })
  }
  if (!proposalId) {
    return Response.json({ error: 'proposalId required' }, { status: 400 })
  }

  const source = (await payload.findByID({
    collection: 'proposals',
    id: proposalId,
    depth: 0,
  })) as Proposal

  const stamp = Math.random().toString(36).slice(2, 8)
  const today = new Date().toISOString().slice(0, 10)

  // Strip the auto-generated/lifecycle fields; keep everything else.
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    sentAt: _sentAt,
    sentTo: _sentTo,
    sentMethod: _sentMethod,
    lastContactAt: _lastContactAt,
    respondedAt: _respondedAt,
    attachedPdf: _attachedPdf,
    notes: _notes,
    status: _status,
    internalTitle,
    urlSlug,
    proposalDate: _proposalDate,
    ...rest
  } = source

  const data = {
    ...rest,
    internalTitle: internalTitle ? `${internalTitle} (copy)` : 'Untitled (copy)',
    urlSlug: `${urlSlug ?? 'proposal'}-copy-${stamp}`,
    proposalDate: today,
    status: 'draft' as const,
  }

  const created = (await payload.create({
    collection: 'proposals',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: data as any,
    overrideAccess: true,
    user,
  })) as { id: string | number }

  return Response.json({ ok: true, newId: created.id })
}
