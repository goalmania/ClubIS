import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'

const RUOLI_WRITE = ['segretario', 'presidente', 'admin']

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!RUOLI_WRITE.includes(ctx.ruolo)) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json()
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {}
  if (typeof body.nome === 'string') update.nome = body.nome.trim()
  if (typeof body.indirizzo === 'string') update.indirizzo = body.indirizzo.trim() || null
  if (typeof body.note === 'string') update.note = body.note.trim() || null
  if (typeof body.attivo === 'boolean') update.attivo = body.attivo
  if ('costo_orario' in body) update.costo_orario = body.costo_orario ? parseFloat(body.costo_orario) : null
  if (typeof body.orari_disponibili === 'string') update.orari_disponibili = body.orari_disponibili.trim() || null

  const { data, error } = await supabase
    .from('campi')
    .update(update)
    .eq('id', params.id)
    .eq('club_id', ctx.clubId)
    .select('id, nome, indirizzo, note, attivo, costo_orario, orari_disponibili')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ campo: data })
}
