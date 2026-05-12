import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx || !['segretario', 'presidente'].includes(ctx.ruolo)) {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 })
  }

  const { famiglia_id } = await req.json()
  if (!famiglia_id || typeof famiglia_id !== 'string') {
    return NextResponse.json({ error: 'famiglia_id mancante.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: famiglia, error: fErr } = await admin
    .from('famiglie')
    .select('id, nome, cognome, email, auth_user_id, giocatori(nome, cognome)')
    .eq('id', famiglia_id)
    .single()

  if (fErr || !famiglia) {
    return NextResponse.json({ error: 'Famiglia non trovata.' }, { status: 404 })
  }
  if (!famiglia.email) {
    return NextResponse.json({ error: 'Nessuna email registrata per questo genitore.' }, { status: 400 })
  }
  if (famiglia.auth_user_id) {
    return NextResponse.json({ error: 'Questo account è già collegato.' }, { status: 400 })
  }

  const { data: club } = await admin
    .from('clubs')
    .select('nome')
    .eq('id', ctx.clubId)
    .single()

  const clubNome = (club as any)?.nome ?? 'il club'
  const giocatore = (famiglia as any).giocatori
  const giocatoreNome = giocatore ? `${giocatore.nome} ${giocatore.cognome}` : 'tuo/a figlio/a'

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.CIS_EMAIL_FROM ?? process.env.RESEND_FROM
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${req.headers.get('host')}`

  if (!apiKey || !from) {
    return NextResponse.json(
      { error: 'Servizio email non configurato. Aggiungere RESEND_API_KEY e CIS_EMAIL_FROM in .env.local.' },
      { status: 503 }
    )
  }

  const setupUrl = `${baseUrl}/auth/famiglia-setup`

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:22px;">
      <div style="background:#111;color:#c8f000;padding:12px 16px;border-radius:12px;font-weight:800;font-size:15px;letter-spacing:0.05em;">
        ClubIS — ${clubNome}
      </div>
      <div style="margin-top:18px;padding:24px;border:1px solid #e5e7eb;background:#ffffff;border-radius:14px;">
        <p style="font-size:15px;color:#111827;font-weight:700;margin:0 0 8px;">Gentile ${famiglia.nome},</p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px;">
          La segreteria di <strong>${clubNome}</strong> ti ha inviato il codice per collegare il tuo account
          al profilo di <strong>${giocatoreNome}</strong>.
        </p>

        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;font-family:monospace;">
            Il tuo codice invito
          </div>
          <div style="font-family:monospace;font-size:15px;color:#1d4ed8;letter-spacing:0.04em;word-break:break-all;">
            ${famiglia.id}
          </div>
        </div>

        <p style="font-size:13px;color:#6b7280;margin:0 0 20px;line-height:1.6;">
          Accedi alla pagina di registrazione, crea il tuo account e inserisci questo codice quando richiesto.
        </p>

        <a href="${setupUrl}"
           style="display:inline-block;background:#c8f000;color:#111;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:800;font-size:14px;letter-spacing:0.02em;">
          Collega il mio account →
        </a>
      </div>
      <div style="margin-top:14px;color:#9ca3af;font-size:11px;line-height:1.4;">
        Email inviata dalla segreteria di ${clubNome} tramite ClubIS.
        Se non sei il destinatario, ignora questa email.
      </div>
    </div>
  </body>
</html>`

  const resend = new Resend(apiKey)
  const { error: sendErr } = await resend.emails.send({
    from,
    to: famiglia.email,
    subject: `Codice invito ClubIS — ${clubNome}`,
    html,
  })

  if (sendErr) {
    return NextResponse.json({ error: `Errore invio email: ${(sendErr as any).message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, email: famiglia.email })
}
