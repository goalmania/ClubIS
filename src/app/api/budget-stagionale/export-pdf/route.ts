import { getUserContext } from '@/lib/impersonation'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'
import { fetchLogoHtml } from '@/lib/pdf/logo'

export const dynamic = 'force-dynamic'

const CAT_ENTRATE: Record<string, string> = {
  quote_iscrizioni: 'Quote iscrizioni', sponsor: 'Sponsor',
  contributi_federali: 'Contributi federali', botteghino: 'Botteghino', altro: 'Altro',
}
const CAT_USCITE: Record<string, string> = {
  stipendi: 'Stipendi / ingaggi', rimborsi: 'Rimborsi', attrezzatura: 'Attrezzatura',
  trasferte: 'Trasferte', utenze_impianto: 'Utenze impianto', altro: 'Altro',
}
const MESI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']

function fmt(n: number): string {
  return n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return new Response('Non autenticato', { status: 401 })

  const stagione = req.nextUrl.searchParams.get('stagione') ?? '2026/27'
  const annoInizio = parseInt(stagione.slice(0, 4))
  const admin = createAdminClient()
  const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  const [bs, ep, up, pn, clubRes] = await Promise.all([
    admin.from('budget_stagionale').select('*').eq('club_id', ctx.clubId).eq('stagione_riferimento', stagione).maybeSingle(),
    admin.from('entrate_previste').select('*').eq('club_id', ctx.clubId).eq('stagione_riferimento', stagione).order('mese_riferimento').order('categoria'),
    admin.from('uscite_previste').select('*').eq('club_id', ctx.clubId).eq('stagione_riferimento', stagione).order('mese_riferimento').order('categoria'),
    admin.from('prima_nota').select('tipo, importo, data').eq('club_id', ctx.clubId)
      .gte('data', `${annoInizio}-07-01`).lte('data', `${annoInizio + 1}-06-30`),
    admin.from('clubs').select('nome, citta, logo_url').eq('id', ctx.clubId).single(),
  ])

  const budget = bs.data as any
  const entratePrev = (ep.data ?? []) as any[]
  const uscitePrev = (up.data ?? []) as any[]
  const primaNota = (pn.data ?? []) as any[]
  const club = clubRes.data as any

  const usciteEffettive = primaNota.filter((m: any) => m.tipo === 'uscita').reduce((s: number, m: any) => s + Number(m.importo), 0)
  const entrateEffettive = primaNota.filter((m: any) => m.tipo === 'entrata').reduce((s: number, m: any) => s + Number(m.importo), 0)
  const totEntratePrev = entratePrev.reduce((s: number, v: any) => s + Number(v.importo_previsto), 0)
  const totUscitePrev = uscitePrev.reduce((s: number, v: any) => s + Number(v.importo_previsto), 0)
  const saldoPrevisto = totEntratePrev - totUscitePrev
  const saldoEffettivo = entrateEffettive - usciteEffettive
  const percBudget = budget?.budget_totale_stagione ? Math.round((usciteEffettive / budget.budget_totale_stagione) * 100) : 0

  const righeEntrate = entratePrev.map((v: any) => `
    <tr>
      <td>${v.descrizione}</td>
      <td>${CAT_ENTRATE[v.categoria] ?? v.categoria}</td>
      <td class="right mono green bold">€${fmt(v.importo_previsto)}</td>
      <td class="center">${v.mese_riferimento ? MESI[v.mese_riferimento - 1] : '—'}</td>
      <td>${v.note ?? ''}</td>
    </tr>`).join('')

  const righeUscite = uscitePrev.map((v: any) => `
    <tr>
      <td>${v.descrizione}</td>
      <td>${CAT_USCITE[v.categoria] ?? v.categoria}</td>
      <td class="right mono red bold">€${fmt(v.importo_previsto)}</td>
      <td class="center">${v.mese_riferimento ? MESI[v.mese_riferimento - 1] : '—'}</td>
      <td>${v.note ?? ''}</td>
    </tr>`).join('')

  const datiMensili = MESI.map((lbl, i) => {
    const m = String(i + 1).padStart(2, '0')
    const anno = i < 6 ? annoInizio + 1 : annoInizio
    const key = `${anno}-${m}`
    const effE = primaNota.filter((p: any) => p.tipo === 'entrata' && p.data.startsWith(key)).reduce((s: number, p: any) => s + Number(p.importo), 0)
    const effU = primaNota.filter((p: any) => p.tipo === 'uscita' && p.data.startsWith(key)).reduce((s: number, p: any) => s + Number(p.importo), 0)
    const prevE = entratePrev.filter((v: any) => v.mese_riferimento === i + 1).reduce((s: number, v: any) => s + Number(v.importo_previsto), 0)
    const prevU = uscitePrev.filter((v: any) => v.mese_riferimento === i + 1).reduce((s: number, v: any) => s + Number(v.importo_previsto), 0)
    return { lbl, effE, effU, prevE, prevU }
  }).filter(m => m.prevE > 0 || m.effE > 0 || m.prevU > 0 || m.effU > 0)

  const righeMensili = datiMensili.map(m => `
    <tr>
      <td class="center bold">${m.lbl}</td>
      <td class="right mono">${m.prevE > 0 ? '€' + fmt(m.prevE) : '—'}</td>
      <td class="right mono green">${m.effE > 0 ? '€' + fmt(m.effE) : '—'}</td>
      <td class="right mono">${m.prevU > 0 ? '€' + fmt(m.prevU) : '—'}</td>
      <td class="right mono red">${m.effU > 0 ? '€' + fmt(m.effU) : '—'}</td>
    </tr>`).join('')

  const logoHtml = await fetchLogoHtml(club?.logo_url)

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8"/>
  <title>Budget Stagionale ${stagione} — ${club?.nome ?? ''}</title>
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
    .kpi-value { font-size: 15px; font-weight: 900; font-family: monospace; }
    .kpi-sub { font-size: 8px; color: #aaa; margin-top: 2px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 20px 0 10px; padding-bottom: 4px; border-bottom: 2px solid #1a1a1a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    thead tr { background: #1a1a1a; color: #fff; }
    thead th { padding: 6px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; text-align: left; font-weight: 700; }
    tbody tr { border-bottom: 1px solid #e5e5e5; }
    tbody tr:nth-child(even) { background: #f8f8f8; }
    td { padding: 5px 8px; vertical-align: middle; }
    tfoot tr { background: #f3f4f6; border-top: 2px solid #1a1a1a; }
    tfoot td { padding: 7px 8px; font-weight: 700; }
    .right { text-align: right; }
    .center { text-align: center; }
    .mono { font-family: monospace; }
    .bold { font-weight: 700; }
    .green { color: #16a34a; }
    .red { color: #dc2626; }
    .confronto { margin-top: 12px; border: 1px solid #e5e5e5; border-radius: 6px; padding: 12px 16px; background: #f9fafb; }
    .confronto-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; border-bottom: 1px solid #eee; }
    .confronto-row:last-child { border-bottom: none; font-weight: 700; font-size: 12px; padding-top: 8px; }
    .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; display: flex; justify-content: space-between; font-size: 9px; color: #999; }
    @page { margin: 15mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead tr { background: #1a1a1a !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="display:flex;align-items:center">
      ${logoHtml}
      <div class="header-left">
        <h1>${club?.nome ?? 'Società Sportiva'}</h1>
        <p>Budget Stagionale ${stagione}${club?.citta ? ' · ' + club.citta : ''}</p>
      </div>
    </div>
    <div class="header-right">
      Stampato il ${oggi}
    </div>
  </div>

  <div class="kpi">
    <div class="kpi-box">
      <div class="kpi-label">Tetto budget</div>
      <div class="kpi-value">${budget ? '€' + fmt(budget.budget_totale_stagione) : '—'}</div>
      <div class="kpi-sub">limite stagionale</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Uscite effettive</div>
      <div class="kpi-value red">€${fmt(usciteEffettive)}</div>
      <div class="kpi-sub">da prima nota</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Saldo previsto</div>
      <div class="kpi-value" style="color:${saldoPrevisto >= 0 ? '#16a34a' : '#dc2626'}">${saldoPrevisto >= 0 ? '+' : ''}€${fmt(saldoPrevisto)}</div>
      <div class="kpi-sub">entrate − uscite previste</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Budget consumato</div>
      <div class="kpi-value" style="color:${percBudget >= 90 ? '#dc2626' : percBudget >= 70 ? '#d97706' : '#16a34a'}">${budget ? percBudget + '%' : '—'}</div>
      <div class="kpi-sub">uscite vs tetto</div>
    </div>
  </div>

  <div class="confronto">
    <div class="confronto-row"><span>Entrate previste</span><span class="green">€${fmt(totEntratePrev)}</span></div>
    <div class="confronto-row"><span>Entrate effettive (prima nota)</span><span class="green">€${fmt(entrateEffettive)}</span></div>
    <div class="confronto-row"><span>Uscite previste</span><span class="red">€${fmt(totUscitePrev)}</span></div>
    <div class="confronto-row"><span>Uscite effettive (prima nota)</span><span class="red">€${fmt(usciteEffettive)}</span></div>
    <div class="confronto-row">
      <span>Saldo effettivo</span>
      <span style="color:${saldoEffettivo >= 0 ? '#16a34a' : '#dc2626'}">${saldoEffettivo >= 0 ? '+' : ''}€${fmt(saldoEffettivo)}</span>
    </div>
  </div>

  ${entratePrev.length > 0 ? `
  <div class="section-title">Entrate Previste</div>
  <table>
    <thead><tr><th>Descrizione</th><th>Categoria</th><th style="text-align:right;width:100px">Importo</th><th style="text-align:center;width:60px">Mese</th><th>Note</th></tr></thead>
    <tbody>${righeEntrate}</tbody>
    <tfoot><tr><td colspan="2">Totale entrate previste</td><td class="right mono green">€${fmt(totEntratePrev)}</td><td colspan="2"></td></tr></tfoot>
  </table>` : ''}

  ${uscitePrev.length > 0 ? `
  <div class="section-title">Uscite Previste</div>
  <table>
    <thead><tr><th>Descrizione</th><th>Categoria</th><th style="text-align:right;width:100px">Importo</th><th style="text-align:center;width:60px">Mese</th><th>Note</th></tr></thead>
    <tbody>${righeUscite}</tbody>
    <tfoot><tr><td colspan="2">Totale uscite previste</td><td class="right mono red">€${fmt(totUscitePrev)}</td><td colspan="2"></td></tr></tfoot>
  </table>` : ''}

  ${datiMensili.length > 0 ? `
  <div class="section-title">Andamento Mensile</div>
  <table>
    <thead>
      <tr>
        <th style="width:50px">Mese</th>
        <th style="text-align:right">Entrate Prev.</th>
        <th style="text-align:right">Entrate Eff.</th>
        <th style="text-align:right">Uscite Prev.</th>
        <th style="text-align:right">Uscite Eff.</th>
      </tr>
    </thead>
    <tbody>${righeMensili}</tbody>
  </table>` : ''}

  ${budget?.note_budget ? `
  <div class="section-title">Note</div>
  <div style="padding:10px 14px;border:1px solid #e5e5e5;border-radius:4px;font-size:11px;color:#555;line-height:1.5">${budget.note_budget}</div>
  ` : ''}

  <div class="footer">
    <span>${club?.nome ?? ''} — Documento generato automaticamente</span>
    <span>${oggi}</span>
  </div>

  <script>window.onload = () => window.print()</script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
