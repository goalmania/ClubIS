import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx || ctx.ruolo !== 'presidente') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const body = await req.json()
  const { ruolo, scadenzaGiorni, giocatoreId } = body as {
    ruolo: string; scadenzaGiorni?: number; giocatoreId?: string
  }

  if (!ruolo) {
    return NextResponse.json({ error: 'ruolo mancante' }, { status: 400 })
  }

  const token = randomBytes(32).toString('hex')
  const scadenza = scadenzaGiorni
    ? new Date(Date.now() + scadenzaGiorni * 24 * 60 * 60 * 1000).toISOString()
    : null

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('inviti_club')
    .insert({
      club_id:      ctx.clubId,
      ruolo,
      token,
      creato_da:    ctx.userId,
      scadenza,
      giocatore_id: giocatoreId ?? null,
    })
    .select('id, token')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${req.headers.get('host')}`
  const link = `${baseUrl}/unisciti/${data.token}`

  // ── Invio email automatico per inviti famiglia ──────────────────────────
  if (ruolo === 'famiglia' && giocatoreId) {
    try {
      const apiKey = process.env.RESEND_API_KEY
      const from   = process.env.CIS_EMAIL_FROM ?? process.env.RESEND_FROM

      if (apiKey && from) {
        // Cerca email e nome genitore nella tabella famiglie
        const { data: famiglia } = await admin
          .from('famiglie')
          .select('nome, cognome, email, giocatori(nome, cognome)')
          .eq('giocatore_id', giocatoreId)
          .is('auth_user_id', null)
          .maybeSingle()

        // Cerca nome club
        const { data: club } = await admin
          .from('clubs')
          .select('nome')
          .eq('id', ctx.clubId)
          .maybeSingle()

        const destinatario = famiglia?.email
        if (destinatario) {
          const clubNome      = (club as any)?.nome ?? 'il club'
          const giocatore     = (famiglia as any)?.giocatori
          const giocatoreNome = giocatore ? `${giocatore.nome} ${giocatore.cognome}` : 'tuo/a figlio/a'
          const nomeGenitore  = famiglia ? `${famiglia.nome}` : 'Gentile genitore'

          const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:22px;">
      <div style="background:#111;color:#c8f000;padding:12px 16px;border-radius:12px;font-weight:800;font-size:15px;letter-spacing:0.05em;">
        ClubIS — ${clubNome}
      </div>
      <div style="margin-top:18px;padding:24px;border:1px solid #e5e7eb;background:#fff;border-radius:14px;">
        <p style="font-size:15px;color:#111827;font-weight:700;margin:0 0 8px;">${nomeGenitore},</p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px;">
          La segreteria di <strong>${clubNome}</strong> ti ha invitato a creare il tuo account
          per seguire le attività di <strong>${giocatoreNome}</strong>.
        </p>
        <p style="font-size:13px;color:#6b7280;margin:0 0 20px;line-height:1.6;">
          Clicca il pulsante qui sotto per creare il tuo account. Una volta registrato
          sarai automaticamente collegato al profilo di ${giocatoreNome}.
        </p>
        <a href="${link}"
           style="display:inline-block;background:#c8f000;color:#111;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:800;font-size:14px;letter-spacing:0.02em;">
          Crea il mio account →
        </a>
        <p style="font-size:11px;color:#9ca3af;margin:20px 0 0;line-height:1.5;">
          Il link scade il ${scadenza ? new Date(scadenza).toLocaleDateString('it-IT') : '—'}.
          Se non riesci a cliccare il pulsante, copia questo URL nel browser:<br/>
          <span style="color:#6b7280;word-break:break-all;">${link}</span>
        </p>
      </div>
      <div style="margin-top:14px;color:#9ca3af;font-size:11px;">
        Email inviata da ${clubNome} tramite ClubIS. Se non conosci questo club, ignora questa email.
      </div>
    </div>
  </body>
</html>`

          const resend = new Resend(apiKey)
          await resend.emails.send({
            from,
            to:      destinatario,
            subject: `Invito ClubIS — ${clubNome}`,
            html,
          })
        }
      }
    } catch {
      // L'invio email non è bloccante — il link è già stato generato
    }
  }

  return NextResponse.json({ link, token: data.token, id: data.id })
}
