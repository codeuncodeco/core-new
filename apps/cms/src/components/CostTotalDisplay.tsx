'use client'

import { useField } from '@payloadcms/ui'

type CostItem = { item?: string; amount?: number | string | null }

const formatINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`

// Live-sum readout for the costItems array. Subscribes to the field via
// useField({ path: 'costItems' }) so it re-renders as the user types in
// any row's amount — no save round-trip.
export const CostTotalDisplay = () => {
  const { value } = useField<CostItem[]>({ path: 'costItems' })
  const items = Array.isArray(value) ? value : []
  const total = items.reduce((sum, row) => {
    const raw = row?.amount
    const n = typeof raw === 'number' ? raw : Number(raw ?? 0)
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0)

  return (
    <div
      style={{
        marginTop: '0.25rem',
        marginBottom: '1.5rem',
        padding: '0.6rem 0.9rem',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 6,
        background: 'var(--theme-elevation-50)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      <span style={{ fontSize: '0.85rem', color: 'var(--theme-elevation-500)' }}>
        Live total — paste this into the "Total Cost" summary card
      </span>
      <strong
        style={{
          fontSize: '1.15rem',
          fontFamily: 'var(--font-mono, monospace)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatINR(total)}
      </strong>
    </div>
  )
}

export default CostTotalDisplay
