import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/cron/trial-expiry-warning
 *
 * Eseguito ogni giorno da Vercel Cron.
 * Invia una email di preavviso ai presidenti il cui trial scade
 * tra esattamente 2 giorni (finestra: da domani+1 a domani+2).
 *
 * Protetto da Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const db = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://clubis.it'
  const dmUrl = 'https://dmfootballservices.it'

  // Finestra: trial che scade tra 48h e 72h da adesso
  const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  const in72h = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

  const { data: clubs, error } = await db
    .from('clubs')
    .select('id, nome, trial_ends_at')
    .eq('plan_status', 'trial')
    .gte('trial_ends_at', in48h)
    .lt('trial_ends_at', in72h)

  if (error) {
    console.error('[trial-expiry-warning] Errore query:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!clubs || clubs.length === 0) {
    return NextResponse.json({ ok: true, emails_inviati: 0, messaggio: 'Nessun trial in scadenza tra 2 giorni' })
  }

  let emailsInviati = 0
  const errori: string[] = []

  for (const club of clubs) {
    // Trova email presidente
    const { data: presidente } = await db
      .from('utenti')
      .select('email, nome, cognome')
      .eq('club_id', club.id)
      .eq('ruolo', 'presidente')
      .maybeSingle()

    if (!presidente?.email) continue

    const scadenzaData = new Date(club.trial_ends_at).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })

    try {
      await resend.emails.send({
        from: process.env.CIS_EMAIL_FROM ?? 'noreply@clubis.it',
        to: presidente.email,
        subject: `⏰ Il tuo trial ClubIS scade tra 2 giorni — ${club.nome}`,
        html: `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="padding:32px 40px;border-bottom:1px solid #222;">
            <span style="font-size:22px;font-weight:900;letter-spacing:0.08em;color:#c8f000;text-transform:uppercase;">CLUB<span style="color:#fff">IS</span></span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 8px;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:0.1em;">Ciao ${presidente.nome},</p>
            <h1 style="margin:0 0 24px;font-size:24px;font-weight:900;color:#fff;line-height:1.3;">
              Il tuo periodo di prova<br>scade il <span style="color:#c8f000">${scadenzaData}</span>
            </h1>
            <p style="margin:0 0 16px;font-size:15px;color:#aaa;line-height:1.7;">
              Tra <strong style="color:#fff">2 giorni</strong> il trial gratuito di ClubIS per <strong style="color:#fff">${club.nome}</strong> terminerà.
              Dopo la scadenza non sarà più possibile accedere alla piattaforma.
            </p>
            <p style="margin:0 0 32px;font-size:15px;color:#aaa;line-height:1.7;">
              I tuoi dati (rosa, calendari, documenti) restano al sicuro — puoi recuperarli attivando un abbonamento in qualsiasi momento.
            </p>
            <!-- CTA -->
            <a href="${dmUrl}" style="display:inline-block;padding:14px 32px;background:#c8f000;color:#000;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;text-decoration:none;border-radius:8px;">
              Attiva il tuo piano →
            </a>
            <!-- Piani -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
              <tr>
                <td width="33%" style="padding:0 6px 0 0;">
                  <div style="background:#0d0d0d;border:1px solid #333;border-top:2px solid #555;border-radius:8px;padding:14px 12px;">
                    <div style="font-size:11px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Starter</div>
                    <div style="font-size:11px;color:#666;line-height:1.7;">· Rosa & quote<br>· Calendario<br>· Distinte gara</div>
                  </div>
                </td>
                <td width="33%" style="padding:0 3px;">
                  <div style="background:#0d0d0d;border:1px solid #4444aa33;border-top:2px solid #4444aa;border-radius:8px;padding:14px 12px;">
                    <div style="font-size:11px;font-weight:700;color:#4444ff;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Pro</div>
                    <div style="font-size:11px;color:#666;line-height:1.7;">· Contratti<br>· Documenti SEPA<br>· Compensi staff</div>
                  </div>
                </td>
                <td width="33%" style="padding:0 0 0 6px;">
                  <div style="background:#0d0d0d;border:1px solid #c8f00033;border-top:2px solid #c8f000;border-radius:8px;padding:14px 12px;">
                    <div style="font-size:11px;font-weight:700;color:#c8f000;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Elite</div>
                    <div style="font-size:11px;color:#666;line-height:1.7;">· DM Scout AI<br>· Report mensili<br>· Multi-osservatori</div>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #1a1a1a;">
            <p style="margin:0;font-size:12px;color:#444;line-height:1.6;">
              Hai già acquistato un piano? <a href="${siteUrl}/auth/login" style="color:#c8f000;text-decoration:none;">Accedi a ClubIS</a> — se il problema persiste scrivici su WhatsApp.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      })
      emailsInviati++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[trial-expiry-warning] Errore invio email a ${presidente.email}:`, msg)
      errori.push(`${presidente.email}: ${msg}`)
    }
  }

  return NextResponse.json({
    ok: true,
    emails_inviati: emailsInviati,
    errori: errori.length > 0 ? errori : undefined,
  })
}
