import { getUserContext } from '@/lib/impersonation'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const TIP_LABEL: Record<string, string> = {
  allenamento: 'Allenamento', partita: 'Partita', riunione: 'Riunione',
  visita_medica: 'Visita medica', trasferta: 'Trasferta',
}
const PRI_LABEL: Record<string, string> = {
  bassa: 'Bassa', media: 'Media', alta: 'Alta', urgente: 'Urgente',
}
const PRI_COLOR: Record<string, string> = {
  bassa: '#94a3b8', media: '#3b82f6', alta: '#f59e0b', urgente: '#ef4444',
}

export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return new Response('Non autenticato', { status: 401 })

  const start = req.nextUrl.searchParams.get('start') ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const end = req.nextUrl.searchParams.get('end') ?? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()

  const admin = createAdminClient()
  const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  // Auth check
  const { data: utente } = await admin.from('utenti').select('club_id').eq('id', ctx.userId).single()
  if (!utente?.club_id) return new Response('Non autorizzato', { status: 403 })

  const [{ data: eventi }, { data: club }] = await Promise.all([
    admin
      .from('eventi_calendario')
      .select('id, tipologia, data, data_ora_inizio, data_ora_fine, luogo_testo, priorita, note, partecipanti')
      .eq('club_id', utente.club_id)
      .gte('data_ora_inizio', start)
      .lte('data_ora_inizio', end)
      .order('data_ora_inizio', { ascending: true }),
    admin.from('clubs').select('nome, citta').eq('id', utente.club_id).single(),
  ])

  const lista = (eventi ?? []) as any[]

  const startLabel = new Date(start).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
  const endLabel = new Date(end).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  // Raggruppa per data
  const perData: Record<string, any[]> = {}
  lista.forEach((ev: any) => {
    const d = ev.data ?? ev.data_ora_inizio?.split('T')[0] ?? 'N/D'
    if (!perData[d]) perData[d] = []
    perData[d].push(ev)
  })

  const blocks = Object.entries(perData).map(([data, evs]) => {
    const dataLabel = new Date(data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    const righe = evs.map((ev: any) => {
      const startT = ev.data_ora_inizio ? new Date(ev.data_ora_inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '—'
      const endT = ev.data_ora_fine ? new Date(ev.data_ora_fine).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '—'
      const color = PRI_COLOR[ev.priorita] ?? '#9ca3af'
      return `
        <tr>
          <td style="width:90px;font-family:monospace;font-size:10px;color:#555">${startT} – ${endT}</td>
          <td style="width:16px;padding:0 4px"><div style="width:8px;height:8px;border-radius:50%;background:${color};margin:0 auto"></div></td>
          <td>
            <strong>${TIP_LABEL[ev.tipologia] ?? ev.tipologia}</strong>
            ${ev.luogo_testo ? `<span style="color:#777;font-size:10px"> · ${ev.luogo_testo}</span>` : ''}
            ${ev.note ? `<br/><span style="font-size:10px;color:#888;font-style:italic">${ev.note}</span>` : ''}
          </td>
          <td style="width:70px;text-align:center">
            <span style="background:${color}22;color:${color};padding:2px 7px;border-radius:4px;font-size:9px;font-weight:700;border:1px solid ${color}55">
              ${PRI_LABEL[ev.priorita] ?? ev.priorita}
            </span>
          </td>
        </tr>`
    }).join('')
    return `
      <div class="day-block">
        <div class="day-header">${dataLabel.charAt(0).toUpperCase() + dataLabel.slice(1)}</div>
        <table class="events-table">
          <tbody>${righe}</tbody>
        </table>
      </div>`
  }).join('')

  // Conteggio per tipologia
  const countTip: Record<string, number> = {}
  lista.forEach((ev: any) => { countTip[ev.tipologia] = (countTip[ev.tipologia] ?? 0) + 1 })

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8"/>
  <title>Calendario — ${club?.nome ?? ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }
    .header { border-bottom: 3px solid #1a1a1a; padding: 16px 0 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .header-left h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; }
    .header-left p { font-size: 11px; color: #555; margin-top: 2px; }
    .header-right { font-size: 10px; color: #777; text-align: right; }
    .summary { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
    .summary-chip { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 20px; padding: 4px 12px; font-size: 10px; font-weight: 600; color: #374151; }
    .day-block { margin-bottom: 18px; }
    .day-header { font-size: 12px; font-weight: 700; text-transform: capitalize; color: #1a1a1a; padding: 6px 10px; background: #f3f4f6; border-left: 4px solid #1a1a1a; margin-bottom: 0; }
    .events-table { width: 100%; border-collapse: collapse; }
    .events-table td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
    .events-table tr:last-child td { border-bottom: none; }
    .empty { padding: 40px; text-align: center; color: #9ca3af; font-size: 13px; }
    .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; display: flex; justify-content: space-between; font-size: 9px; color: #999; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .day-block { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${club?.nome ?? 'Società Sportiva'}</h1>
      <p>Calendario eventi — dal ${startLabel} al ${endLabel}${club?.citta ? ' · ' + club.citta : ''}</p>
    </div>
    <div class="header-right">Stampato il ${oggi}<br/>${lista.length} eventi</div>
  </div>

  <div class="summary">
    <div class="summary-chip">Totale: ${lista.length} eventi</div>
    ${Object.entries(countTip).map(([tip, n]) => `<div class="summary-chip">${TIP_LABEL[tip] ?? tip}: ${n}</div>`).join('')}
  </div>

  ${lista.length === 0
    ? '<div class="empty">Nessun evento nel periodo selezionato</div>'
    : blocks
  }

  <div class="footer">
    <span>${club?.nome ?? ''} — Documento generato automaticamente</span>
    <span>${oggi}</span>
  </div>

  <script>window.onload = () => window.print()</script>
</body>
</html>`

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
