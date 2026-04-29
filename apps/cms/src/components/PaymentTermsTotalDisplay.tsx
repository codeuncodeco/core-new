'use client'

import { useField } from '@payloadcms/ui'

type Row = { milestone?: string; sharePercent?: number | string | null }

const round2 = (n: number): number => Number(n.toFixed(2))

// Live indicator under the paymentTerms array. Shows the running total and
// goes red when the percentages don't sum to 100. The hard validation is
// still enforced on save; this just gives immediate feedback while editing.
export const PaymentTermsTotalDisplay = () => {
  const { value } = useField<Row[]>({ path: 'paymentTerms' })
  const items = Array.isArray(value) ? value : []

  // Empty array is valid (the section is just skipped in the renderer) — show
  // a neutral hint rather than an error.
  if (items.length === 0) {
    return (
      <div
        style={{
          marginTop: '0.25rem',
          marginBottom: '1.5rem',
          padding: '0.6rem 0.9rem',
          border: '1px dashed var(--theme-elevation-150)',
          borderRadius: 6,
          background: 'var(--theme-elevation-50)',
          fontSize: '0.85rem',
          color: 'var(--theme-elevation-500)',
        }}
      >
        Optional. If you add rows, the share percents must add up to 100%.
      </div>
    )
  }

  const sum = items.reduce((acc, row) => {
    const n = Number(row?.sharePercent ?? 0)
    return acc + (Number.isFinite(n) ? n : 0)
  }, 0)
  const total = round2(sum)
  const diff = round2(100 - total)
  const ok = Math.abs(diff) < 0.01

  const accentColor = ok ? 'var(--theme-success-500, #16a34a)' : 'var(--theme-error-500, #dc2626)'

  return (
    <div
      style={{
        marginTop: '0.25rem',
        marginBottom: '1.5rem',
        padding: '0.6rem 0.9rem',
        border: `1px solid ${accentColor}`,
        borderRadius: 6,
        background: 'var(--theme-elevation-50)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      <span style={{ fontSize: '0.85rem', color: 'var(--theme-elevation-600)' }}>
        {ok
          ? 'Total adds up to 100%.'
          : diff > 0
            ? `Total is ${total}% — short by ${diff}%.`
            : `Total is ${total}% — over by ${round2(-diff)}%.`}
      </span>
      <strong
        style={{
          fontSize: '1.05rem',
          color: accentColor,
          fontFamily: 'var(--font-mono, monospace)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {total}%
      </strong>
    </div>
  )
}

export default PaymentTermsTotalDisplay
