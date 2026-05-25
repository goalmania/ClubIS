import { getUserContext } from '@/lib/impersonation'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'
import { fetchLogoHtml } from '@/lib/pdf/logo'

export const dynamic = 'force-dynamic'

const COSTI_JSON_START = '__COSTI_TRASFERTE_JSON_START__'
const COSTI_JSON_END = '__COSTI_TRASFERTE_JSON_END__'

function parseCostiFromNote(note: string | null): { costsObj: any; noteLibere: string } {
  if (!note) return { costsObj: null, noteLibere: '' }
  const start = note.indexOf(COSTI_JSON_START)
  const end = note.indexOf(COSTI_JSON_END)
  if (start === -1 || end === -1) return { costsObj: null, noteLibere: note.trim() }
  const jsonStr = note.slice(start + COSTI_JSON_START.length, end)
  const noteLibere = note.slice(end + COSTI_JSON_END.length).trim()
  try {
    return { costsObj: JSON.parse(jsonStr), noteLibere }
  } catch {
    return { costsObj: null, noteLibere: note.trim() }
  }
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
}

function field(label: string, value: string, opts?: { color?: string; big?: boolean }) {
  const valStyle = `font-size:${opts?.big ? '16' : '13'}px;font-weight:600;color:${opts?.color ?? '#1a1a1a'};margin-top:4px`
  return `
    <div class="field">
      <div class="field-label">${label}</div>
      <div style="${valStyle}">${value || '—'}</div>
    </div>`
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
    admin.from('clubs').select('nome, citta, logo_url').eq('id', ctx.clubId).single(),
  ])

  if (error || !trasferta) return new Response('Trasferta non trovata', { status: 404 })

  const t = trasferta as any
  const stato = t.stato ?? 'programmata'
  const STATO_COLOR: Record<string, string> = {
    completata: '#16a34a', annullata: '#dc2626', programmata: '#3b82f6', in_corso: '#d97706',
  }
  const statoColor = STATO_COLOR[stato] ?? '#6b7280'

  const { costsObj, noteLibere } = parseCostiFromNote(t.note)

  const dataPartenza = t.data_partenza
    ? new Date(t.data_partenza).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : '—'
  const dataRientro = t.data_rientro
    ? new Date(t.data_rientro).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : null

  // Resolve participant IDs to names if present
  const partIds: { giocatori: string[]; staff: string[]; team_manager: string[] } = {
    giocatori: costsObj?.partecipanti?.giocatori ?? [],
    staff: costsObj?.partecipanti?.staff ?? [],
    team_manager: costsObj?.partecipanti?.team_manager ?? [],
  }
  const allStaffIds = [...partIds.staff, ...partIds.team_manager]

  const [{ data: giocatoriRows }, { data: utentiRows }] = await Promise.all([
    partIds.giocatori.length > 0
      ? admin.from('giocatori').select('id, nome, cognome').in('id', partIds.giocatori)
      : Promise.resolve({ data: [] }),
    allStaffIds.length > 0
      ? admin.from('utenti').select('id, nome, cognome').in('id', allStaffIds)
      : Promise.resolve({ data: [] }),
  ])

  const gMap = Object.fromEntries((giocatoriRows ?? []).map((g: any) => [g.id, `${g.cognome} ${g.nome}`]))
  const uMap = Object.fromEntries((utentiRows ?? []).map((u: any) => [u.id, `${u.cognome} ${u.nome}`]))

  const nomiGiocatori = partIds.giocatori.map((id: string) => gMap[id] ?? id)
  const nomiStaff = partIds.staff.map((id: string) => uMap[id] ?? id)
  const nomiTM = partIds.team_manager.map((id: string) => uMap[id] ?? id)

  const logoHtml = await fetchLogoHtml(club?.logo_url)

  // Cost calculations
  const costoStimato = Number(t.costo_stimato ?? 0)
  const costoEffettivo = Number(t.costo_effettivo ?? 0)
  const delta = t.costo_stimato != null && t.costo_effettivo != null ? costoEffettivo - costoStimato : null

  const trasporto = costsObj?.trasporto ?? {}
  const alloggio = costsObj?.alloggio ?? {}
  const pasti = costsObj?.pasti ?? {}

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8"/>
  <title>Trasferta ${t.destinazione ?? ''} — ${club?.nome ?? ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; max-width: 780px; margin: 0 auto; padding: 24px; }
    .header { border-bottom: 3px solid #1a1a1a; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .header-brand { display: flex; align-items: center; }
    .header-left h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; }
    .header-left p { font-size: 11px; color: #555; margin-top: 2px; }
    .header-right { font-size: 10px; color: #777; text-align: right; }
    .stato-badge { display: inline-block; padding: 4px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; border: 2px solid ${statoColor}; color: ${statoColor}; margin-bottom: 18px; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; margin: 18px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .field { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; }
    .field-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; font-weight: 600; }
    .field-full { grid-column: 1 / -1; }
    .note-box { padding: 12px 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; line-height: 1.6; color: #374151; white-space: pre-wrap; }
    .participants-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .part-section { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; }
    .part-title { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; font-weight: 600; margin-bottom: 8px; }
    .part-list { list-style: none; }
    .part-list li { font-size: 11px; color: #374151; padding: 2px 0; border-bottom: 1px solid #f3f4f6; }
    .part-list li:last-child { border-bottom: none; }
    .allegati-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .allegato-chip { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 3px 10px; font-size: 10px; color: #374151; }
    .footer { margin-top: 24px; border-top: 1px solid #ccc; padding-top: 8px; display: flex; justify-content: space-between; font-size: 9px; color: #999; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-brand">
      ${logoHtml}
      <div class="header-left">
        <h1>${club?.nome ?? 'Società Sportiva'}</h1>
        <p>Dettaglio Trasferta${club?.citta ? ' · ' + club.citta : ''}</p>
      </div>
    </div>
    <div class="header-right">Stampato il ${oggi}</div>
  </div>

  <div class="stato-badge">${stato.toUpperCase()}</div>

  <div class="section-title">Sezione Generale</div>
  <div class="grid">
    <div class="field field-full">
      <div class="field-label">Destinazione</div>
      <div style="font-size:16px;font-weight:700;margin-top:4px">${t.destinazione ?? '—'}</div>
    </div>
    ${costsObj?.competizione_evento ? `
    <div class="field field-full">
      <div class="field-label">Competizione / Evento</div>
      <div style="font-size:13px;font-weight:600;margin-top:4px">${costsObj.competizione_evento}</div>
    </div>` : ''}
    ${field('Data partenza', `<span style="text-transform:capitalize">${dataPartenza}</span>`)}
    ${field('Data rientro', dataRientro ? `<span style="text-transform:capitalize">${dataRientro}</span>` : '—')}
  </div>

  <div class="section-title">Sezione Trasporti</div>
  <div class="grid">
    ${field('Mezzo', `<span style="text-transform:capitalize">${costsObj?.trasporto?.mezzo ?? t.mezzo ?? '—'}</span>`)}
    ${costsObj?.fornitore ? field('Fornitore', costsObj.fornitore) : ''}
    ${field('Costo stimato trasporto', fmt(trasporto.costo_stimato), { color: '#d97706' })}
    ${field('Costo reale trasporto', fmt(trasporto.costo_reale), { color: '#16a34a' })}
  </div>

  <div class="section-title">Sezione Alloggio</div>
  <div class="grid">
    ${field('Hotel / struttura', alloggio.hotel || '—')}
    ${field('Numero notti', alloggio.numero_notti != null ? String(alloggio.numero_notti) : '—')}
    ${field('Costo stimato alloggio', fmt(alloggio.costo_stimato), { color: '#d97706' })}
    ${field('Costo reale alloggio', fmt(alloggio.costo_reale), { color: '#16a34a' })}
  </div>

  <div class="section-title">Sezione Pasti</div>
  <div class="grid-3">
    ${field('Pasti inclusi', pasti.numero_pasti_inclusi != null ? String(pasti.numero_pasti_inclusi) : '—')}
    ${field('Costo stimato pasti', fmt(pasti.costo_stimato), { color: '#d97706' })}
    ${field('Costo reale pasti', fmt(pasti.costo_reale), { color: '#16a34a' })}
  </div>

  <div class="section-title">Budget Totale</div>
  <div class="grid-3">
    <div class="field">
      <div class="field-label">Costo stimato totale</div>
      <div style="font-size:16px;font-weight:700;color:#d97706;margin-top:4px;font-family:monospace">${fmt(costoStimato || null)}</div>
    </div>
    <div class="field">
      <div class="field-label">Costo effettivo totale</div>
      <div style="font-size:16px;font-weight:700;color:#16a34a;margin-top:4px;font-family:monospace">${fmt(costoEffettivo || null)}</div>
    </div>
    <div class="field">
      <div class="field-label">Scostamento</div>
      <div style="font-size:16px;font-weight:700;color:${delta == null ? '#9ca3af' : delta > 0 ? '#dc2626' : '#16a34a'};margin-top:4px;font-family:monospace">
        ${delta == null ? '—' : (delta >= 0 ? '+' : '') + fmt(delta)}
      </div>
    </div>
  </div>

  ${(nomiGiocatori.length > 0 || nomiStaff.length > 0 || nomiTM.length > 0) ? `
  <div class="section-title">Partecipanti (${nomiGiocatori.length + nomiStaff.length + nomiTM.length})</div>
  <div class="participants-grid">
    ${nomiGiocatori.length > 0 ? `
    <div class="part-section">
      <div class="part-title">Giocatori (${nomiGiocatori.length})</div>
      <ul class="part-list">${nomiGiocatori.map((n: string) => `<li>${n}</li>`).join('')}</ul>
    </div>` : ''}
    ${nomiStaff.length > 0 ? `
    <div class="part-section">
      <div class="part-title">Staff (${nomiStaff.length})</div>
      <ul class="part-list">${nomiStaff.map((n: string) => `<li>${n}</li>`).join('')}</ul>
    </div>` : ''}
    ${nomiTM.length > 0 ? `
    <div class="part-section">
      <div class="part-title">Team Manager (${nomiTM.length})</div>
      <ul class="part-list">${nomiTM.map((n: string) => `<li>${n}</li>`).join('')}</ul>
    </div>` : ''}
  </div>` : ''}

  ${costsObj?.allegati?.length > 0 ? `
  <div class="section-title">Allegati (${costsObj.allegati.length})</div>
  <div class="allegati-list">
    ${costsObj.allegati.map((a: any) => `<div class="allegato-chip">📎 ${a.file_name ?? a.storage_path ?? 'file'}</div>`).join('')}
  </div>` : ''}

  ${noteLibere ? `
  <div class="section-title">Note</div>
  <div class="note-box">${noteLibere}</div>` : ''}

  <div class="footer">
    <span>${club?.nome ?? ''} — Documento generato automaticamente</span>
    <span>${oggi}</span>
  </div>

  <script>window.onload = () => window.print()</script>
</body>
</html>`

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
