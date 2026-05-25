import { getUserContext } from '@/lib/impersonation'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']

function fmt(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return new Response('Non autenticato', { status: 401 })

  const anno = parseInt(req.nextUrl.searchParams.get('anno') ?? String(new Date().getFullYear()))
  const admin = createAdminClient()
  const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  const [{ data: rate }, { data: movimenti }, { data: club }] = await Promise.all([
    admin
      .from('rate_pagamento')
      .select('importo, scadenza, stato, data_pagamento')
      .eq('club_id', ctx.clubId)
      .neq('stato', 'annullata')
      .gte('scadenza', `${anno}-01-01`)
      .lte('scadenza', `${anno}-12-31`),
    admin
      .from('prima_nota')
      .select('tipo, importo, data, stornato')
      .eq('club_id', ctx.clubId)
      .not('stornato', 'eq', true)
      .gte('data', `${anno}-01-01`)
      .lte('data', `${anno}-12-31`),
    admin.from('clubs').select('nome, citta').eq('id', ctx.clubId).single(),
  ])

  const mensili = Array.from({ length: 12 }, (_, m) => ({
    label: MESI[m], previsto: 0, entrate: 0, uscite: 0,
  }))

  for (const r of rate ?? []) {
    const mScad = new Date(r.scadenza).getMonth()
    mensili[mScad].previsto += Number(r.importo)
    if (r.stato === 'pagata' && r.data_pagamento) {
      const dPag = new Date(r.data_pagamento)
      if (dPag.getFullYear() === anno) {
        mensili[dPag.getMonth()].entrate += Number(r.importo)
      }
    }
  }

  for (const m of movimenti ?? []) {
    const mese = new Date(m.data).getMonth()
    if (m.tipo === 'entrata') mensili[mese].entrate += Number(m.importo)
    else if (m.tipo === 'uscita') mensili[mese].uscite += Number(m.importo)
  }

  const totPrevisto = mensili.reduce((s, d) => s + d.previsto, 0)
  const totEntrate = mensili.reduce((s, d) => s + d.entrate, 0)
  const totUscite = mensili.reduce((s, d) => s + d.uscite, 0)
  const saldo = totEntrate - totUscite
  const deltaPrevist = totEntrate - totPrevisto

  const righe = mensili.map((d) => {
    const saldoMese = d.entrate - d.uscite
    const delta = d.entrate - d.previsto
    const pct = d.previsto > 0 ? Math.min(100, Math.round((d.entrate / d.previsto) * 100)) : (d.entrate > 0 ? 100 : 0)
    const barColor = pct >= 100 ? '#16a34a' : '#3b82f6'
    return `
      <tr>
        <td class="bold">${d.label}</td>
        <td class="right mono blue">${fmt(d.previsto)}</td>
        <td class="right mono green">${fmt(d.entrate)}</td>
        <td class="right mono${d.uscite > 0 ? ' red' : ''}">${d.uscite > 0 ? '−' + fmt(d.uscite) : fmt(0)}</td>
        <td class="right mono ${saldoMese >= 0 ? 'green' : 'red'}">${saldoMese >= 0 ? '+' : ''}${fmt(saldoMese)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${barColor}"></div>
            </div>
            <span class="mono" style="font-size:9px;min-width:28px;text-align:right">${pct}%</span>
          </div>
        </td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8"/>
  <title>Rendiconto Finanziario ${anno} — ${club?.nome ?? ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }
    .header { border-bottom: 3px solid #1a1a1a; padding: 16px 0 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .header-left h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; }
    .header-left p { font-size: 11px; color: #555; margin-top: 2px; }
    .header-right { font-size: 10px; color: #777; text-align: right; }
    .kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .kpi-box { border: 1px solid #e5e5e5; border-radius: 6px; padding: 10px 14px; }
    .kpi-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 4px; }
    .kpi-value { font-size: 16px; font-weight: 900; font-family: monospace; }
    .kpi-sub { font-size: 9px; color: #aaa; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1a1a1a; color: #fff; }
    thead th { padding: 7px 10px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; text-align: left; font-weight: 700; }
    th.right, td.right { text-align: right; }
    tbody tr { border-bottom: 1px solid #e5e5e5; }
    tbody tr:nth-child(even) { background: #f8f8f8; }
    td { padding: 7px 10px; vertical-align: middle; }
    tfoot tr { background: #f3f4f6; border-top: 2px solid #1a1a1a; }
    tfoot td { padding: 8px 10px; font-weight: 700; }
    .mono { font-family: monospace; }
    .bold { font-weight: 700; }
    .right { text-align: right; }
    .blue { color: #3b82f6; }
    .green { color: #16a34a; }
    .red { color: #dc2626; }
    .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; display: flex; justify-content: space-between; font-size: 9px; color: #999; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead tr { background: #1a1a1a !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${club?.nome ?? 'Società Sportiva'}</h1>
      <p>Rendiconto Finanziario — Anno ${anno}${club?.citta ? ' · ' + club.citta : ''}</p>
    </div>
    <div class="header-right">
      Stampato il ${oggi}
    </div>
  </div>

  <div class="kpi">
    <div class="kpi-box">
      <div class="kpi-label">Rate attese ${anno}</div>
      <div class="kpi-value blue">${fmt(totPrevisto)}</div>
      <div class="kpi-sub">da piani di pagamento</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Entrate reali ${anno}</div>
      <div class="kpi-value green">${fmt(totEntrate)}</div>
      <div class="kpi-sub">rate pagate + prima nota</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Uscite ${anno}</div>
      <div class="kpi-value red">${fmt(totUscite)}</div>
      <div class="kpi-sub">da prima nota</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Saldo netto</div>
      <div class="kpi-value" style="color:${saldo >= 0 ? '#16a34a' : '#dc2626'}">${saldo >= 0 ? '+' : ''}${fmt(saldo)}</div>
      <div class="kpi-sub" style="color:${deltaPrevist >= 0 ? '#16a34a' : '#dc2626'}">${deltaPrevist >= 0 ? '+' : ''}${fmt(deltaPrevist)} vs atteso</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Mese</th>
        <th class="right">Rate attese</th>
        <th class="right">Entrate reali</th>
        <th class="right">Uscite</th>
        <th class="right">Saldo netto</th>
        <th style="width:120px">Incasso vs atteso</th>
      </tr>
    </thead>
    <tbody>${righe}</tbody>
    <tfoot>
      <tr>
        <td>Totale ${anno}</td>
        <td class="right mono blue">${fmt(totPrevisto)}</td>
        <td class="right mono green">${fmt(totEntrate)}</td>
        <td class="right mono red">${totUscite > 0 ? '−' + fmt(totUscite) : fmt(0)}</td>
        <td class="right mono ${saldo >= 0 ? 'green' : 'red'}">${saldo >= 0 ? '+' : ''}${fmt(saldo)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    <span>${club?.nome ?? ''} — Documento generato automaticamente</span>
    <span>${oggi}</span>
  </div>

  <script>window.onload = () => window.print()</script>
</body>
</html>`

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
