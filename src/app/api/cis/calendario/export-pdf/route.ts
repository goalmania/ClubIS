import { getUserContext } from '@/lib/impersonation'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'
import { fetchLogoHtml } from '@/lib/pdf/logo'

export const dynamic = 'force-dynamic'

const TIP_LABEL: Record<string, string> = {
  allenamento: 'Allenamento', partita: 'Partita', riunione: 'Riunione',
  visita_medica: 'Visita medica', trasferta: 'Trasferta',
}
const TIP_COLOR: Record<string, string> = {
  allenamento: '#3b82f6', partita: '#16a34a', riunione: '#8b5cf6',
  visita_medica: '#ef4444', trasferta: '#f59e0b',
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

  const [{ data: eventi }, { data: club }] = await Promise.all([
    admin
      .from('eventi_calendario')
      .select('id, tipologia, data, data_ora_inizio, data_ora_fine, luogo_testo, priorita, note')
      .eq('club_id', ctx.clubId)
      .lt('data_ora_inizio', end)
      .gt('data_ora_fine', start)
      .order('data_ora_inizio', { ascending: true }),
    admin.from('clubs').select('nome, citta, logo_url').eq('id', ctx.clubId).single(),
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
      const tipColor = TIP_COLOR[ev.tipologia] ?? '#9ca3af'
      const priColor = PRI_COLOR[ev.priorita] ?? '#9ca3af'
      return `
        <tr>
          <td style="width:8px;padding:0;background:${tipColor}"></td>
          <td style="width:90px;padding:8px 10px;font-family:monospace;font-size:11px;color:#555;font-weight:600">${startT}<br/><span style="color:#999;font-size:10px">${endT}</span></td>
          <td style="padding:8px 10px">
            <div style="font-weight:700;font-size:12px;color:#1a1a1a">${TIP_LABEL[ev.tipologia] ?? ev.tipologia}</div>
            ${ev.luogo_testo ? `<div style="color:#6b7280;font-size:10px;margin-top:2px">📍 ${ev.luogo_testo}</div>` : ''}
            ${ev.note ? `<div style="font-size:10px;color:#888;font-style:italic;margin-top:2px">${ev.note}</div>` : ''}
          </td>
          <td style="width:80px;text-align:right;padding:8px 10px">
            <span style="background:${priColor}22;color:${priColor};padding:2px 8px;border-radius:4px;font-size:9px;font-weight:700;border:1px solid ${priColor}55">
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

  const logoHtml = await fetchLogoHtml(club?.logo_url)

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8"/>
  <title>Calendario — ${club?.nome ?? ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; padding: 24px; }
    .header { border-bottom: 3px solid #1a1a1a; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .header-brand { display: flex; align-items: center; }
    .header-left h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; }
    .header-left p { font-size: 11px; color: #555; margin-top: 3px; }
    .header-right { font-size: 10px; color: #777; text-align: right; }
    .summary { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 22px; }
    .summary-chip { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 20px; padding: 4px 14px; font-size: 10px; font-weight: 600; color: #374151; display: flex; align-items: center; gap: 6px; }
    .tip-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .day-block { margin-bottom: 16px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
    .day-header { font-size: 12px; font-weight: 700; text-transform: capitalize; color: #fff; padding: 7px 12px; background: #1a1a1a; }
    .events-table { width: 100%; border-collapse: collapse; }
    .events-table tr { border-bottom: 1px solid #f0f0f0; }
    .events-table tr:last-child { border-bottom: none; }
    .events-table td { vertical-align: middle; }
    .empty { padding: 50px; text-align: center; color: #9ca3af; font-size: 13px; border: 1px solid #e5e7eb; border-radius: 6px; }
    .footer { margin-top: 24px; border-top: 1px solid #ccc; padding-top: 8px; display: flex; justify-content: space-between; font-size: 9px; color: #999; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0; }
      .day-block { page-break-inside: avoid; }
      .day-header { background: #1a1a1a !important; color: #fff !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-brand">
      ${logoHtml}
      <div class="header-left">
        <h1>${club?.nome ?? 'Società Sportiva'}</h1>
        <p>Calendario eventi — dal ${startLabel} al ${endLabel}${club?.citta ? ' · ' + club.citta : ''}</p>
      </div>
    </div>
    <div class="header-right">Stampato il ${oggi}<br/><strong>${lista.length} eventi</strong></div>
  </div>

  <div class="summary">
    <div class="summary-chip">Totale: <strong>${lista.length}</strong></div>
    ${Object.entries(countTip).map(([tip, n]) => `
      <div class="summary-chip">
        <span class="tip-dot" style="background:${TIP_COLOR[tip] ?? '#9ca3af'}"></span>
        ${TIP_LABEL[tip] ?? tip}: <strong>${n}</strong>
      </div>`).join('')}
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
