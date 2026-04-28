'use client'

import { useField } from '@payloadcms/ui'
import { useState } from 'react'

type Note = {
  note?: string
  author?: number | string | { id?: number | string; email?: string } | null
  createdAt?: string | null
  id?: string
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

const authorLabel = (a: Note['author']): string => {
  if (!a) return ''
  if (typeof a === 'number' || typeof a === 'string') return `User #${a}`
  return a.email ?? `User #${a.id ?? '?'}`
}

// Replaces the default array-field UI for proposal notes with a chronological
// feed. Add via the textarea at the top; existing notes show below, newest
// first. author and createdAt are auto-stamped on save (collection
// beforeChange hook), so the user only types the note body.
export const NotesFeed = () => {
  const { value, setValue } = useField<Note[]>({ path: 'notes' })
  const [draft, setDraft] = useState('')

  const notes = Array.isArray(value) ? value : []

  const addNote = () => {
    const text = draft.trim()
    if (!text) return
    setValue([...(notes ?? []), { note: text }])
    setDraft('')
  }

  const deleteAt = (originalIndex: number) => {
    if (!confirm('Delete this note?')) return
    setValue(notes.filter((_, i) => i !== originalIndex))
  }

  // Sort newest first. Unsaved notes (no createdAt) sort to the top so they
  // visibly appear after the user clicks Add but before the next save.
  const sorted = notes
    .map((n, i) => ({ note: n, originalIndex: i }))
    .sort((a, b) => {
      const aTime = a.note.createdAt ? Date.parse(a.note.createdAt) : Infinity
      const bTime = b.note.createdAt ? Date.parse(b.note.createdAt) : Infinity
      return bTime - aTime
    })

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
          {sorted.map(({ note, originalIndex }, displayIndex) => {
            const isUnsaved = !note.createdAt
            return (
              <li
                key={note.id ?? `unsaved-${originalIndex}`}
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
                    {formatTimestamp(note.createdAt)}
                    {note.author ? ` · ${authorLabel(note.author)}` : ''}
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
                  {note.note ?? ''}
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
