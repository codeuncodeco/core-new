'use client'

import { useEffect, useRef } from 'react'
import {
  useAllFormFields,
  useFormProcessing,
  useFormSubmitted,
} from '@payloadcms/ui'

// Mounted as a UI field at the top of the Proposals form. Two jobs:
//
// 1. Inject a tiny global stylesheet that prevents Payload's validation
//    error tooltips / inline error labels from truncating when the form
//    column gets narrow (e.g. when the live preview panel is open). The
//    important-rules are scoped to error containers only.
// 2. After a save attempt finishes with at least one invalid field,
//    smooth-scroll the form to the first error so the user isn't left
//    searching for it.
export const ProposalFormEnhancements = () => {
  return (
    <>
      <GlobalErrorStyleFix />
      <ScrollToFirstError />
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

const ScrollToFirstError = (): null => {
  const submitted = useFormSubmitted()
  const processing = useFormProcessing()
  const [fields] = useAllFormFields()
  const wasProcessing = useRef(false)

  useEffect(() => {
    // Trigger when processing flips from true → false, i.e., a save attempt
    // just completed. (useFormSubmitted only flips false → true once, so it
    // can't tell us about the second save attempt — track processing edges.)
    const justFinished = wasProcessing.current && !processing
    wasProcessing.current = processing
    if (!justFinished || !submitted) return

    // Find the first field whose validation failed.
    const errorPath = Object.entries(fields).find(
      ([, state]) => state && (state as { valid?: boolean }).valid === false,
    )?.[0]
    if (!errorPath) return

    // Defer one tick so Payload has rendered the error indicators.
    const t = setTimeout(() => {
      const candidates = [
        document.getElementById(`field-${errorPath.replace(/\./g, '__')}`),
        document.getElementById(`field-${errorPath}`),
        document.querySelector(`[data-path="${errorPath}"]`),
        document.querySelector(`[data-field="${errorPath}"]`),
      ]
      const target = candidates.find((el): el is HTMLElement => el instanceof HTMLElement)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        // Fallback: any element marked invalid.
        const generic = document.querySelector(
          '[aria-invalid="true"], .field-type.error, .field-type--error',
        )
        if (generic instanceof HTMLElement) {
          generic.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }, 60)

    return () => clearTimeout(t)
  }, [submitted, processing, fields])

  return null
}

export default ProposalFormEnhancements
