const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const nl2br = (s: string) => escapeHtml(s).replace(/\n/g, '<br />')

export type ContactEmailFields = {
  name: string
  email: string
  message: string
  help?: string
  branch?: string
  scope?: string
  goal?: string
  pain?: string
  otherContext?: string
  timeline?: string
  budget?: string
}

const COLORS = {
  bg: '#fdfdfa',
  surface: '#f6f4ea',
  border: '#e7e3d2',
  fg: '#141411',
  muted: '#5a584f',
  accent: '#ffc93f',
  accentInk: '#1a1400',
}

const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif"
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

const detailRow = (label: string, value: string) => `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};vertical-align:top;width:140px;font-family:${MONO};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${COLORS.muted};">${escapeHtml(label)}</td>
    <td style="padding:10px 0 10px 16px;border-bottom:1px solid ${COLORS.border};vertical-align:top;font-family:${SANS};font-size:15px;line-height:1.5;color:${COLORS.fg};">${nl2br(value)}</td>
  </tr>`

export function renderContactEmailHtml(f: ContactEmailFields): string {
  const details: Array<[string, string | undefined]> = [
    ['Help needed', f.help],
    ['Branch', f.branch],
    ['Scope', f.scope],
    ['Goal', f.goal],
    ['Pain', f.pain],
    ['Context', f.otherContext],
    ['Timeline', f.timeline],
    ['Budget', f.budget],
  ]
  const detailRows = details
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => detailRow(k, v as string))
    .join('')

  const detailsBlock = detailRows
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin:0 0 28px;">${detailRows}</table>`
    : ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>New project enquiry</title>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.bg};color:${COLORS.fg};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${COLORS.bg};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden;">
            <tr>
              <td style="height:6px;background:${COLORS.accent};line-height:6px;font-size:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px;">
                <div style="font-family:${MONO};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${COLORS.muted};margin-bottom:8px;">Code Uncode &middot; New enquiry</div>
                <h1 style="margin:0;font-family:${SERIF};font-weight:600;font-size:28px;line-height:1.2;letter-spacing:-0.01em;color:${COLORS.fg};">${escapeHtml(f.name)}</h1>
                <div style="margin-top:6px;font-family:${SANS};font-size:14px;color:${COLORS.muted};">
                  <a href="mailto:${escapeHtml(f.email)}" style="color:${COLORS.muted};text-decoration:underline;">${escapeHtml(f.email)}</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0;">
                ${detailsBlock}
                <div style="font-family:${MONO};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${COLORS.muted};margin-bottom:10px;">Project</div>
                <div style="font-family:${SANS};font-size:16px;line-height:1.6;color:${COLORS.fg};background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:8px;padding:18px 20px;">${nl2br(f.message)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 28px;">
                <a href="mailto:${escapeHtml(f.email)}?subject=${encodeURIComponent('Re: your enquiry')}" style="display:inline-block;background:${COLORS.accent};color:${COLORS.accentInk};font-family:${MONO};font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none;padding:10px 18px;border-radius:999px;">Reply to ${escapeHtml(f.name.split(' ')[0] || 'sender')}</a>
              </td>
            </tr>
          </table>
          <div style="max-width:600px;margin:14px auto 0;font-family:${MONO};font-size:11px;letter-spacing:0.08em;color:${COLORS.muted};text-align:center;">
            Sent from the contact form on codeuncode.com
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export function renderContactEmailText(f: ContactEmailFields): string {
  const lines: Array<string | false> = [
    `Name: ${f.name}`,
    `Email: ${f.email}`,
    '',
    !!f.help && `Help needed: ${f.help}`,
    !!f.branch && `Branch: ${f.branch}`,
    !!f.scope && `Scope: ${f.scope}`,
    !!f.goal && `Goal: ${f.goal}`,
    !!f.pain && `Pain: ${f.pain}`,
    !!f.otherContext && `Context: ${f.otherContext}`,
    !!f.timeline && `Timeline: ${f.timeline}`,
    !!f.budget && `Budget: ${f.budget}`,
    '',
    'Project:',
    f.message,
  ]
  return lines.filter((l): l is string => typeof l === 'string').join('\n')
}
