import type { Service } from '@cms/payload-types'

export type Price = NonNullable<Service['prices']>[number]

export type PriceSummary =
  | { kind: 'rows'; rows: Price[] }
  | { kind: 'range'; min: number; max: number; suffix?: string }

export const summarizePrices = (prices: Service['prices']): PriceSummary => {
  const rows = prices ?? []
  if (rows.length <= 2) return { kind: 'rows', rows }

  const amounts = rows.map((r) => r.amount)
  const min = Math.min(...amounts)
  const max = Math.max(...amounts)

  const suffixes = new Set(rows.map((r) => r.suffix).filter(Boolean))
  const suffix =
    suffixes.size === 1 ? (rows[0]?.suffix ?? undefined) : undefined

  return { kind: 'range', min, max, suffix }
}
