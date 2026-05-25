import { getUserContext } from '@/lib/impersonation'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchLogoHtml } from '@/lib/pdf/logo'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return new Response('Non autenticato', { status: 401 })

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  const [{ data: squalifiche }, { data: club }] = await Promise.all([
    admin
      .from('squalifiche')
      .select('id, motivo, partite_restanti, giornate_squalifica, data_inizio, data_fine, comunicato_figc, giocatori(nome, cognome, numero_maglia)')
      .eq('club_id', ctx.clubId)
      .or(`partite_restanti.gt.0,data_fine.gte.${today}`)
      .order('data_inizio', { ascending: false }),
    admin.from('clubs').select('nome, citta, logo_url').eq('id', ctx.clubId).single(),
  ])

  const lista = (squalifiche ?? []) as any[]

  const righe = lista.map((s: any) => {
    const g = s.giocatori
    const rimanenti = s.partite_restanti ?? 0
    const stato = rimanenti > 0 ? 'Attiva' : 'Scaduta'
    const statoClass = rimanenti > 0 ? 'stato-attiva' : 'stato-scaduta'
    return `
      <tr>
        <td>
          <strong>${g?.cognome ?? '—'} ${g?.nome ?? ''}</strong>
          ${g?.numero_maglia != null ? `<br/><span class="maglia">#${g.numero_maglia}</span>` : ''}
          ${s.motivo ? `<br/><span class="motivo">${s.motivo}</span>` : ''}
        </td>
        <td class="mono">${s.comunicato_figc ?? '—'}</td>
        <td class="center">${s.data_inizio ? new Date(s.data_inizio).toLocaleDateString('it-IT') : '—'}</td>
        <td class="center">${s.data_fine ? new Date(s.data_fine).toLocaleDateString('it-IT') : '—'}</td>
        <td class="center">${s.giornate_squalifica ?? '—'}</td>
        <td class="center bold ${rimanenti > 0 ? 'col-rosso' : 'col-verde'}">${rimanenti}</td>
        <td class="center"><span class="${statoClass}">${stato}</span></td>
      </tr>`
  }).join('')

  const attive = lista.filter((s: any) => (s.partite_restanti ?? 0) > 0).length

  const logoHtml = await fetchLogoHtml(club?.logo_url)

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8"/>
  <title>Monitor Squalifiche — ${club?.nome ?? ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }
    .header { border-bottom: 3px solid #1a1a1a; padding: 16px 0 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .header-left h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; }
    .header-left p { font-size: 11px; color: #555; margin-top: 2px; }
    .header-right { font-size: 10px; color: #777; text-align: right; }
    .summary { margin-bottom: 16px; display: flex; gap: 24px; }
    .summary-item { font-size: 11px; color: #555; }
    .summary-item strong { color: #1a1a1a; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1a1a1a; color: #fff; }
    thead th { padding: 7px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; text-align: left; font-weight: 700; }
    tbody tr { border-bottom: 1px solid #e5e5e5; }
    tbody tr:nth-child(even) { background: #f8f8f8; }
    td { padding: 7px 8px; vertical-align: middle; }
    .center { text-align: center; }
    .mono { font-family: monospace; font-size: 10px; }
    .bold { font-weight: 700; }
    .maglia { font-size: 9px; color: #777; }
    .motivo { font-size: 9px; color: #999; font-style: italic; }
    .col-rosso { color: #dc2626; }
    .col-verde { color: #16a34a; }
    .stato-attiva { background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
    .stato-scaduta { background: #f0fdf4; color: #16a34a; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
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
        <p>Monitor Squalifiche — Giocatori non disponibili${club?.citta ? ' · ' + club.citta : ''}</p>
      </div>
    </div>
    <div class="header-right">
      Stampato il ${oggi}<br/>
      ${attive} squalifiche attive su ${lista.length} totali
    </div>
  </div>

  <div class="summary">
    <div class="summary-item">Squalifiche attive: <strong style="color:#dc2626">${attive}</strong></div>
    <div class="summary-item">Squalifiche scadute (archivio): <strong>${lista.length - attive}</strong></div>
    <div class="summary-item">Totale: <strong>${lista.length}</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Giocatore</th>
        <th style="width:100px">Comunicato FIGC</th>
        <th style="width:80px">Data Inizio</th>
        <th style="width:80px">Fine Prevista</th>
        <th style="width:60px">Giornate</th>
        <th style="width:60px">Rimanenti</th>
        <th style="width:70px">Stato</th>
      </tr>
    </thead>
    <tbody>
      ${righe || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#999">Nessuna squalifica attiva</td></tr>'}
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
