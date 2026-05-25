import { getUserContext } from '@/lib/impersonation'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

function fmt(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getUserContext()
  if (!ctx) return new Response('Non autenticato', { status: 401 })

  const admin = createAdminClient()
  const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  const [{ data: trasferta, error }, { data: club }] = await Promise.all([
    admin
      .from('trasferte')
      .select('id, destinazione, data_partenza, data_rientro, mezzo, costo_stimato, costo_effettivo, note, stato, partita_id')
      .eq('id', params.id)
      .eq('club_id', ctx.clubId)
      .single(),
    admin.from('clubs').select('nome, citta, indirizzo').eq('id', ctx.clubId).single(),
  ])

  if (error || !trasferta) return new Response('Trasferta non trovata', { status: 404 })

  const t = trasferta as any
  const stato = t.stato ?? 'programmata'
  const STATO_COLOR: Record<string, string> = { completata: '#16a34a', annullata: '#dc2626', programmata: '#3b82f6', in_corso: '#d97706' }
  const statoColor = STATO_COLOR[stato] ?? '#6b7280'

  const dataPartenza = t.data_partenza ? new Date(t.data_partenza).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—'
  const dataRientro = t.data_rientro ? new Date(t.data_rientro).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : null

  const cStimato = t.costo_stimato ? Number(t.costo_stimato) : null
  const cEffettivo = t.costo_effettivo ? Number(t.costo_effettivo) : null
  const delta = cStimato != null && cEffettivo != null ? cEffettivo - cStimato : null

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8"/>
  <title>Trasferta ${t.destinazione ?? ''} — ${club?.nome ?? ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 3px solid #1a1a1a; padding-bottom: 14px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .header-left h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; }
    .header-left p { font-size: 11px; color: #555; margin-top: 2px; }
    .header-right { font-size: 10px; color: #777; text-align: right; }
    .stato-badge { display: inline-block; padding: 4px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; border: 2px solid ${statoColor}; color: ${statoColor}; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .field { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 16px; }
    .field-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; margin-bottom: 4px; font-weight: 600; }
    .field-value { font-size: 13px; font-weight: 600; color: #1a1a1a; }
    .field-value.big { font-size: 18px; font-family: monospace; }
    .field-value.green { color: #16a34a; }
    .field-value.orange { color: #d97706; }
    .field-value.red { color: #dc2626; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; margin: 20px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
    .note-box { padding: 12px 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; line-height: 1.6; color: #374151; }
    .cost-comparison { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 8px; display: flex; justify-content: space-between; font-size: 9px; color: #999; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${club?.nome ?? 'Società Sportiva'}</h1>
      <p>Dettaglio Trasferta${club?.citta ? ' · ' + club.citta : ''}</p>
    </div>
    <div class="header-right">Stampato il ${oggi}</div>
  </div>

  <div class="stato-badge">${stato}</div>

  <div class="section-title">Informazioni trasferta</div>
  <div class="grid">
    <div class="field" style="grid-column: 1 / -1">
      <div class="field-label">Destinazione</div>
      <div class="field-value" style="font-size:16px">${t.destinazione ?? '—'}</div>
    </div>
    <div class="field">
      <div class="field-label">Data partenza</div>
      <div class="field-value" style="text-transform:capitalize">${dataPartenza}</div>
    </div>
    <div class="field">
      <div class="field-label">Data rientro</div>
      <div class="field-value" style="text-transform:capitalize">${dataRientro ?? '—'}</div>
    </div>
    <div class="field">
      <div class="field-label">Mezzo di trasporto</div>
      <div class="field-value" style="text-transform:capitalize">${t.mezzo ?? '—'}</div>
    </div>
    <div class="field">
      <div class="field-label">Partita collegata</div>
      <div class="field-value">${t.partita_id ? 'Sì (ID: ' + t.partita_id + ')' : '—'}</div>
    </div>
  </div>

  <div class="section-title">Budget</div>
  <div class="cost-comparison">
    <div class="field">
      <div class="field-label">Costo stimato</div>
      <div class="field-value big orange">${cStimato != null ? fmt(cStimato) : '—'}</div>
    </div>
    <div class="field">
      <div class="field-label">Costo effettivo</div>
      <div class="field-value big green">${cEffettivo != null ? fmt(cEffettivo) : '—'}</div>
    </div>
    <div class="field">
      <div class="field-label">Scostamento</div>
      <div class="field-value big ${delta != null ? (delta > 0 ? 'red' : 'green') : ''}">
        ${delta != null ? (delta >= 0 ? '+' : '') + fmt(delta) : '—'}
      </div>
    </div>
  </div>

  ${t.note ? `
  <div class="section-title">Note</div>
  <div class="note-box">${t.note}</div>
  ` : ''}

  <div class="footer">
    <span>${club?.nome ?? ''} — Documento generato automaticamente</span>
    <span>${oggi}</span>
  </div>

  <script>window.onload = () => window.print()</script>
</body>
</html>`

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
