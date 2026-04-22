const UA =
  'Mozilla/5.0 (compatible; CodeUncodeOGBot/1.0; +https://codeuncode.com)'

const pickMeta = (html: string, key: string): string | null => {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
    'i',
  )
  return html.match(re)?.[1] ?? null
}

export const extFromMime = (mime: string): string => {
  if (!mime) return 'jpg'
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('svg')) return 'svg'
  if (mime.includes('gif')) return 'gif'
  if (mime.includes('avif')) return 'avif'
  return 'jpg'
}

export type FetchedOg = {
  buffer: Buffer
  mime: string
  ext: string
  sourceUrl: string
}

export const fetchOgImage = async (siteUrl: string): Promise<FetchedOg | null> => {
  const res = await fetch(siteUrl, {
    headers: { 'user-agent': UA, accept: 'text/html' },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`site fetch failed: ${res.status} ${res.statusText}`)
  const html = await res.text()
  const raw =
    pickMeta(html, 'og:image') ||
    pickMeta(html, 'og:image:url') ||
    pickMeta(html, 'twitter:image') ||
    pickMeta(html, 'twitter:image:src')
  if (!raw) return null

  const imageUrl = new URL(raw, siteUrl).toString()
  const imgRes = await fetch(imageUrl, {
    headers: { 'user-agent': UA },
    redirect: 'follow',
  })
  if (!imgRes.ok) throw new Error(`image fetch failed: ${imgRes.status}`)
  const mime = imgRes.headers.get('content-type') || ''
  const ab = await imgRes.arrayBuffer()
  return {
    buffer: Buffer.from(ab),
    mime,
    ext: extFromMime(mime),
    sourceUrl: imageUrl,
  }
}
