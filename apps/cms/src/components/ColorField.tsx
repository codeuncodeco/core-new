'use client'

import { useField } from '@payloadcms/ui'

type Props = {
  path: string
  field?: { label?: string }
}

export const ColorField = ({ path, field }: Props) => {
  const { value, setValue } = useField<string>({ path })
  const current = (typeof value === 'string' && value) || '#f97316'

  return (
    <div className="field-type" style={{ marginBottom: '1.5rem' }}>
      <label
        style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontWeight: 600,
          fontSize: '0.875rem',
        }}
      >
        {field?.label || 'Accent Color'}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="color"
          value={current}
          onChange={(e) => setValue(e.target.value)}
          style={{
            width: 48,
            height: 36,
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 4,
            cursor: 'pointer',
            padding: 0,
            background: 'transparent',
          }}
        />
        <input
          type="text"
          value={current}
          onChange={(e) => setValue(e.target.value)}
          style={{
            padding: '0.4rem 0.6rem',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 4,
            background: 'var(--theme-elevation-50)',
            color: 'var(--theme-text)',
            fontFamily: 'var(--font-mono, monospace)',
            flex: 1,
            maxWidth: 160,
          }}
        />
      </div>
    </div>
  )
}

export default ColorField
