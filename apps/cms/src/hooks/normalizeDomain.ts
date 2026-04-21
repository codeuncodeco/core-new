import type { FieldHook } from 'payload'

export const normalizeDomain: FieldHook = ({ value }) => {
  if (typeof value !== 'string') return value
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^\/\//, '')
    .replace(/\/+$/, '')
}
