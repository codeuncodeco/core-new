'use client'

import { useAllFormFields, useForm } from '@payloadcms/ui'
import { useState } from 'react'

type Author =
  | number
  | string
  | { id?: number | string; email?: string; name?: string }
  | null
  | undefined

type RowData = {
  note?: string
  author?: Author
  createdAt?: string | null
}

type Props = {
  path?: string
  schemaPath?: string
}

const formatTimestamp = (iso: string | null | undefined): string => {
  if (!iso) return 'Just now'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const authorLabel = (a: Author): string => {
  if (!a) return ''
  if (typeof a === 'number' || typeof a === 'string') return `User #${a}`
  return a.name ?? a.email ?? `User #${a.id ?? '?'}`
}

// Replaces the default array-field UI for proposal notes with a chronological
// feed. Existing rows are reconstructed from the form's flat state by
// matching `<arrayPath>.<index>.<subfield>` paths. Adds use addFieldRow with
// subFieldState so the new row is created with its body already populated.
export const NotesFeed = ({ path = 'notes', schemaPath }: Props) => {
  const [fields] = useAllFormFields()
  const { addFieldRow, removeFieldRow } = useForm()
  const [draft, setDraft] = useState('')

  // Reconstruct rows from path → state map.
  const pathPrefix = `${path}.`
  const rows: Map<number, RowData> = new Map()
  for (const [p, state] of Object.entries(fields ?? {})) {
    if (!p.startsWith(pathPrefix)) continue
    const rest = p.slice(pathPrefix.length)
    const m = /^(\d+)\.(.+)$/.exec(rest)
    if (!m) continue
    const idx = Number(m[1])
    const subfield = m[2]
    if (!rows.has(idx)) rows.set(idx, {})
    const entry = rows.get(idx) as Record<string, unknown>
    entry[subfield as string] = (state as { value?: unknown })?.value
  }

  const indices = [...rows.keys()].sort((a, b) => a - b)

  // Display newest first; unsaved rows (no createdAt) sort to the top so
  // they're visible right after the user clicks Add.
  const sorted = indices
    .map((idx) => ({ data: rows.get(idx) as RowData, originalIndex: idx }))
    .sort((a, b) => {
      const aTime = a.data.createdAt ? Date.parse(a.data.createdAt) : Infinity
      const bTime = b.data.createdAt ? Date.parse(b.data.createdAt) : Infinity
      return bTime - aTime
    })

  const addNote = () => {
    const text = draft.trim()
    if (!text) return
    addFieldRow({
      path,
      schemaPath,
      rowIndex: indices.length,
      subFieldState: {
        // Pre-populate the new row's `note` body. author + createdAt are
        // stamped server-side by the proposals beforeChange hook.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        note: { value: text, initialValue: text, valid: true } as any,
      },
    })
    setDraft('')
  }

  const deleteAt = (idx: number) => {
    if (!confirm('Delete this note?')) return
    removeFieldRow({ path, rowIndex: idx })
  }

  return (
    <div className="field-type" style={{ marginBottom: '2rem' }}>
      <label
        style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontWeight: 600,
          fontSize: '0.875rem',
        }}
      >
        Notes
      </label>
      <p
        style={{
          margin: '0 0 0.75rem',
          fontSize: '0.85rem',
          color: 'var(--theme-elevation-500)',
        }}
      >
        Running negotiation/follow-up notes. Author and timestamp are stamped on save.
      </p>

      {/* Composer */}
      <div
        style={{
          padding: '0.75rem',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: 6,
          background: 'var(--theme-elevation-50)',
          marginBottom: '1rem',
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 4,
            background: 'var(--theme-input-bg, white)',
            color: 'var(--theme-text)',
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              addNote()
            }
          }}
        />
        <div
          style={{
            marginTop: '0.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <small style={{ color: 'var(--theme-elevation-500)' }}>⌘/Ctrl + Enter to add</small>
          <button
            type="button"
            onClick={addNote}
            disabled={draft.trim().length === 0}
            style={{
              padding: '0.4rem 0.85rem',
              border: '1px solid currentColor',
              borderRadius: 4,
              background:
                draft.trim().length === 0 ? 'transparent' : 'var(--theme-text)',
              color:
                draft.trim().length === 0
                  ? 'var(--theme-elevation-500)'
                  : 'var(--theme-bg)',
              cursor: draft.trim().length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Add note
          </button>
        </div>
      </div>

      {/* Feed */}
      {sorted.length === 0 ? (
        <p
          style={{
            padding: '1rem',
            border: '1px dashed var(--theme-elevation-150)',
            borderRadius: 6,
            color: 'var(--theme-elevation-500)',
            fontSize: '0.9rem',
            textAlign: 'center',
            margin: 0,
          }}
        >
          No notes yet.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {sorted.map(({ data, originalIndex }, displayIndex) => {
            const isUnsaved = !data.createdAt
            return (
              <li
                key={originalIndex}
                style={{
                  padding: '0.75rem 0.9rem',
                  border: `1px solid var(--theme-elevation-150)`,
                  borderLeftWidth: 3,
                  borderLeftColor: isUnsaved
                    ? 'var(--theme-warning-500, #f59e0b)'
                    : 'var(--theme-elevation-200)',
                  borderRadius: 6,
                  marginBottom: displayIndex < sorted.length - 1 ? '0.5rem' : 0,
                  background: 'var(--theme-elevation-0)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    fontSize: '0.8rem',
                    color: 'var(--theme-elevation-500)',
                    marginBottom: '0.4rem',
                    gap: '0.5rem',
                  }}
                >
                  <span>
                    {formatTimestamp(data.createdAt)}
                    {data.author ? ` · ${authorLabel(data.author)}` : ''}
                    {isUnsaved ? ' · unsaved' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteAt(originalIndex)}
                    title="Delete note"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--theme-elevation-500)',
                      cursor: 'pointer',
                      padding: '0 0.25rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    Delete
                  </button>
                </div>
                <p
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.95rem',
                    color: 'var(--theme-text)',
                    lineHeight: 1.5,
                  }}
                >
                  {data.note ?? ''}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default NotesFeed
