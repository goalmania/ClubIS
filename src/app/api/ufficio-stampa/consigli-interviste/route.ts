import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ── GET — legge consigli del club (bypassa RLS) ───────────────────────────────
export async function GET(_req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { clubId } = ctx
  if (!clubId) return NextResponse.json([], { status: 200 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('consigli_interviste')
    .select('id, club_id, creato_da, destinatario_ruolo, destinatario_specifico_id, domanda, consiglio_risposta, contesto, priorita, attivo, created_at')
    .eq('club_id', clubId)
    .eq('attivo', true)
    .order('priorita', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// ── DELETE — soft-delete (attivo = false) ─────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (ctx.ruolo !== 'ufficio_stampa' && !ctx.isSuperAdmin) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { clubId } = ctx
  if (!clubId) return NextResponse.json({ error: 'Club non trovato' }, { status: 400 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID mancante' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('consigli_interviste')
    .update({ attivo: false })
    .eq('id', id)
    .eq('club_id', clubId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (ctx.ruolo !== 'ufficio_stampa' && !ctx.isSuperAdmin) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { clubId, userId } = ctx
  if (!clubId) return NextResponse.json({ error: 'Club non trovato' }, { status: 400 })

  const body = await req.json()
  const {
    destinatario_ruolo,
    destinatario_specifico_id,
    domanda,
    consiglio_risposta,
    contesto,
    priorita,
  } = body

  if (!destinatario_ruolo || !domanda?.trim() || !consiglio_risposta?.trim()) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Valida destinatario_specifico_id: deve essere un utenti.id dello stesso club
  if (destinatario_specifico_id) {
    const { data: utenteCheck } = await admin
      .from('utenti')
      .select('id')
      .eq('id', destinatario_specifico_id)
      .eq('club_id', clubId)
      .maybeSingle()

    if (!utenteCheck) {
      return NextResponse.json(
        { error: 'La persona selezionata non è valida per questo club' },
        { status: 400 }
      )
    }
  }

  const { data, error } = await admin
    .from('consigli_interviste')
    .insert({
      club_id:                   clubId,
      creato_da:                 userId,
      destinatario_ruolo,
      destinatario_specifico_id: destinatario_specifico_id ?? null,
      domanda:                   domanda.trim(),
      consiglio_risposta:        consiglio_risposta.trim(),
      contesto:                  contesto ?? 'generale',
      priorita:                  priorita ?? 2,
      attivo:                    true,
      is_template:               false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (ctx.ruolo !== 'ufficio_stampa' && !ctx.isSuperAdmin) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { clubId } = ctx
  if (!clubId) return NextResponse.json({ error: 'Club non trovato' }, { status: 400 })

  const body = await req.json()
  const {
    id,
    destinatario_ruolo,
    destinatario_specifico_id,
    domanda,
    consiglio_risposta,
    contesto,
    priorita,
  } = body

  if (!id) return NextResponse.json({ error: 'ID mancante' }, { status: 400 })

  const admin = createAdminClient()

  // Valida destinatario_specifico_id
  if (destinatario_specifico_id) {
    const { data: utenteCheck } = await admin
      .from('utenti')
      .select('id')
      .eq('id', destinatario_specifico_id)
      .eq('club_id', clubId)
      .maybeSingle()

    if (!utenteCheck) {
      return NextResponse.json(
        { error: 'La persona selezionata non è valida per questo club' },
        { status: 400 }
      )
    }
  }

  const { error } = await admin
    .from('consigli_interviste')
    .update({
      destinatario_ruolo,
      destinatario_specifico_id: destinatario_specifico_id ?? null,
      domanda:                   domanda.trim(),
      consiglio_risposta:        consiglio_risposta.trim(),
      contesto,
      priorita,
    })
    .eq('id', id)
    .eq('club_id', clubId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
