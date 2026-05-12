import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type StoricoCluEntry = { club: string; stagione: string; campionato: string; presenze: number; gol: number; assist: number }
type StatStagione = { presenze?: number; gol?: number; assist?: number; ammonizioni?: number; espulsioni?: number; minuti?: number }
type Osservazione = {
  id: string
  data_osservazione: string
  partita_contesto?: string
  tecnica?: number
  fisico?: number
  tattica?: number
  mentalita?: number
  velocita?: number
  note?: string
}

function buildRadarSVG(values: number[], size = 180): string {
  const n = 5
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.38
  const labels = ['Tecnica', 'Fisico', 'Tattica', 'Mentalità', 'Velocità']

  function angle(i: number) { return (Math.PI * 2 * i) / n - Math.PI / 2 }
  function pt(val: number, i: number) {
    const ratio = val / 10
    return { x: cx + r * ratio * Math.cos(angle(i)), y: cy + r * ratio * Math.sin(angle(i)) }
  }
  function gridPts(level: number) {
    return Array.from({ length: n }, (_, i) => {
      const ratio = level / 10
      return `${cx + r * ratio * Math.cos(angle(i))},${cy + r * ratio * Math.sin(angle(i))}`
    }).join(' ')
  }
  const dataPoints = values.map((v, i) => { const p = pt(v, i); return `${p.x},${p.y}` }).join(' ')

  const gridLines = [2, 4, 6, 8, 10].map(level =>
    `<polygon points="${gridPts(level)}" fill="none" stroke="#ccc" stroke-width="0.5"/>`
  ).join('')
  const axes = Array.from({ length: n }, (_, i) => {
    const p = pt(10, i)
    return `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="#ccc" stroke-width="0.5"/>`
  }).join('')
  const labelsHtml = labels.map((label, i) => {
    const dist = r + 18
    const x = cx + dist * Math.cos(angle(i))
    const y = cy + dist * Math.sin(angle(i))
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#555">${label}</text>`
  }).join('')

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${gridLines}${axes}${labelsHtml}
    <polygon points="${dataPoints}" fill="#388bfd" fill-opacity="0.25" stroke="#388bfd" stroke-width="1.5"/>
  </svg>`
}

function ratingColor(v?: number) {
  if (!v) return '#888'
  if (v >= 7) return '#2d7d46'
  if (v >= 5) return '#9a6700'
  return '#b91c1c'
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return new NextResponse('Non autenticato', { status: 401 })

  const { data: utente } = await supabase.from('utenti').select('club_id, nome, cognome').eq('id', user.id).single()
  if (!utente) return new NextResponse('Utente non trovato', { status: 403 })

  const { data: club } = await supabase.from('clubs').select('nome').eq('id', utente.club_id).single()

  const { data: report } = await supabase.from('report_scouting').select('*').eq('id', params.id).single()
  if (!report) return new NextResponse('Report non trovato', { status: 404 })

  const { data: osservazioni } = await supabase
    .from('osservazioni_scouting')
    .select('*')
    .eq('report_id', params.id)
    .order('data_osservazione', { ascending: false })
    .limit(3)

  const stat: StatStagione = report.statistiche_stagione ?? {}
  const storico: StoricoCluEntry[] = report.storico_club ?? []
  const obs: Osservazione[] = osservazioni ?? []
  const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const radarValues = [
    report.tecnica ?? 0,
    report.fisico ?? 0,
    report.tattica ?? 0,
    report.mentale ?? 0,
    report.velocita ?? 0,
  ]
  const radarSVG = buildRadarSVG(radarValues)

  const storiciRows = storico.map(s =>
    `<tr><td>${s.club}</td><td>${s.stagione}</td><td>${s.campionato}</td><td>${s.presenze}</td><td>${s.gol}</td><td>${s.assist}</td></tr>`
  ).join('')

  const obsRows = obs.map(o => `
    <div class="obs-card">
      <div class="obs-header">
        <strong>${new Date(o.data_osservazione).toLocaleDateString('it-IT')}</strong>
        ${o.partita_contesto ? `<span class="obs-partita">${o.partita_contesto}</span>` : ''}
      </div>
      <div class="obs-ratings">
        ${[['Tec', o.tecnica], ['Fis', o.fisico], ['Tat', o.tattica], ['Men', o.mentalita], ['Vel', o.velocita]].map(([label, val]) => `
          <span class="rating-badge" style="color:${ratingColor(val as number | undefined)}">
            ${label} <strong>${val ?? '—'}</strong>
          </span>
        `).join('')}
      </div>
      ${o.note ? `<div class="obs-note">${o.note}</div>` : ''}
    </div>
  `).join('')

  const formatEuro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Profilo Scouting — ${report.nome_giocatore_ext ?? 'Giocatore'}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; font-size: 13px; }
  .page { max-width: 800px; margin: 0 auto; padding: 32px 24px; }
  /* Header */
  .doc-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1f3a5f; padding-bottom: 14px; margin-bottom: 24px; }
  .doc-header-left h1 { font-size: 11px; font-weight: 700; color: #1f3a5f; text-transform: uppercase; letter-spacing: 0.1em; }
  .doc-header-left p { font-size: 10px; color: #666; margin-top: 2px; }
  .doc-header-right { font-size: 10px; color: #666; text-align: right; }
  /* Player name */
  .player-name { font-size: 26px; font-weight: 700; color: #1f3a5f; margin-bottom: 10px; }
  .meta-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
  .meta-item { font-size: 12px; color: #444; }
  .meta-item strong { color: #1a1a2e; }
  /* Badges */
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; margin-right: 6px; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-green { background: #dcfce7; color: #15803d; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-purple { background: #ede9fe; color: #6d28d9; }
  .badge-gray { background: #f1f5f9; color: #475569; }
  /* Grid */
  .section-title { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin: 24px 0 10px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
  .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 8px; text-align: center; }
  .kpi-val { font-size: 20px; font-weight: 700; color: #1f3a5f; }
  .kpi-label { font-size: 9px; color: #9ca3af; text-transform: uppercase; margin-top: 3px; }
  /* Anagrafica */
  .anagrafica-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .ana-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; }
  .ana-label { font-size: 9px; color: #9ca3af; text-transform: uppercase; margin-bottom: 3px; }
  .ana-val { font-size: 13px; font-weight: 600; color: #1a1a2e; }
  /* Tabella */
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 600; color: #475569; font-size: 10px; text-transform: uppercase; }
  td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; color: #374151; }
  /* Radar + storico row */
  .two-col { display: grid; grid-template-columns: 220px 1fr; gap: 20px; align-items: start; margin-top: 4px; }
  /* Obs */
  .obs-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 8px; }
  .obs-header { font-size: 12px; margin-bottom: 6px; }
  .obs-partita { font-size: 11px; color: #6b7280; margin-left: 10px; }
  .obs-ratings { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
  .rating-badge { font-size: 11px; background: #fff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px 7px; }
  .obs-note { font-size: 11px; color: #6b7280; line-height: 1.5; }
  /* Footer */
  .doc-footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #9ca3af; text-align: center; }
  @media print {
    body { color: black; }
    .page { padding: 16px; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header documento -->
  <div class="doc-header">
    <div class="doc-header-left">
      <h1>Profilo Scouting</h1>
      <p>ClubIS — The Intelligence System</p>
    </div>
    <div class="doc-header-right">
      Data: ${today}<br>
      Club: ${club?.nome ?? '—'}
    </div>
  </div>

  <!-- Nome giocatore -->
  <div class="player-name">${report.nome_giocatore_ext ?? '—'}</div>

  <!-- Meta row -->
  <div class="meta-row">
    ${report.data_nascita ? `<div class="meta-item"><strong>Età:</strong> ${new Date().getFullYear() - new Date(report.data_nascita).getFullYear()} anni</div>` : ''}
    ${report.nazionalita ? `<div class="meta-item"><strong>Nazionalità:</strong> ${report.nazionalita}</div>` : ''}
    ${report.ruolo ? `<div class="meta-item"><strong>Ruolo:</strong> ${report.ruolo.replace('_', ' ')}</div>` : ''}
    ${report.piede_preferito ? `<div class="meta-item"><strong>Piede:</strong> ${report.piede_preferito}</div>` : ''}
    ${report.altezza_cm ? `<div class="meta-item"><strong>Altezza:</strong> ${report.altezza_cm} cm</div>` : ''}
    ${report.peso_kg ? `<div class="meta-item"><strong>Peso:</strong> ${report.peso_kg} kg</div>` : ''}
    ${report.club_attuale_ext ? `<div class="meta-item"><strong>Club attuale:</strong> ${report.club_attuale_ext}</div>` : ''}
  </div>

  <!-- Badge stato -->
  <div style="margin-bottom:20px;">
    <span class="badge badge-blue">${report.stato_pipeline?.replace('_', ' ') ?? 'in osservazione'}</span>
    <span class="badge badge-${report.potenziale === 'eccezionale' ? 'purple' : report.potenziale === 'alto' ? 'green' : report.potenziale === 'medio' ? 'blue' : 'gray'}">Potenziale: ${report.potenziale}</span>
    ${report.valore_mercato_stimato ? `<span class="badge badge-green">Valore: ${formatEuro(report.valore_mercato_stimato)}</span>` : ''}
  </div>

  <!-- Statistiche stagione -->
  <div class="section-title">Statistiche stagione</div>
  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-val">${stat.presenze ?? '—'}</div><div class="kpi-label">Presenze</div></div>
    <div class="kpi-card"><div class="kpi-val">${stat.gol ?? '—'}</div><div class="kpi-label">Gol</div></div>
    <div class="kpi-card"><div class="kpi-val">${stat.assist ?? '—'}</div><div class="kpi-label">Assist</div></div>
    <div class="kpi-card"><div class="kpi-val">${stat.ammonizioni ?? '—'}</div><div class="kpi-label">Amm.</div></div>
    <div class="kpi-card"><div class="kpi-val">${stat.espulsioni ?? '—'}</div><div class="kpi-label">Esp.</div></div>
    <div class="kpi-card"><div class="kpi-val">${stat.minuti ?? '—'}</div><div class="kpi-label">Minuti</div></div>
  </div>

  <!-- Profilo tecnico + Storico club -->
  <div class="section-title">Profilo tecnico e storico club</div>
  <div class="two-col">
    <div>
      ${radarSVG}
    </div>
    <div>
      ${storico.length > 0 ? `
      <table>
        <thead><tr><th>Club</th><th>Stagione</th><th>Camp.</th><th>Pres.</th><th>Gol</th><th>Assist</th></tr></thead>
        <tbody>${storiciRows}</tbody>
      </table>` : '<p style="font-size:12px;color:#9ca3af;padding-top:16px;">Nessun storico disponibile</p>'}
    </div>
  </div>

  <!-- Ultime osservazioni -->
  ${obs.length > 0 ? `
  <div class="section-title">Ultime osservazioni</div>
  ${obsRows}` : ''}

  <!-- Note -->
  ${report.punti_forza ? `<div class="section-title">Punti di forza</div><p style="font-size:13px;color:#374151;line-height:1.6;">${report.punti_forza}</p>` : ''}
  ${report.punti_debolezza ? `<div class="section-title">Punti deboli</div><p style="font-size:13px;color:#374151;line-height:1.6;">${report.punti_debolezza}</p>` : ''}
  ${report.note_libere ? `<div class="section-title">Note libere</div><p style="font-size:13px;color:#374151;line-height:1.6;">${report.note_libere}</p>` : ''}
  ${report.fonte_dati ? `<div class="section-title">Fonte dati</div><p style="font-size:12px;color:#6b7280;">${report.fonte_dati}</p>` : ''}

  <!-- Footer -->
  <div class="doc-footer">
    Generato da ClubIS — The Intelligence System — ${club?.nome ?? '—'} — ${today}
  </div>

</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
