import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { sendViaResend } from '../../../email/resend'
import {
  renderContactEmailHtml,
  renderContactEmailText,
} from '../../../email/contact-template'

// Public-facing endpoint for the website contact form. `contact-submissions`
// is create-locked to authenticated users, so this route proxies with the
// payload local API (overrideAccess implicit) and adds: input validation,
// CORS/preflight (required because this sits outside Payload's own `cors`
// config, which only covers the (payload)/api/[...slug] catch-all), and a
// best-effort Resend notification with status writeback to the submission.

const ALLOWED_ORIGINS = new Set([
  'https://codeuncode.com',
  'https://www.codeuncode.com',
  'https://test.codeuncode.com',
  'http://localhost:4321',
  'http://localhost:3000',
])

const corsHeaders = (origin: string | null) => {
  const h: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    h['Access-Control-Allow-Origin'] = origin
  }
  return h
}

const json = (status: number, body: unknown, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })

const isEmail = (v: unknown): v is string =>
  typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

const str = (v: unknown, max = 500): string =>
  typeof v === 'string' ? v.slice(0, max) : ''

export const OPTIONS = async (request: Request) => {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) })
}

export const POST = async (request: Request) => {
  const origin = request.headers.get('origin')

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json(400, { error: 'Invalid JSON' }, origin)
  }

  const name = str(body.name, 200).trim()
  const email = str(body.email, 200).trim()
  const message = str(body.message, 5000).trim()

  if (!name || !message || !isEmail(email)) {
    return json(400, { error: 'Missing or invalid fields' }, origin)
  }

  const payload = await getPayload({ config: configPromise })

  const submissionData = {
    name,
    email,
    message,
    help: str(body.help, 500),
    branch: str(body.branch, 50),
    scope: str(body.scope, 200),
    goal: str(body.goal, 200),
    pain: str(body.pain, 200),
    otherContext: str(body.otherContext, 2000),
    timeline: str(body.timeline, 100),
    budget: str(body.budget, 100),
    userAgent: str(request.headers.get('user-agent'), 500),
    emailStatus: 'pending' as const,
  }

  const submission = await payload.create({
    collection: 'contact-submissions',
    data: submissionData,
  })

  const settings = await payload.findGlobal({ slug: 'email-settings' })
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = settings?.fromEmail || 'hello@send.codeuncode.com'
  const fromName = settings?.fromName || 'Code Uncode'
  const recipients = (settings?.contactRecipients ?? [])
    .map((r: { email?: string | null }) => r.email?.trim())
    .filter((v: string | undefined): v is string => !!v && isEmail(v))

  if (!apiKey || recipients.length === 0) {
    await payload.update({
      collection: 'contact-submissions',
      id: submission.id,
      data: {
        emailStatus: 'failed',
        emailError: !apiKey ? 'RESEND_API_KEY not set' : 'No recipients configured',
      },
    })
    return json(202, { ok: true, id: submission.id, emailed: false }, origin)
  }

  const emailFields = {
    name,
    email,
    message,
    help: submissionData.help,
    branch: submissionData.branch,
    scope: submissionData.scope,
    goal: submissionData.goal,
    pain: submissionData.pain,
    otherContext: submissionData.otherContext,
    timeline: submissionData.timeline,
    budget: submissionData.budget,
  }
  const text = renderContactEmailText(emailFields)
  const html = renderContactEmailHtml(emailFields)

  try {
    await sendViaResend(apiKey, {
      from: `${fromName} <${fromEmail}>`,
      to: recipients,
      subject: `Brief from ${name}`,
      text,
      html,
      reply_to: email,
    })
    await payload.update({
      collection: 'contact-submissions',
      id: submission.id,
      data: { emailStatus: 'sent' },
    })
    return json(200, { ok: true, id: submission.id, emailed: true }, origin)
  } catch (err) {
    const errorMessage = (err as Error).message
    payload.logger.error(`Contact email failed: ${errorMessage}`)
    await payload.update({
      collection: 'contact-submissions',
      id: submission.id,
      data: { emailStatus: 'failed', emailError: errorMessage.slice(0, 500) },
    })
    return json(202, { ok: true, id: submission.id, emailed: false }, origin)
  }
}
