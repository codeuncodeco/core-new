'use client'

import { useDocumentInfo } from '@payloadcms/ui'
import { useState } from 'react'

type Status = 'idle' | 'loading' | 'ok' | 'err'

export const FetchCoverButton = () => {
  const { id } = useDocumentInfo()
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string>('')

  const disabled = !id || status === 'loading'

  const onClick = async () => {
    if (!id) return
    setStatus('loading')
    setMessage('Fetching og:image from the live site…')
    try {
      const res = await fetch('/fetch-cover', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId: id }),
      })
      const data = (await res.json()) as { error?: string; sourceUrl?: string }
      if (!res.ok) throw new Error(data?.error ?? res.statusText)
      setStatus('ok')
      setMessage(
        `Cover set from ${data.sourceUrl}. Reload this page to see it applied.`,
      )
    } catch (err) {
      setStatus('err')
      setMessage((err as Error).message)
    }
  }

  return (
    <div
      style={{
        marginTop: '1rem',
        padding: '0.75rem 0.9rem',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 6,
        background: 'var(--theme-elevation-50)',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
      >
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          style={{
            padding: '0.45rem 0.85rem',
            border: '1px solid currentColor',
            borderRadius: 4,
            background: disabled ? 'transparent' : 'var(--theme-text)',
            color: disabled ? 'var(--theme-elevation-500)' : 'var(--theme-bg)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
          }}
        >
          {status === 'loading' ? 'Fetching…' : 'Fetch cover from live site'}
        </button>
        <small style={{ color: 'var(--theme-elevation-500)' }}>
          Grabs <code>og:image</code> from the project&apos;s URL and sets it as the cover.
        </small>
      </div>
      {!id && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--theme-elevation-500)' }}>
          Save the project first so it has an ID to update.
        </p>
      )}
      {message && (
        <p
          style={{
            margin: '0.5rem 0 0',
            fontSize: '0.85rem',
            color:
              status === 'err'
                ? 'var(--theme-error-500)'
                : status === 'ok'
                  ? 'var(--theme-success-500)'
                  : 'var(--theme-elevation-600)',
          }}
        >
          {message}
        </p>
      )}
    </div>
  )
}

export default FetchCoverButton
