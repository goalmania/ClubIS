import { getUserContext } from '@/lib/impersonation'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchLogoHtml } from '@/lib/pdf/logo'

export const dynamic = 'force-dynamic'

const CATEGORIA_ORDER: Record<string, number> = {
  prima_squadra: 0, primavera: 1, juniores: 2,
  u19: 3, u17: 4, u16: 5, u15: 6, u14: 7,
  u12: 8, u10: 9, u8: 10, u6: 11, femminile: 12,
}

const ruoloLabel: Record<string, string> = {
  portiere: 'POR', difensore_centrale: 'DC', terzino: 'TRZ',
  centrocampista_difensivo: 'CDM', centrocampista: 'CEN',
  trequartista: 'TRQ', ala: 'ALA', seconda_punta: '2AP', centravanti: 'ATT',
}

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return new Response('Non autenticato', { status: 401 })

  const admin = createAdminClient()
  const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  const [{ data: tesseramenti }, { data: presenze }, { data: club }] = await Promise.all([
    admin
      .from('tesseramenti')
      .select('numero_maglia, giocatori(id, nome, cognome, ruolo_principale), squadre(nome, categoria_eta)')
      .eq('club_id', ctx.clubId)
      .eq('stato', 'attivo'),
    admin
      .from('presenze')
      .select('giocatore_id, presente, stato')
      .eq('club_id', ctx.clubId),
    admin.from('clubs').select('nome, citta, logo_url').eq('id', ctx.clubId).single(),
  ])

  // Raggruppa presenze per giocatore
  const grouped = new Map<string, any[]>()
  ;(presenze ?? []).forEach((p: any) => {
    const arr = grouped.get(p.giocatore_id) ?? []
    arr.push(p)
    grouped.set(p.giocatore_id, arr)
  })

  // Mappa giocatori con statistiche
  const rows = (tesseramenti ?? [])
    .filter((t: any) => t.giocatori)
    .map((t: any) => {
      const g = t.giocatori
      const pr = grouped.get(g.id) ?? []
      const tot = pr.length
      const presenti = pr.filter((p: any) => p.presente).length
      const assenti = pr.filter((p: any) => !p.presente).length
      const giustificate = pr.filter((p: any) => !p.presente && p.stato === 'giustificato').length
      const pct = tot > 0 ? Math.round((presenti / tot) * 100) : 0
      const catOrder = CATEGORIA_ORDER[t.squadre?.categoria_eta ?? ''] ?? 99
      return { g, numero_maglia: t.numero_maglia, squadra: t.squadre?.nome, catOrder, tot, presenti, assenti, giustificate, pct }
    })
    .sort((a, b) => {
      if (a.catOrder !== b.catOrder) return a.catOrder - b.catOrder
      return (a.g.cognome ?? '').localeCompare(b.g.cognome ?? '')
    })

  const totMedia = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0
  const senzaDati = rows.filter(r => r.tot === 0).length
  const sotto60 = rows.filter(r => r.tot > 0 && r.pct < 60).length

  const righe = rows.map(r => {
    const barColor = r.pct >= 80 ? '#16a34a' : r.pct >= 60 ? '#d97706' : '#dc2626'
    const allertaColor = r.pct < 60 && r.tot > 0 ? '#dc2626' : 'inherit'
    return `
      <tr>
        <td style="width:32px;text-align:center;font-family:monospace;font-size:11px;color:#777;font-weight:700">
          ${r.numero_maglia ? '#' + r.numero_maglia : '—'}
        </td>
        <td>
          <strong style="color:${allertaColor}">${r.g.cognome ?? ''} ${r.g.nome ?? ''}</strong>
          ${r.squadra ? `<br/><span style="font-size:9px;color:#9ca3af">${r.squadra}</span>` : ''}
        </td>
        <td style="text-align:center;font-size:10px">${r.g.ruolo_principale ? (ruoloLabel[r.g.ruolo_principale] ?? r.g.ruolo_principale) : '—'}</td>
        <td style="text-align:center;color:#16a34a;font-weight:700">${r.presenti}</td>
        <td style="text-align:center;color:#d97706">${r.giustificate}</td>
        <td style="text-align:center;color:#dc2626">${r.assenti - r.giustificate > 0 ? r.assenti - r.giustificate : 0}</td>
        <td style="text-align:center;font-family:monospace;font-weight:700;color:#777">${r.tot}</td>
        <td style="width:130px">
          <div style="display:flex;align-items:center;gap:6px">
            <div style="flex:1;height:7px;background:#e5e7eb;border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${r.pct}%;background:${barColor}"></div>
            </div>
            <span style="font-size:10px;font-family:monospace;font-weight:700;min-width:32px;text-align:right;color:${barColor}">${r.pct}%</span>
          </div>
        </td>
      </tr>`
  }).join('')

  const logoHtml = await fetchLogoHtml(club?.logo_url)

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8"/>
  <title>Presenze — ${club?.nome ?? ''}</title>
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
    .kpi-value { font-size: 18px; font-weight: 900; font-family: monospace; }
    .legend { display: flex; gap: 16px; margin-bottom: 14px; font-size: 10px; }
    .legend-item { display: flex; align-items: center; gap: 5px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1a1a1a; color: #fff; }
    thead th { padding: 7px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; text-align: left; font-weight: 700; }
    tbody tr { border-bottom: 1px solid #e5e5e5; }
    tbody tr:nth-child(even) { background: #f8f8f8; }
    td { padding: 7px 8px; vertical-align: middle; }
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
    <div style="display:flex;align-items:center">
      ${logoHtml}
      <div class="header-left">
        <h1>${club?.nome ?? 'Società Sportiva'}</h1>
        <p>Riepilogo Presenze Allenamenti${club?.citta ? ' · ' + club.citta : ''}</p>
      </div>
    </div>
    <div class="header-right">Stampato il ${oggi}<br/>${rows.length} giocatori</div>
  </div>

  <div class="kpi">
    <div class="kpi-box">
      <div class="kpi-label">Giocatori monitorati</div>
      <div class="kpi-value">${rows.length}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Media presenze</div>
      <div class="kpi-value" style="color:${totMedia >= 80 ? '#16a34a' : totMedia >= 60 ? '#d97706' : '#dc2626'}">${totMedia}%</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Sotto 60% presenze</div>
      <div class="kpi-value" style="color:${sotto60 > 0 ? '#dc2626' : '#16a34a'}">${sotto60}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Senza dati</div>
      <div class="kpi-value" style="color:${senzaDati > 0 ? '#9ca3af' : '#16a34a'}">${senzaDati}</div>
    </div>
  </div>

  <div class="legend">
    <div class="legend-item"><div style="width:10px;height:10px;background:#16a34a;border-radius:2px"></div> ≥ 80% (ottimo)</div>
    <div class="legend-item"><div style="width:10px;height:10px;background:#d97706;border-radius:2px"></div> 60–79% (attenzione)</div>
    <div class="legend-item"><div style="width:10px;height:10px;background:#dc2626;border-radius:2px"></div> &lt; 60% (critico)</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:32px">#</th>
        <th>Giocatore</th>
        <th style="text-align:center;width:40px">Ruolo</th>
        <th style="text-align:center;width:55px">Presenti</th>
        <th style="text-align:center;width:65px">Giustificate</th>
        <th style="text-align:center;width:55px">Assenti</th>
        <th style="text-align:center;width:50px">Totale</th>
        <th style="width:130px">% Presenze</th>
      </tr>
    </thead>
    <tbody>
      ${righe || '<tr><td colspan="8" style="text-align:center;padding:20px;color:#999">Nessun giocatore</td></tr>'}
    </tbody>
    ${rows.length > 0 ? `
    <tfoot>
      <tr>
        <td colspan="3">Media complessiva</td>
        <td style="text-align:center;color:#16a34a;font-family:monospace">${rows.reduce((s,r)=>s+r.presenti,0)}</td>
        <td style="text-align:center;color:#d97706;font-family:monospace">${rows.reduce((s,r)=>s+r.giustificate,0)}</td>
        <td style="text-align:center;color:#dc2626;font-family:monospace">${rows.reduce((s,r)=>s+(r.assenti - r.giustificate > 0 ? r.assenti - r.giustificate : 0),0)}</td>
        <td style="text-align:center;font-family:monospace">${rows.reduce((s,r)=>s+r.tot,0)}</td>
        <td style="font-family:monospace;font-weight:700;color:${totMedia >= 80 ? '#16a34a' : totMedia >= 60 ? '#d97706' : '#dc2626'}">${totMedia}%</td>
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
