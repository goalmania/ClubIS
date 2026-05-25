import { getUserContext } from '@/lib/impersonation'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

function fmt(n: number): string {
  return `€ ${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return new Response('Non autenticato', { status: 401 })

  const anno = parseInt(req.nextUrl.searchParams.get('anno') ?? String(new Date().getFullYear()))
  const admin = createAdminClient()
  const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  const [{ data: compensi }, { data: utenti }, { data: club }] = await Promise.all([
    admin.from('compensi').select('*').eq('club_id', ctx.clubId).eq('anno', anno).order('data_pagamento', { ascending: true }),
    admin.from('utenti').select('id, nome, cognome').eq('club_id', ctx.clubId),
    admin.from('clubs').select('nome, citta').eq('id', ctx.clubId).single(),
  ])

  const lista = (compensi ?? []) as any[]
  const utenteMap = Object.fromEntries((utenti ?? []).map((u: any) => [u.id, `${u.cognome} ${u.nome}`]))

  const totLordo = lista.reduce((s: number, c: any) => s + Number(c.importo_lordo), 0)
  const totRitenuta = lista.reduce((s: number, c: any) => s + Number(c.ritenuta), 0)
  const totNetto = lista.reduce((s: number, c: any) => s + Number(c.importo_netto), 0)
  const sopraSoglia = lista.filter((c: any) => c.supera_soglia).length

  // Report aggregato per collaboratore
  const gruppi: Record<string, any[]> = {}
  lista.forEach((c: any) => {
    const key = c.collaboratore_id ?? c.cf_esterno ?? 'ext'
    if (!gruppi[key]) gruppi[key] = []
    gruppi[key].push(c)
  })
  const report = Object.entries(gruppi).map(([, rows]) => {
    const first = rows[0]
    const nome = first.collaboratore_id ? (utenteMap[first.collaboratore_id] ?? 'Sconosciuto') : (first.nome_esterno ?? 'Esterno')
    return {
      nome,
      cf: first.cf_esterno ?? '—',
      lordo: rows.reduce((s: number, c: any) => s + Number(c.importo_lordo), 0),
      esente: rows.reduce((s: number, c: any) => s + Number(c.importo_esente), 0),
      imponibile: rows.reduce((s: number, c: any) => s + Number(c.importo_imponibile), 0),
      ritenuta: rows.reduce((s: number, c: any) => s + Number(c.ritenuta), 0),
      netto: rows.reduce((s: number, c: any) => s + Number(c.importo_netto), 0),
      n: rows.length,
    }
  }).sort((a, b) => b.lordo - a.lordo)

  const MESI = ['','Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']

  const righeDettaglio = lista.map((c: any) => {
    const nome = c.collaboratore_id ? (utenteMap[c.collaboratore_id] ?? 'Sconosciuto') : (c.nome_esterno ?? 'Esterno')
    return `
      <tr>
        <td>
          <strong>${nome}</strong>
          ${c.cf_esterno ? `<br/><span style="font-size:9px;font-family:monospace;color:#777">${c.cf_esterno}</span>` : ''}
        </td>
        <td style="font-size:11px">${c.descrizione ?? '—'}</td>
        <td style="text-align:center;font-family:monospace;font-size:10px">${anno}/${c.mese ? String(c.mese).padStart(2,'0') : '—'}</td>
        <td style="text-align:right;font-family:monospace;font-weight:700">${fmt(Number(c.importo_lordo))}</td>
        <td style="text-align:right;font-family:monospace;color:${Number(c.ritenuta) > 0 ? '#dc2626' : '#9ca3af'}">${Number(c.ritenuta) > 0 ? '−' + fmt(Number(c.ritenuta)) : '—'}</td>
        <td style="text-align:right;font-family:monospace;font-weight:700;color:#16a34a">${fmt(Number(c.importo_netto))}</td>
        <td style="text-align:center">
          <span style="background:${c.supera_soglia ? '#fee2e2' : '#dcfce7'};color:${c.supera_soglia ? '#dc2626' : '#16a34a'};padding:2px 7px;border-radius:4px;font-size:9px;font-weight:700">
            ${c.supera_soglia ? 'SOPRA SOGLIA' : 'ESENTE'}
          </span>
        </td>
        <td style="text-align:center;font-family:monospace;font-size:10px;text-transform:capitalize">${c.metodo ?? '—'}</td>
      </tr>`
  }).join('')

  const righeReport = report.map(r => `
    <tr>
      <td><strong>${r.nome}</strong>${r.cf !== '—' ? `<br/><span style="font-size:9px;font-family:monospace;color:#777">${r.cf}</span>` : ''}</td>
      <td style="text-align:center;font-family:monospace">${r.n}</td>
      <td style="text-align:right;font-family:monospace;font-weight:700">${fmt(r.lordo)}</td>
      <td style="text-align:right;font-family:monospace;color:#16a34a">${fmt(r.esente)}</td>
      <td style="text-align:right;font-family:monospace;color:${r.imponibile > 0 ? '#d97706' : '#9ca3af'}">${r.imponibile > 0 ? fmt(r.imponibile) : '—'}</td>
      <td style="text-align:right;font-family:monospace;color:${r.ritenuta > 0 ? '#dc2626' : '#9ca3af'};font-weight:700">${r.ritenuta > 0 ? '−' + fmt(r.ritenuta) : '—'}</td>
      <td style="text-align:right;font-family:monospace;font-weight:700;color:#16a34a">${fmt(r.netto)}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8"/>
  <title>Compensi ${anno} — ${club?.nome ?? ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }
    .header { border-bottom: 3px solid #1a1a1a; padding: 16px 0 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .header-left h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; }
    .header-left p { font-size: 11px; color: #555; margin-top: 2px; }
    .header-right { font-size: 10px; color: #777; text-align: right; }
    .kpi { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
    .kpi-box { border: 1px solid #e5e5e5; border-radius: 5px; padding: 9px 12px; }
    .kpi-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 3px; }
    .kpi-value { font-size: 14px; font-weight: 900; font-family: monospace; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #1a1a1a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    thead tr { background: #1a1a1a; color: #fff; }
    thead th { padding: 6px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; text-align: left; font-weight: 700; }
    tbody tr { border-bottom: 1px solid #e5e5e5; }
    tbody tr:nth-child(even) { background: #f8f8f8; }
    td { padding: 6px 8px; vertical-align: middle; }
    tfoot tr { background: #f3f4f6; border-top: 2px solid #1a1a1a; }
    tfoot td { padding: 7px 8px; font-weight: 700; }
    .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; display: flex; justify-content: space-between; font-size: 9px; color: #999; }
    .legal { margin-top: 12px; padding: 10px 14px; background: #f9fafb; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 9px; color: #666; line-height: 1.6; }
    @page { margin: 12mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead tr { background: #1a1a1a !important; }
      .section-title { page-break-before: auto; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${club?.nome ?? 'Società Sportiva'}</h1>
      <p>Compensi Collaboratori — Anno ${anno}${club?.citta ? ' · ' + club.citta : ''} · D.Lgs. 36/2021 Riforma Sport</p>
    </div>
    <div class="header-right">Stampato il ${oggi}</div>
  </div>

  <div class="kpi">
    <div class="kpi-box">
      <div class="kpi-label">Totale lordo ${anno}</div>
      <div class="kpi-value">${fmt(totLordo)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Ritenute versate</div>
      <div class="kpi-value" style="color:#dc2626">${fmt(totRitenuta)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Totale netto</div>
      <div class="kpi-value" style="color:#16a34a">${fmt(totNetto)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Collaboratori</div>
      <div class="kpi-value">${report.length}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Sopra soglia €5k</div>
      <div class="kpi-value" style="color:${sopraSoglia > 0 ? '#d97706' : '#1a1a1a'}">${sopraSoglia}</div>
    </div>
  </div>

  <div class="section-title">Report per Collaboratore — Anno ${anno}</div>
  <table>
    <thead>
      <tr>
        <th>Collaboratore</th>
        <th style="text-align:center;width:40px">N°</th>
        <th style="text-align:right">Totale lordo</th>
        <th style="text-align:right">Quota esente</th>
        <th style="text-align:right">Quota imponibile</th>
        <th style="text-align:right">Ritenuta totale</th>
        <th style="text-align:right">Totale netto</th>
      </tr>
    </thead>
    <tbody>${righeReport || '<tr><td colspan="7" style="text-align:center;padding:16px;color:#999">Nessun compenso</td></tr>'}</tbody>
    ${report.length > 0 ? `
    <tfoot>
      <tr>
        <td>TOTALI</td>
        <td style="text-align:center;font-family:monospace">${lista.length}</td>
        <td style="text-align:right;font-family:monospace">${fmt(totLordo)}</td>
        <td style="text-align:right;font-family:monospace;color:#16a34a">${fmt(report.reduce((s,r)=>s+r.esente,0))}</td>
        <td style="text-align:right;font-family:monospace;color:#d97706">${fmt(report.reduce((s,r)=>s+r.imponibile,0))}</td>
        <td style="text-align:right;font-family:monospace;color:#dc2626">${fmt(totRitenuta)}</td>
        <td style="text-align:right;font-family:monospace;color:#16a34a">${fmt(totNetto)}</td>
      </tr>
    </tfoot>` : ''}
  </table>

  <div class="section-title">Dettaglio Compensi — Anno ${anno}</div>
  <table>
    <thead>
      <tr>
        <th>Collaboratore</th>
        <th>Descrizione</th>
        <th style="text-align:center;width:70px">Anno/Mese</th>
        <th style="text-align:right;width:90px">Lordo</th>
        <th style="text-align:right;width:85px">Ritenuta</th>
        <th style="text-align:right;width:85px">Netto</th>
        <th style="text-align:center;width:80px">Soglia</th>
        <th style="text-align:center;width:60px">Metodo</th>
      </tr>
    </thead>
    <tbody>${righeDettaglio || '<tr><td colspan="8" style="text-align:center;padding:16px;color:#999">Nessun compenso registrato</td></tr>'}</tbody>
  </table>

  <div class="legal">
    Documento generato ai sensi del D.Lgs. 36/2021 (Riforma dello Sport). Soglia esenzione fiscale: €5.000,00 annui per collaboratore.
    Le quote eccedenti la soglia sono soggette a ritenuta d'acconto del 23%. Conservare agli atti per eventuali verifiche fiscali.
  </div>

  <div class="footer">
    <span>${club?.nome ?? ''} — Documento generato automaticamente</span>
    <span>${oggi}</span>
  </div>

  <script>window.onload = () => window.print()</script>
</body>
</html>`

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
