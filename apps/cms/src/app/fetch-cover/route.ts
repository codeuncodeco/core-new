import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { fetchOgImage } from '@/lib/fetchOgImage'

export const POST = async (request: Request) => {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  let projectId: string | number | null = null
  try {
    const body = (await request.json()) as { projectId?: string | number } | null
    projectId = body?.projectId ?? null
  } catch {
    return Response.json({ error: 'bad json' }, { status: 400 })
  }
  if (!projectId) {
    return Response.json({ error: 'projectId required' }, { status: 400 })
  }

  const project = (await payload.findByID({
    collection: 'projects',
    id: projectId,
    depth: 0,
  })) as { id: number; slug: string; title: string; url?: string | null }

  if (!project.url) {
    return Response.json(
      { error: 'project has no url to fetch from' },
      { status: 400 },
    )
  }

  const og = await fetchOgImage(project.url)
  if (!og) {
    return Response.json(
      { error: `no og:image found on ${project.url}` },
      { status: 404 },
    )
  }

  const media = (await payload.create({
    collection: 'media',
    data: { alt: `${project.title} cover` },
    file: {
      data: og.buffer,
      mimetype: og.mime || `image/${og.ext}`,
      name: `${project.slug}.${og.ext}`,
      size: og.buffer.length,
    },
    overrideAccess: true,
  })) as { id: number }

  await payload.update({
    collection: 'projects',
    id: project.id,
    data: { cover: media.id },
    overrideAccess: true,
  })

  return Response.json({
    ok: true,
    sourceUrl: og.sourceUrl,
    mediaId: media.id,
  })
}
