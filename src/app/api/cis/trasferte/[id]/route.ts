import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const transferId = params.id

  const body = await req.json().catch(() => null) as any
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente, error: utenteError } = await supabase
    .from('utenti')
    .select('club_id')
    .eq('id', user.id)
    .single()

  if (utenteError || !utente) return NextResponse.json({ error: 'Utente non valido' }, { status: 403 })
  const clubId = utente.club_id

  const updateFields: any = {}
  if (typeof body.note === 'string') updateFields.note = body.note
  if (body.costo_stimato !== undefined) updateFields.costo_stimato = body.costo_stimato
  if (body.costo_effettivo !== undefined) updateFields.costo_effettivo = body.costo_effettivo
  if (body.stato) updateFields.stato = body.stato

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: 'Nessun campo valido da aggiornare' }, { status: 400 })
  }

  const { data: updated, error } = await supabase
    .from('trasferte')
    .update(updateFields)
    .eq('id', transferId)
    .eq('club_id', clubId)
    .select('id')
    .single()

  if (error || !updated) return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })
  return NextResponse.json({ ok: true, id: updated.id })
}

