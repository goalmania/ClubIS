import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { sincronizzaBudgetPrevisto } from '@/lib/staff-budget'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const TIPI_CONTRATTO = ['cococo', 'autonomo', 'dipendente', 'volontario']
const CAMPI_MODIFICABILI = ['tipo_contratto', 'codice_fiscale', 'iban', 'compenso_mensile', 'data_inizio', 'data_fine', 'attivo', 'nome_esterno', 'cognome_esterno', 'ruolo_esterno']

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!ctx.clubId) return Response.json({ error: 'Club non trovato' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  if (body.tipo_contratto && !TIPI_CONTRATTO.includes(body.tipo_contratto)) {
    return Response.json({ error: 'Tipo contratto non valido' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: esistente } = await admin.from('collaboratori_staff').select('id, club_id').eq('id', id).maybeSingle()
  if (!esistente || esistente.club_id !== ctx.clubId) {
    return Response.json({ error: 'Collaboratore non trovato' }, { status: 404 })
  }

  const update: Record<string, any> = {}
  for (const campo of CAMPI_MODIFICABILI) {
    if (campo in body) update[campo] = body[campo]
  }
  if (update.codice_fiscale) update.codice_fiscale = String(update.codice_fiscale).toUpperCase()
  if (update.iban) update.iban = String(update.iban).toUpperCase()
  if ('compenso_mensile' in update) {
    update.compenso_mensile = update.compenso_mensile !== '' && update.compenso_mensile != null ? Number(update.compenso_mensile) : null
  }
  if ('data_fine' in update) update.data_fine = update.data_fine || null
  if ('nome_esterno' in update) update.nome_esterno = String(update.nome_esterno ?? '').trim() || null
  if ('cognome_esterno' in update) update.cognome_esterno = String(update.cognome_esterno ?? '').trim() || null
  if ('ruolo_esterno' in update) update.ruolo_esterno = String(update.ruolo_esterno ?? '').trim() || null

  const { data, error } = await admin
    .from('collaboratori_staff')
    .update(update)
    .eq('id', id)
    .select('*, utenti(id, nome, cognome, ruolo, email)')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  await sincronizzaBudgetPrevisto(admin, ctx.clubId, data)

  return Response.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!ctx.clubId) return Response.json({ error: 'Club non trovato' }, { status: 400 })

  const admin = createAdminClient()

  const { data: esistente } = await admin
    .from('collaboratori_staff')
    .select('id, club_id, compenso_mensile')
    .eq('id', id)
    .maybeSingle()
  if (!esistente || esistente.club_id !== ctx.clubId) {
    return Response.json({ error: 'Collaboratore non trovato' }, { status: 404 })
  }

  // Rimuove la voce di budget previsto (costo futuro) legata a questo
  // contratto. I pagamenti già effettuati (prima_nota/compensi) restano
  // intatti come storico contabile: eliminare il contratto non cancella
  // il passato, solo la spesa futura che non avverrà più.
  await sincronizzaBudgetPrevisto(admin, ctx.clubId, { id: esistente.id, compenso_mensile: esistente.compenso_mensile, attivo: false })

  const { error } = await admin.from('collaboratori_staff').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
