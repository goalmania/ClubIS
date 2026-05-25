import { getUserContext } from '@/lib/impersonation'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const ruoloLabel: Record<string, string> = {
  portiere: 'Portiere', difensore_centrale: 'Difensore Centrale', terzino: 'Terzino',
  centrocampista_difensivo: 'Centrocampista Difensivo', centrocampista: 'Centrocampista',
  trequartista: 'Trequartista', ala: 'Ala', seconda_punta: 'Seconda Punta', centravanti: 'Centravanti',
}

function calcolaEta(nascita: string): number {
  const oggi = new Date()
  const d = new Date(nascita)
  let eta = oggi.getFullYear() - d.getFullYear()
  if (oggi.getMonth() < d.getMonth() || (oggi.getMonth() === d.getMonth() && oggi.getDate() < d.getDate())) eta--
  return eta
}

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return new Response('Non autenticato', { status: 401 })

  const admin = createAdminClient()

  const [{ data: tesseramenti }, { data: club }] = await Promise.all([
    admin
      .from('tesseramenti')
      .select('id, numero_maglia, tipo, giocatori(id, nome, cognome, data_nascita, ruolo_principale, piede, nazionalita_tipo), squadre(nome, categoria_eta)')
      .eq('club_id', ctx.clubId)
      .eq('stato', 'attivo')
      .order('giocatori(cognome)'),
    admin.from('clubs').select('nome, citta').eq('id', ctx.clubId).single(),
  ])

  const lista = (tesseramenti ?? []).filter((t: any) => t.giocatori)
  const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  const righe = lista.map((t: any, i: number) => {
    const g = t.giocatori
    const eta = g.data_nascita ? calcolaEta(g.data_nascita) : '—'
    const naz = g.nazionalita_tipo === 'italiano' ? 'ITA' : g.nazionalita_tipo === 'ue' ? 'UE' : g.nazionalita_tipo === 'extracomunitario' ? 'EXT' : '—'
    const ruolo = ruoloLabel[g.ruolo_principale] ?? g.ruolo_principale ?? '—'
    return `
      <tr>
        <td class="center mono">${t.numero_maglia ? '#' + t.numero_maglia : '—'}</td>
        <td><strong>${g.cognome ?? ''} ${g.nome ?? ''}</strong></td>
        <td class="center">${g.data_nascita ? new Date(g.data_nascita).toLocaleDateString('it-IT') : '—'}</td>
        <td class="center">${eta}</td>
        <td>${ruolo}</td>
        <td class="center">${g.piede ? g.piede.charAt(0).toUpperCase() + g.piede.slice(1) : '—'}</td>
        <td class="center badge-${g.nazionalita_tipo ?? 'grigio'}">${naz}</td>
        <td>${t.squadre?.nome ?? '—'}</td>
        <td class="center">${t.tipo ?? '—'}</td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8"/>
  <title>Rosa Giocatori — ${club?.nome ?? ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }
    .header { border-bottom: 3px solid #1a1a1a; padding: 16px 0 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .header-left h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; }
    .header-left p { font-size: 11px; color: #555; margin-top: 2px; }
    .header-right { font-size: 10px; color: #777; text-align: right; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1a1a1a; color: #fff; }
    thead th { padding: 7px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; text-align: left; font-weight: 700; }
    tbody tr { border-bottom: 1px solid #e5e5e5; }
    tbody tr:nth-child(even) { background: #f8f8f8; }
    td { padding: 6px 8px; vertical-align: middle; }
    .center { text-align: center; }
    .mono { font-family: monospace; }
    .badge-italiano { color: #16a34a; font-weight: 700; }
    .badge-ue { color: #2563eb; font-weight: 700; }
    .badge-extracomunitario { color: #d97706; font-weight: 700; }
    .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; display: flex; justify-content: space-between; font-size: 9px; color: #999; }
    .summary { margin-bottom: 16px; display: flex; gap: 24px; }
    .summary-item { font-size: 11px; color: #555; }
    .summary-item strong { color: #1a1a1a; font-size: 13px; }
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
      <p>Rosa Giocatori — Stagione corrente${club?.citta ? ' · ' + club.citta : ''}</p>
    </div>
    <div class="header-right">
      Stampato il ${oggi}<br/>
      ${lista.length} tesserati
    </div>
  </div>

  <div class="summary">
    <div class="summary-item">Totale tesserati: <strong>${lista.length}</strong></div>
    <div class="summary-item">Italiani: <strong>${lista.filter((t: any) => t.giocatori?.nazionalita_tipo === 'italiano').length}</strong></div>
    <div class="summary-item">UE: <strong>${lista.filter((t: any) => t.giocatori?.nazionalita_tipo === 'ue').length}</strong></div>
    <div class="summary-item">Extra-UE: <strong>${lista.filter((t: any) => t.giocatori?.nazionalita_tipo === 'extracomunitario').length}</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th>Cognome e Nome</th>
        <th style="width:90px">Data Nascita</th>
        <th style="width:40px">Età</th>
        <th>Ruolo</th>
        <th style="width:50px">Piede</th>
        <th style="width:45px">Naz.</th>
        <th>Squadra</th>
        <th style="width:70px">Tipo</th>
      </tr>
    </thead>
    <tbody>
      ${righe || '<tr><td colspan="9" style="text-align:center;padding:20px;color:#999">Nessun giocatore tesserato</td></tr>'}
    </tbody>
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
