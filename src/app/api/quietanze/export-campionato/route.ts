import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

function fmtPeriodo(d: string): string {
  return new Date(d).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
}

function fmtData(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const tipoLabel: Record<string, string> = {
  quota_tesseramento: 'Quota tesseramento',
  rimborso_spese: 'Rimborso spese',
  compenso: 'Compenso',
}

export async function GET(req: NextRequest) {
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente } = await supabase
    .from('utenti')
    .select('club_id')
    .eq('id', user.id)
    .single()
  if (!utente?.club_id) return NextResponse.json({ error: 'Club non trovato' }, { status: 403 })

  const STAGIONE = '2024-25'
  const clubId = utente.club_id

  const [{ data: quietanze }, { data: club }] = await Promise.all([
    supabase
      .from('quietanze')
      .select('*, giocatori(nome, cognome, codice_fiscale, data_nascita, luogo_nascita)')
      .eq('club_id', clubId)
      .eq('stagione', STAGIONE)
      .order('numero_quietanza'),
    supabase
      .from('clubs')
      .select('nome, nome_esteso, figc_codice, codice_fiscale, indirizzo, citta, email_ufficiale')
      .eq('id', clubId)
      .single(),
  ])

  const rows = quietanze ?? []
  const dataExport = new Date().toLocaleDateString('it-IT')

  const righeTabella = rows.map((q: any) => {
    const g = q.giocatori
    const importoFmt = Number(q.importo_totale).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
    const firmataLabel = q.firmata
      ? `<span style="color:#16a34a;font-weight:600;">Sì (${fmtData(q.firma_data)})</span>`
      : `<span style="color:#dc2626;">No</span>`
    return `
      <tr>
        <td>${q.numero_quietanza ?? '—'}</td>
        <td><strong>${(g?.cognome ?? '').toUpperCase()} ${g?.nome ?? ''}</strong><br><span style="font-size:10px;color:#888;">${g?.codice_fiscale ?? ''}</span></td>
        <td style="font-family:monospace;">${importoFmt}</td>
        <td>${tipoLabel[q.tipo] ?? q.tipo}</td>
        <td>${fmtPeriodo(q.periodo_da)} — ${fmtPeriodo(q.periodo_a)}</td>
        <td>${firmataLabel}</td>
      </tr>`
  }).join('')

  const totale = rows.reduce((s: number, q: any) => s + Number(q.importo_totale), 0)
  const firmate = rows.filter((q: any) => q.firmata).length

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <title>Export Quietanze — ${STAGIONE}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #111; background: white; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 18px; border-bottom: 2px solid #111; margin-bottom: 28px; }
    .club-name { font-size: 18px; font-weight: 700; }
    .club-sub { font-size: 11px; color: #666; margin-top: 3px; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; }
    .doc-title p { font-size: 11px; color: #666; margin-top: 4px; }
    .summary { display: flex; gap: 24px; margin-bottom: 24px; }
    .kpi { background: #f8f8f8; border: 1px solid #e5e5e5; border-radius: 6px; padding: 12px 20px; text-align: center; }
    .kpi .val { font-size: 22px; font-weight: 700; }
    .kpi .lbl { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.08em; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #111; color: #fff; }
    th { padding: 9px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
    td { padding: 9px 10px; border-bottom: 1px solid #eee; font-size: 12px; vertical-align: top; }
    tr:hover td { background: #fafafa; }
    .footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid #ddd; font-size: 10px; color: #aaa; text-align: center; }
    @media print {
      body { padding: 20px; }
      @page { margin: 1.5cm; size: A4 landscape; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <div class="club-name">${club?.nome ?? 'Club'}</div>
      ${club?.nome_esteso ? `<div class="club-sub">${club.nome_esteso}</div>` : ''}
      ${club?.figc_codice ? `<div class="club-sub">Cod. Affiliazione FIGC: ${club.figc_codice}</div>` : ''}
      ${club?.codice_fiscale ? `<div class="club-sub">C.F.: ${club.codice_fiscale}</div>` : ''}
    </div>
    <div class="doc-title">
      <h1>Quietanze — Iscrizione campionato</h1>
      <p>Stagione sportiva ${STAGIONE} &nbsp;|&nbsp; Generato il ${dataExport}</p>
    </div>
  </div>

  <div class="summary">
    <div class="kpi"><div class="val">${rows.length}</div><div class="lbl">Quietanze totali</div></div>
    <div class="kpi"><div class="val" style="color:#16a34a">${firmate}</div><div class="lbl">Firmate</div></div>
    <div class="kpi"><div class="val" style="color:#dc2626">${rows.length - firmate}</div><div class="lbl">Non firmate</div></div>
    <div class="kpi"><div class="val">${totale.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</div><div class="lbl">Importo totale</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>N. Quietanza</th>
        <th>Giocatore</th>
        <th>Importo</th>
        <th>Tipo</th>
        <th>Periodo</th>
        <th>Firmata</th>
      </tr>
    </thead>
    <tbody>
      ${righeTabella || '<tr><td colspan="6" style="text-align:center;padding:40px;color:#888;">Nessuna quietanza generata per questa stagione</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    ClubIS — The Intelligence System &nbsp;|&nbsp;
    ${club?.email_ufficiale ?? ''} &nbsp;|&nbsp;
    Documento per uso interno — allegare alla domanda di iscrizione al campionato
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
