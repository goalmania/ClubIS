import { getUserContext } from '@/lib/impersonation'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const categoriaLabel: Record<string, string> = {
  quote_iscrizione: 'Quote iscrizione',
  sponsorizzazioni: 'Sponsorizzazioni',
  proventi_gare: 'Proventi gare',
  stipendi: 'Stipendi',
  compensi_staff: 'Compensi staff',
  trasferte: 'Trasferte',
  materiale_sportivo: 'Materiale sportivo',
  affitto_strutture: 'Affitto strutture',
  utenze: 'Utenze',
  federazione: 'Federazione',
  altro: 'Altro',
}

function fmt(n: number): string {
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return new Response('Non autenticato', { status: 401 })

  const mese = req.nextUrl.searchParams.get('mese') ?? new Date().toISOString().slice(0, 7)
  const [anno, meseNum] = mese.split('-')
  const admin = createAdminClient()

  const [{ data: movimenti }, { data: club }] = await Promise.all([
    admin
      .from('prima_nota')
      .select('id, tipo, categoria, importo, data, descrizione, note, stornato')
      .eq('club_id', ctx.clubId)
      .gte('data', `${mese}-01`)
      .lte('data', `${mese}-31`)
      .order('data', { ascending: true }),
    admin.from('clubs').select('nome, citta').eq('id', ctx.clubId).single(),
  ])

  const lista = (movimenti ?? []) as any[]
  const attivi = lista.filter((m: any) => !m.stornato)
  const totEntrate = attivi.filter((m: any) => m.tipo === 'entrata').reduce((s: number, m: any) => s + Number(m.importo), 0)
  const totUscite = attivi.filter((m: any) => m.tipo === 'uscita').reduce((s: number, m: any) => s + Number(m.importo), 0)
  const saldo = totEntrate - totUscite

  const nomeMese = new Date(`${mese}-01`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  const righe = lista.map((m: any) => {
    const isStornato = !!m.stornato
    const isStorno = m.descrizione?.startsWith('STORNO:')
    const coloreTipo = m.tipo === 'entrata' ? '#16a34a' : '#dc2626'
    const segno = m.tipo === 'entrata' ? '+' : '−'
    const tag = isStornato ? ' <span class="tag-stornato">STORNATO</span>' : isStorno ? ' <span class="tag-storno">STORNO</span>' : ''
    return `
      <tr style="${isStornato ? 'opacity:0.45;' : ''}">
        <td class="mono">${new Date(m.data).toLocaleDateString('it-IT')}</td>
        <td><span class="tipo-${m.tipo}">${m.tipo.toUpperCase()}</span>${tag}</td>
        <td>${categoriaLabel[m.categoria] ?? m.categoria?.replace(/_/g, ' ') ?? '—'}</td>
        <td>
          ${m.descrizione ?? ''}
          ${m.note ? `<br/><span class="note">${m.note}</span>` : ''}
        </td>
        <td class="right mono bold" style="color:${coloreTipo};${isStornato ? 'text-decoration:line-through;' : ''}">
          ${segno}€${fmt(Number(m.importo))}
        </td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8"/>
  <title>Prima Nota ${nomeMese} — ${club?.nome ?? ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }
    .header { border-bottom: 3px solid #1a1a1a; padding: 16px 0 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .header-left h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; }
    .header-left p { font-size: 11px; color: #555; margin-top: 2px; }
    .header-right { font-size: 10px; color: #777; text-align: right; }
    .kpi { display: flex; gap: 16px; margin-bottom: 20px; }
    .kpi-box { flex: 1; border: 1px solid #e5e5e5; border-radius: 6px; padding: 12px 16px; }
    .kpi-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 4px; }
    .kpi-value { font-size: 18px; font-weight: 900; font-family: monospace; }
    .kpi-entrate .kpi-value { color: #16a34a; }
    .kpi-uscite .kpi-value { color: #dc2626; }
    .kpi-saldo .kpi-value { color: ${saldo >= 0 ? '#16a34a' : '#dc2626'}; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1a1a1a; color: #fff; }
    thead th { padding: 7px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; text-align: left; font-weight: 700; }
    tbody tr { border-bottom: 1px solid #e5e5e5; }
    tbody tr:nth-child(even) { background: #f8f8f8; }
    td { padding: 6px 8px; vertical-align: middle; }
    .right { text-align: right; }
    .mono { font-family: monospace; font-size: 10px; }
    .bold { font-weight: 700; }
    .tipo-entrata { background: #dcfce7; color: #16a34a; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; }
    .tipo-uscita { background: #fee2e2; color: #dc2626; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; }
    .tag-stornato { background: #e5e7eb; color: #6b7280; padding: 1px 5px; border-radius: 3px; font-size: 8px; font-weight: 700; margin-left: 4px; }
    .tag-storno { background: #fef3c7; color: #d97706; padding: 1px 5px; border-radius: 3px; font-size: 8px; font-weight: 700; margin-left: 4px; }
    .note { font-size: 9px; color: #999; font-style: italic; }
    tfoot tr { background: #f3f4f6; border-top: 2px solid #1a1a1a; }
    tfoot td { padding: 8px; font-weight: 700; }
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
      <p>Prima Nota — ${nomeMese}${club?.citta ? ' · ' + club.citta : ''}</p>
    </div>
    <div class="header-right">
      Stampato il ${oggi}<br/>
      ${lista.length} movimenti registrati
    </div>
  </div>

  <div class="kpi">
    <div class="kpi-box kpi-entrate">
      <div class="kpi-label">Entrate</div>
      <div class="kpi-value">+€${fmt(totEntrate)}</div>
    </div>
    <div class="kpi-box kpi-uscite">
      <div class="kpi-label">Uscite</div>
      <div class="kpi-value">−€${fmt(totUscite)}</div>
    </div>
    <div class="kpi-box kpi-saldo">
      <div class="kpi-label">Saldo</div>
      <div class="kpi-value">${saldo >= 0 ? '+' : '−'}€${fmt(Math.abs(saldo))}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:80px">Data</th>
        <th style="width:70px">Tipo</th>
        <th style="width:110px">Categoria</th>
        <th>Descrizione</th>
        <th style="width:100px; text-align:right">Importo</th>
      </tr>
    </thead>
    <tbody>
      ${righe || '<tr><td colspan="5" style="text-align:center;padding:20px;color:#999">Nessun movimento registrato</td></tr>'}
    </tbody>
    ${lista.length > 0 ? `
    <tfoot>
      <tr>
        <td colspan="3" style="font-size:10px;color:#555">Totali mese (movimenti non stornati: ${attivi.length})</td>
        <td style="text-align:right;font-size:10px;color:#16a34a">Entrate: +€${fmt(totEntrate)}</td>
        <td style="text-align:right;font-size:12px;color:${saldo >= 0 ? '#16a34a' : '#dc2626'}">
          Saldo: ${saldo >= 0 ? '+' : '−'}€${fmt(Math.abs(saldo))}
        </td>
      </tr>
    </tfoot>` : ''}
  </table>

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
