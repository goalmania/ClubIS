import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

function calcolaTrimestre(dateStr: string) {
  const d = new Date(dateStr)
  return { trimestre: Math.ceil((d.getMonth() + 1) / 3), anno: d.getFullYear() }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx
  if (!clubId) return Response.json({ error: 'Club non trovato' }, { status: 400 })

  const admin = createAdminClient()
  const body  = await req.json()
  const patch: Record<string, any> = {}

  if (body.soggetto_nome    !== undefined) patch.soggetto_nome    = body.soggetto_nome.trim()
  if (body.soggetto_cognome !== undefined) patch.soggetto_cognome = body.soggetto_cognome.trim()
  if (body.codice_fiscale   !== undefined) patch.codice_fiscale   = body.codice_fiscale.trim().toUpperCase()
  if (body.ruolo            !== undefined) patch.ruolo            = body.ruolo
  if (body.tipo_rimborso    !== undefined) patch.tipo_rimborso    = body.tipo_rimborso
  if (body.importo          !== undefined) patch.importo          = parseFloat(body.importo)
  if (body.causale          !== undefined) patch.causale          = body.causale?.trim() || null
  if (body.note             !== undefined) patch.note             = body.note?.trim()    || null
  if (body.data_erogazione  !== undefined) {
    patch.data_erogazione = body.data_erogazione
    const { trimestre, anno } = calcolaTrimestre(body.data_erogazione)
    patch.trimestre = trimestre
    patch.anno      = anno
  }

  const { data, error } = await admin.from('rimborsi_ras')
    .update(patch).eq('id', params.id).eq('club_id', clubId).select('*').single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx
  if (!clubId) return Response.json({ error: 'Club non trovato' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('rimborsi_ras').delete().eq('id', params.id).eq('club_id', clubId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
