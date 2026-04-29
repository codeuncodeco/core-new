'use client'

import { useEffect, useRef } from 'react'
import { toast, useAllFormFields } from '@payloadcms/ui'

// Mounted as a UI field at the top of the Proposals form. Three jobs:
//
// 1. Inject a tiny global stylesheet that prevents Payload's validation
//    error tooltips / inline error labels from truncating when the form
//    column gets narrow (e.g. when the live preview panel is open).
// 2. After a save click, smooth-scroll the form to the first invalid field
//    so the user isn't left searching for it.
// 3. Replace Payload's generic "The following field is invalid: <Label>"
//    toast with descriptive ones using each invalid field's own error
//    message ("Share percents must add up to 100% — currently 90%…").
export const ProposalFormEnhancements = () => {
  return (
    <>
      <GlobalErrorStyleFix />
      <SaveAttemptHandler />
    </>
  )
}

const GlobalErrorStyleFix = (): null => {
  useEffect(() => {
    const id = '__proposal-form-enhancements-style'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.textContent = `
      /* Don't truncate validation error labels when the form column is narrow
         (e.g. the Live Preview panel is open). */
      .tooltip-content,
      .field-type .tooltip-content,
      .field-error,
      .field-type__error,
      .errors-pill__content {
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: clip !important;
        max-width: none !important;
        word-break: break-word;
      }
    `
    document.head.appendChild(style)
    return () => {
      style.remove()
    }
  }, [])
  return null
}

type FieldStateLike = {
  valid?: boolean
  errorMessage?: string
  errorPaths?: string[]
}

const SaveAttemptHandler = (): null => {
  const [fields] = useAllFormFields()
  // Refs so the click handler always sees the latest field state without
  // re-binding on every keystroke.
  const fieldsRef = useRef(fields)
  fieldsRef.current = fields

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target
      if (!(target instanceof Element)) return
      // Payload's primary action buttons — Save (publish), Save Draft.
      const button = target.closest<HTMLElement>(
        'button[type="submit"], .doc-controls__controls button',
      )
      if (!button) return
      // Don't trigger on negative actions like cancel/close.
      const text = button.textContent?.trim().toLowerCase() ?? ''
      if (text === 'cancel' || text === 'close') return

      // Wait one render tick for Payload to compute validity.
      setTimeout(() => onSaveAttempt(fieldsRef.current as Record<string, FieldStateLike>), 250)
    }
    document.addEventListener('click', handleClick, { capture: true })
    return () => document.removeEventListener('click', handleClick, { capture: true })
  }, [])

  return null
}

const labelFor = (path: string): string => {
  // Convert "paymentTerms" → "Payment Terms", "scopeItems.2.title" → "Scope Items".
  const root = path.split('.')[0] ?? path
  return root
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

const onSaveAttempt = (fields: Record<string, FieldStateLike>) => {
  const invalid = Object.entries(fields).filter(([, s]) => s && s.valid === false)
  if (invalid.length === 0) return

  // Show one descriptive toast per invalid field, using the field's own
  // errorMessage when present (validate returned a string).
  for (const [path, state] of invalid) {
    if (state?.errorMessage) {
      toast.error(`${labelFor(path)}: ${state.errorMessage}`)
    }
  }

  // Scroll to the first invalid field.
  const [firstPath] = invalid[0] ?? []
  if (!firstPath) return
  const candidates = [
    document.getElementById(`field-${firstPath.replace(/\./g, '__')}`),
    document.getElementById(`field-${firstPath}`),
    document.querySelector(`[data-path="${firstPath}"]`),
    document.querySelector(`[data-field="${firstPath}"]`),
    // Fallback: any element marked invalid in the DOM.
    document.querySelector('[aria-invalid="true"]'),
    document.querySelector('.field-type.error, .field-type--error'),
  ]
  const target = candidates.find((el): el is HTMLElement => el instanceof HTMLElement)
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

export default ProposalFormEnhancements
