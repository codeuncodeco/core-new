import type { EmailAdapter } from 'payload'

type ResendPayload = {
  from: string
  to: string[]
  subject: string
  html?: string
  text?: string
  reply_to?: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
}

export const FALLBACK_FROM_ADDRESS = 'hello@send.codeuncode.com'
export const FALLBACK_FROM_NAME = 'Code Uncode'

export async function sendViaResend(apiKey: string, message: ResendPayload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend ${res.status}: ${body}`)
  }
  return (await res.json()) as { id: string }
}

const toArray = (v: string | string[] | undefined): string[] => {
  if (!v) return []
  return Array.isArray(v) ? v.map(String) : [String(v)]
}

export const resendAdapter = (): EmailAdapter =>
  ({ payload }) => ({
    name: 'resend',
    defaultFromAddress: FALLBACK_FROM_ADDRESS,
    defaultFromName: FALLBACK_FROM_NAME,
    sendEmail: async (message) => {
      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

      // If/when an EmailSettings global exists (Phase 4), prefer its values
      // over the hardcoded defaults. Until then findGlobal throws — swallow it.
      let fromAddress = FALLBACK_FROM_ADDRESS
      let fromName = FALLBACK_FROM_NAME
      try {
        const settings = await payload.findGlobal({ slug: 'email-settings' as never })
        if (settings && typeof settings === 'object') {
          const s = settings as { fromEmail?: string; fromName?: string }
          if (s.fromEmail) fromAddress = s.fromEmail
          if (s.fromName) fromName = s.fromName
        }
      } catch {
        // Global not registered yet — stick with fallback defaults.
      }

      const from =
        typeof message.from === 'string' ? message.from : `${fromName} <${fromAddress}>`
      const to = toArray(message.to as string | string[])

      const result = await sendViaResend(apiKey, {
        from,
        to,
        subject: String(message.subject ?? ''),
        html: typeof message.html === 'string' ? message.html : undefined,
        text: typeof message.text === 'string' ? message.text : undefined,
        reply_to: message.replyTo as string | string[] | undefined,
        cc: message.cc as string | string[] | undefined,
        bcc: message.bcc as string | string[] | undefined,
      })
      return { id: result.id }
    },
  })
