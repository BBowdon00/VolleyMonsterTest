import type { Config } from '@netlify/functions'
import { db } from './_lib/db'

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const passId = (body as { pass_id?: string })?.pass_id
  if (!passId) return Response.json({ error: 'pass_id required' }, { status: 400 })

  const rows = await db.sql`
    SELECT code, holder_name, holder_email, year
    FROM season_passes
    WHERE id = ${passId}::uuid
    LIMIT 1
  `
  const pass = rows[0] as
    | { code: string; holder_name: string | null; holder_email: string | null; year: number }
    | undefined

  if (!pass || !pass.holder_email) {
    return Response.json({ error: 'Pass not found or no email' }, { status: 404 })
  }

  const firstName = pass.holder_name?.split(' ')[0] ?? null
  const html = buildEmailHtml(pass.code, firstName, pass.year)

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'info@volleymonster.com',
        to: [pass.holder_email],
        subject: `Your Volley Monster ${pass.year} Season Pass — Code Inside`,
        html,
      }),
    })
    if (!emailRes.ok) {
      console.error('[send-season-pass-email] Resend error', emailRes.status, await emailRes.text())
    }
  } catch (err) {
    console.error('[send-season-pass-email] Failed:', err)
  }

  return Response.json({ ok: true })
}

function buildEmailHtml(code: string, firstName: string | null, year: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <tr><td style="background:#7EBEC5;padding:32px 32px 24px;text-align:center;">
          <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:2px;color:#e0f4f6;text-transform:uppercase;">Volley Monster</p>
          <h1 style="margin:8px 0 0;font-size:28px;font-weight:800;color:#fff;">${year} Season Pass</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#374151;">${firstName ? `Hi ${firstName},` : 'Hi there,'}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            Your season pass is active! Enter the code below in the <strong>Season Pass Code</strong> field next to your name when registering for any tournament. It covers your individual share of the registration fee for every non-Open division all season long.
          </p>
          <div style="background:#f0fdfc;border:2px dashed #7EBEC5;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:1px;color:#6b7280;text-transform:uppercase;">Your Season Pass Code</p>
            <p style="margin:0;font-size:26px;font-weight:900;letter-spacing:3px;color:#0f766e;font-family:monospace;">${code}</p>
          </div>
          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
            Valid for all non-Open divisions through December 31, ${year}. Does not apply to the Open (top-tier) division.
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;font-size:13px;color:#9ca3af;">Questions? <a href="mailto:info@volleymonster.com" style="color:#7EBEC5;text-decoration:none;">info@volleymonster.com</a></p>
          <p style="margin:8px 0 0;font-size:12px;color:#d1d5db;">&copy; ${new Date().getFullYear()} Volley Monster. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export const config: Config = { path: '/api/send-season-pass-email' }
