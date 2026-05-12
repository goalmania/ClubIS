import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

export async function POST(_req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Cerca tutti i record famiglie con questa email non ancora collegati
  const { data: famiglie, error: fErr } = await admin
    .from('famiglie')
    .select('id, nome, cognome, email, auth_user_id, giocatori(nome, cognome), clubs(nome)')
    .ilike('email', user.email)
    .is('auth_user_id', null)

  if (fErr) {
    return NextResponse.json({ error: 'Errore database.' }, { status: 500 })
  }

  if (!famiglie || famiglie.length === 0) {
    return NextResponse.json(
      { error: 'Nessun profilo trovato per questa email. Contatta la segreteria del club.' },
      { status: 404 }
    )
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.CIS_EMAIL_FROM ?? process.env.RESEND_FROM

  if (!apiKey || !from) {
    return NextResponse.json(
      { error: 'Servizio email non configurato sul server.' },
      { status: 503 }
    )
  }

  const resend = new Resend(apiKey)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://clubis.it'
  const setupUrl = `${baseUrl}/auth/famiglia-setup`

  // Invia un'email per ogni profilo trovato (di solito uno solo)
  for (const f of famiglie) {
    const giocatore = (f as any).giocatori
    const club = (f as any).clubs
    const giocatoreNome = giocatore ? `${giocatore.nome} ${giocatore.cognome}` : 'tuo/a figlio/a'
    const clubNome = club?.nome ?? 'il club'

    const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:22px;">
      <div style="background:#111;color:#c8f000;padding:12px 16px;border-radius:12px;font-weight:800;font-size:15px;letter-spacing:0.05em;">
        ClubIS — ${clubNome}
      </div>
      <div style="margin-top:18px;padding:24px;border:1px solid #e5e7eb;background:#ffffff;border-radius:14px;">
        <p style="font-size:15px;color:#111827;font-weight:700;margin:0 0 8px;">Gentile ${f.nome},</p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px;">
          Hai richiesto il codice per collegare il tuo account al profilo di
          <strong>${giocatoreNome}</strong> presso <strong>${clubNome}</strong>.
        </p>

        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;font-family:monospace;">
            Il tuo codice invito
          </div>
          <div style="font-family:monospace;font-size:15px;color:#1d4ed8;letter-spacing:0.04em;word-break:break-all;">
            ${f.id}
          </div>
        </div>

        <p style="font-size:13px;color:#6b7280;margin:0 0 20px;line-height:1.6;">
          Torna alla pagina di collegamento e inserisci questo codice nel campo apposito.
        </p>

        <a href="${setupUrl}"
           style="display:inline-block;background:#c8f000;color:#111;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:800;font-size:14px;letter-spacing:0.02em;">
          Collega il mio account →
        </a>
      </div>
      <div style="margin-top:14px;color:#9ca3af;font-size:11px;line-height:1.4;">
        Hai richiesto questa email tramite il portale ClubIS. Se non sei stato tu, ignora questa email.
      </div>
    </div>
  </body>
</html>`

    await resend.emails.send({
      from,
      to: user.email,
      subject: `Il tuo codice invito ClubIS — ${clubNome}`,
      html,
    })
  }

  return NextResponse.json({ ok: true, trovati: famiglie.length })
}
