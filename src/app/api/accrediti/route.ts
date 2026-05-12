import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

const RUOLI_LETTURA  = ['segretario', 'presidente', 'ds', 'team_manager', 'ufficio_stampa', 'allenatore']
const RUOLI_SCRITTURA = ['segretario', 'presidente', 'ds', 'team_manager', 'ufficio_stampa']

// ── GET /api/accrediti?partita_id=...&stato=...&tipo=... ──────────────────────
export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!RUOLI_LETTURA.includes(ctx.ruolo) && !ctx.isSuperAdmin)
    return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 })

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const partitaId = searchParams.get('partita_id')
  const stato     = searchParams.get('stato')
  const tipo      = searchParams.get('tipo')

  let query = supabase
    .from('accrediti')
    .select('*, partite(avversario, data_ora, casa_trasferta)')
    .eq('club_id', ctx.clubId)
    .order('created_at', { ascending: false })

  if (partitaId) query = query.eq('partita_id', partitaId)
  if (stato)     query = query.eq('stato', stato)
  if (tipo)      query = query.eq('tipo', tipo)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

// ── POST /api/accrediti ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!RUOLI_SCRITTURA.includes(ctx.ruolo) && !ctx.isSuperAdmin)
    return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 })

  const supabase = createAdminClient()
  const body = await req.json()

  const {
    partita_id, nome, cognome, tipo, organizzazione,
    email, telefono, note, settore, numero_badge,
  } = body

  if (!nome || !cognome || !tipo)
    return NextResponse.json({ error: 'Nome, cognome e tipo sono obbligatori' }, { status: 400 })

  const { data, error } = await supabase
    .from('accrediti')
    .insert({
      club_id: ctx.clubId,
      partita_id: partita_id || null,
      nome,
      cognome,
      tipo,
      organizzazione: organizzazione || null,
      email: email || null,
      telefono: telefono || null,
      note: note || null,
      settore: settore || null,
      numero_badge: numero_badge || null,
      stato: 'in_attesa',
      creato_da: ctx.userId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifica team_manager e segretario del club
  try {
    const { data: destinatari } = await supabase
      .from('utenti')
      .select('id, ruolo')
      .eq('club_id', ctx.clubId)
      .in('ruolo', ['team_manager', 'segretario'])
      .eq('attivo', true)

    if (destinatari && destinatari.length > 0) {
      const tipoLabel: Record<string, string> = {
        media: 'Media / Stampa', fotografo: 'Fotografo', ospite_vip: 'Ospite VIP',
        sponsor: 'Sponsor', dirigente_esterno: 'Dirigente esterno',
        collaboratore: 'Collaboratore', istituzione: 'Istituzione', altro: 'Altro',
      }
      await supabase.from('notifiche_sistema').insert(
        destinatari.map((d: { id: string; ruolo: string }) => ({
          club_id:            ctx.clubId,
          destinatario_id:    d.id,
          ruolo_destinatario: d.ruolo,
          tipo:               'alert_sistema',
          titolo:             '🎫 Nuova richiesta accredito',
          messaggio:          `${cognome} ${nome} (${tipoLabel[tipo] ?? tipo}) — in attesa di approvazione.`,
          letta:              false,
          azione_url:         '/dashboard/segretario/accrediti',
        }))
      )
    }
  } catch (_) {
    // Non bloccare la risposta se la notifica fallisce
  }

  return NextResponse.json({ data }, { status: 201 })
}
