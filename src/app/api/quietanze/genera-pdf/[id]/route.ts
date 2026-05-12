import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

function fmtData(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtPeriodo(d: string): string {
  return new Date(d).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
}

const tipoLabel: Record<string, string> = {
  quota_tesseramento: 'quota di tesseramento',
  rimborso_spese: 'rimborso spese',
  compenso: 'compenso',
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: quietanza, error } = await supabase
    .from('quietanze')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !quietanza) return NextResponse.json({ error: 'Quietanza non trovata' }, { status: 404 })

  const [{ data: giocatore }, { data: club }] = await Promise.all([
    supabase
      .from('giocatori')
      .select('nome, cognome, codice_fiscale, data_nascita, luogo_nascita')
      .eq('id', quietanza.giocatore_id)
      .single(),
    supabase
      .from('clubs')
      .select('nome, nome_esteso, figc_codice, codice_fiscale, indirizzo, citta, email_ufficiale')
      .eq('id', quietanza.club_id)
      .single(),
  ])

  const importoFmt = Number(quietanza.importo_totale).toLocaleString('it-IT', {
    style: 'currency', currency: 'EUR',
  })
  const tipo = tipoLabel[quietanza.tipo] ?? quietanza.tipo
  const nomeGiocatore = `${giocatore?.nome ?? ''} ${giocatore?.cognome ?? ''}`.trim()
  const nomeGiocatoreUpper = `${(giocatore?.cognome ?? '').toUpperCase()} ${(giocatore?.nome ?? '').toUpperCase()}`.trim()

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <title>Quietanza ${quietanza.numero_quietanza ?? ''} — ${nomeGiocatore}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 13px;
      color: #111;
      background: white;
      padding: 48px;
      max-width: 720px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 2px solid #111;
      margin-bottom: 32px;
    }
    .club-name { font-size: 18px; font-weight: 700; }
    .club-sub { font-size: 11px; color: #666; margin-top: 3px; }
    .doc-label { text-align: right; }
    .doc-label .title { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; color: #111; }
    .doc-label .num { font-size: 13px; font-family: monospace; color: #555; margin-top: 4px; }
    .body-text {
      font-size: 13.5px;
      line-height: 1.85;
      margin: 32px 0 40px;
      text-align: justify;
    }
    .body-text strong { font-weight: 700; }
    .firma-section {
      margin-top: 56px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 48px;
    }
    .firma-box { }
    .firma-line {
      border-top: 1px solid #111;
      padding-top: 8px;
      font-size: 11px;
      color: #888;
    }
    .data-line {
      margin-top: 48px;
      font-size: 13px;
    }
    .footer {
      margin-top: 48px;
      padding-top: 14px;
      border-top: 1px solid #ddd;
      font-size: 10px;
      color: #aaa;
      text-align: center;
    }
    @media print {
      body { padding: 24px; }
      @page { margin: 2cm; size: A4; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <div class="club-name">${club?.nome ?? 'Club'}</div>
      ${club?.nome_esteso ? `<div class="club-sub">${club.nome_esteso}</div>` : ''}
      ${club?.indirizzo ? `<div class="club-sub">${club.indirizzo}${club?.citta ? ', ' + club.citta : ''}</div>` : (club?.citta ? `<div class="club-sub">${club.citta}</div>` : '')}
      ${club?.codice_fiscale ? `<div class="club-sub">C.F.: ${club.codice_fiscale}</div>` : ''}
      ${club?.figc_codice ? `<div class="club-sub">Cod. Affiliazione FIGC: ${club.figc_codice}</div>` : ''}
    </div>
    <div class="doc-label">
      <div class="title">Quietanza di pagamento</div>
      ${quietanza.numero_quietanza ? `<div class="num">N. ${quietanza.numero_quietanza}</div>` : ''}
    </div>
  </div>

  <div class="body-text">
    Il sottoscritto <strong>${nomeGiocatoreUpper}</strong>${giocatore?.data_nascita ? `, nato il <strong>${fmtData(giocatore.data_nascita)}</strong>` : ''}${giocatore?.luogo_nascita ? ` a <strong>${giocatore.luogo_nascita}</strong>` : ''},
    codice fiscale <strong>${giocatore?.codice_fiscale ?? '—'}</strong>,
    dichiara di aver ricevuto dalla società <strong>${club?.nome ?? '—'}</strong>
    la somma di <strong>${importoFmt}</strong>
    a titolo di <strong>${tipo}</strong>
    per la stagione sportiva <strong>${quietanza.stagione}</strong>,
    periodo <strong>${fmtPeriodo(quietanza.periodo_da)}</strong> — <strong>${fmtPeriodo(quietanza.periodo_a)}</strong>.
  </div>

  <div class="data-line">
    Data: _______________________
  </div>

  <div class="firma-section">
    <div class="firma-box">
      <div style="height:48px;"></div>
      <div class="firma-line">Firma del percipiente</div>
    </div>
    <div class="firma-box">
      <div style="height:48px;"></div>
      <div class="firma-line">Timbro e firma societaria</div>
    </div>
  </div>

  <div class="footer">
    Documento generato da ClubIS — The Intelligence System
    ${club?.email_ufficiale ? '&nbsp;|&nbsp; ' + club.email_ufficiale : ''}
    &nbsp;|&nbsp; Il presente documento vale come quietanza di pagamento ai sensi di legge
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
