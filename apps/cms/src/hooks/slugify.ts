import type { FieldHook } from 'payload'

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const slugifyFrom =
  (sourceField: string): FieldHook =>
  ({ value, data }) => {
    if (typeof value === 'string' && value.trim().length > 0) return toSlug(value)
    const src = data?.[sourceField]
    if (typeof src === 'string' && src.trim().length > 0) return toSlug(src)
    return value
  }
