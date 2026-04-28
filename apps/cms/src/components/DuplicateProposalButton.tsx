'use client'

import { useDocumentInfo } from '@payloadcms/ui'
import { useState } from 'react'

type Status = 'idle' | 'loading' | 'ok' | 'err'

export const DuplicateProposalButton = () => {
  const { id } = useDocumentInfo()
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string>('')

  const disabled = !id || status === 'loading'

  const onClick = async () => {
    if (!id) return
    setStatus('loading')
    setMessage('Duplicating…')
    try {
      const res = await fetch('/duplicate-proposal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ proposalId: id }),
      })
      const data = (await res.json()) as { error?: string; newId?: string | number }
      if (!res.ok || !data.newId) throw new Error(data?.error ?? res.statusText)
      // Hard-redirect to the new proposal's edit page.
      window.location.href = `/admin/collections/proposals/${data.newId}`
    } catch (err) {
      setStatus('err')
      setMessage((err as Error).message)
    }
  }

  return (
    <div
      style={{
        marginBottom: '1.5rem',
        padding: '0.75rem 0.9rem',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 6,
        background: 'var(--theme-elevation-50)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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
          {status === 'loading' ? 'Duplicating…' : 'Duplicate this proposal'}
        </button>
        <small style={{ color: 'var(--theme-elevation-500)' }}>
          Creates a draft copy with a fresh slug. Lifecycle/tracking fields are reset.
        </small>
      </div>
      {!id && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--theme-elevation-500)' }}>
          Save the proposal first so it has an ID to duplicate.
        </p>
      )}
      {status === 'err' && message && (
        <p
          style={{
            margin: '0.5rem 0 0',
            fontSize: '0.85rem',
            color: 'var(--theme-error-500)',
          }}
        >
          {message}
        </p>
      )}
    </div>
  )
}

export default DuplicateProposalButton
