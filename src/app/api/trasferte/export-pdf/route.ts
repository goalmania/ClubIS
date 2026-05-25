import { getUserContext } from '@/lib/impersonation'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchLogoHtml } from '@/lib/pdf/logo'

export const dynamic = 'force-dynamic'

const COSTI_JSON_START = '__COSTI_TRASFERTE_JSON_START__'
const COSTI_JSON_END = '__COSTI_TRASFERTE_JSON_END__'

function parseNote(note: string | null): { competizione: string; noteLibere: string } {
  if (!note) return { competizione: '', noteLibere: '' }
  const s = note.indexOf(COSTI_JSON_START)
  const e = note.indexOf(COSTI_JSON_END)
  if (s === -1 || e === -1) return { competizione: '', noteLibere: note.trim() }
  const noteLibere = note.slice(e + COSTI_JSON_END.length).trim()
  try {
    const obj = JSON.parse(note.slice(s + COSTI_JSON_START.length, e))
    return { competizione: obj?.competizione_evento ?? '', noteLibere }
  } catch {
    return { competizione: '', noteLibere }
  }
}

function fmt(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return new Response('Non autenticato', { status: 401 })

  const admin = createAdminClient()
  const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  const [{ data: trasferte }, { data: club }] = await Promise.all([
    admin
      .from('trasferte')
      .select('id, destinazione, data_partenza, data_rientro, mezzo, costo_stimato, costo_effettivo, note, stato, partita_id')
      .eq('club_id', ctx.clubId)
      .order('data_partenza', { ascending: false }),
    admin.from('clubs').select('nome, citta, logo_url').eq('id', ctx.clubId).single(),
  ])

  const lista = (trasferte ?? []) as any[]
  const totStimato = lista.reduce((s: number, t: any) => s + Number(t.costo_stimato ?? 0), 0)
  const totEffettivo = lista.reduce((s: number, t: any) => s + Number(t.costo_effettivo ?? 0), 0)
  const countByStato: Record<string, number> = {}
  lista.forEach((t: any) => { const s = t.stato ?? 'programmata'; countByStato[s] = (countByStato[s] ?? 0) + 1 })

  const STATO_COLOR: Record<string, string> = { completata: '#16a34a', annullata: '#dc2626', programmata: '#3b82f6', in_corso: '#d97706' }

  const righe = lista.map((t: any) => {
    const stato = t.stato ?? 'programmata'
    const color = STATO_COLOR[stato] ?? '#6b7280'
    const dataPartenza = t.data_partenza ? new Date(t.data_partenza).toLocaleDateString('it-IT') : '—'
    const dataRientro = t.data_rientro && t.data_rientro !== t.data_partenza ? new Date(t.data_rientro).toLocaleDateString('it-IT') : null
    const delta = t.costo_effettivo && t.costo_stimato ? Number(t.costo_effettivo) - Number(t.costo_stimato) : null
    const { competizione, noteLibere } = parseNote(t.note)
    return `
      <tr>
        <td>
          <strong>${t.destinazione ?? '—'}</strong>
          ${competizione ? `<br/><span style="font-size:9px;color:#555;font-weight:600">${competizione}</span>` : ''}
          ${noteLibere ? `<br/><span style="font-size:9px;color:#888;font-style:italic">${noteLibere}</span>` : ''}
        </td>
        <td style="font-family:monospace;font-size:10px">
          ${dataPartenza}${dataRientro ? `<br/>→ ${dataRientro}` : ''}
        </td>
        <td style="text-transform:capitalize">${t.mezzo ?? '—'}</td>
        <td style="text-align:right;font-family:monospace">${t.costo_stimato ? fmt(Number(t.costo_stimato)) : '—'}</td>
        <td style="text-align:right;font-family:monospace;color:#16a34a;font-weight:700">${t.costo_effettivo ? fmt(Number(t.costo_effettivo)) : '—'}</td>
        <td style="text-align:right;font-family:monospace;font-size:10px;color:${delta != null ? (delta > 0 ? '#dc2626' : '#16a34a') : '#9ca3af'}">
          ${delta != null ? (delta >= 0 ? '+' : '') + fmt(delta) : '—'}
        </td>
        <td style="text-align:center">
          <span style="background:${color}22;color:${color};padding:2px 8px;border-radius:4px;font-size:9px;font-weight:700;border:1px solid ${color}55;text-transform:capitalize">
            ${stato}
          </span>
        </td>
      </tr>`
  }).join('')

  const logoHtml = await fetchLogoHtml(club?.logo_url)

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8"/>
  <title>Trasferte — ${club?.nome ?? ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }
    .header { border-bottom: 3px solid #1a1a1a; padding: 16px 0 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .header-left h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; }
    .header-left p { font-size: 11px; color: #555; margin-top: 2px; }
    .header-right { font-size: 10px; color: #777; text-align: right; }
    .kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .kpi-box { border: 1px solid #e5e5e5; border-radius: 6px; padding: 10px 14px; }
    .kpi-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 3px; }
    .kpi-value { font-size: 16px; font-weight: 900; font-family: monospace; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1a1a1a; color: #fff; }
    thead th { padding: 7px 10px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; text-align: left; font-weight: 700; }
    tbody tr { border-bottom: 1px solid #e5e5e5; }
    tbody tr:nth-child(even) { background: #f8f8f8; }
    td { padding: 8px 10px; vertical-align: middle; }
    tfoot tr { background: #f3f4f6; border-top: 2px solid #1a1a1a; }
    tfoot td { padding: 8px 10px; font-weight: 700; }
    .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; display: flex; justify-content: space-between; font-size: 9px; color: #999; }
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
        <p>Trasferte — Organizzazione e budget spostamenti${club?.citta ? ' · ' + club.citta : ''}</p>
      </div>
    </div>
    <div class="header-right">Stampato il ${oggi}<br/>${lista.length} trasferte</div>
  </div>

  <div class="kpi">
    <div class="kpi-box">
      <div class="kpi-label">Totale trasferte</div>
      <div class="kpi-value">${lista.length}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Costo stimato</div>
      <div class="kpi-value" style="color:#d97706">${fmt(totStimato)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Costo effettivo</div>
      <div class="kpi-value" style="color:#16a34a">${fmt(totEffettivo)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Scostamento</div>
      <div class="kpi-value" style="color:${totEffettivo - totStimato > 0 ? '#dc2626' : '#16a34a'}">
        ${totEffettivo > 0 || totStimato > 0 ? (totEffettivo - totStimato >= 0 ? '+' : '') + fmt(totEffettivo - totStimato) : '—'}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Destinazione</th>
        <th style="width:90px">Date</th>
        <th style="width:80px">Mezzo</th>
        <th style="text-align:right;width:80px">Stimato</th>
        <th style="text-align:right;width:80px">Effettivo</th>
        <th style="text-align:right;width:75px">Delta</th>
        <th style="text-align:center;width:80px">Stato</th>
      </tr>
    </thead>
    <tbody>
      ${righe || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#999">Nessuna trasferta registrata</td></tr>'}
    </tbody>
    ${lista.length > 0 ? `
    <tfoot>
      <tr>
        <td colspan="3">Totali</td>
        <td style="text-align:right;font-family:monospace;color:#d97706">${fmt(totStimato)}</td>
        <td style="text-align:right;font-family:monospace;color:#16a34a">${fmt(totEffettivo)}</td>
        <td style="text-align:right;font-family:monospace;color:${totEffettivo - totStimato > 0 ? '#dc2626' : '#16a34a'}">
          ${(totEffettivo - totStimato >= 0 ? '+' : '') + fmt(totEffettivo - totStimato)}
        </td>
        <td></td>
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

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
