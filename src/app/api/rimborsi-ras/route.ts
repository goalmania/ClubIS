import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

function calcolaTrimestre(dateStr: string) {
  const d = new Date(dateStr)
  return { trimestre: Math.ceil((d.getMonth() + 1) / 3), anno: d.getFullYear() }
}

export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx
  if (!clubId) return Response.json([], { status: 200 })

  const admin = createAdminClient()
  const sp    = new URL(req.url).searchParams
  const anno      = sp.get('anno')
  const trimestre = sp.get('trimestre')

  let q = admin.from('rimborsi_ras').select('*').eq('club_id', clubId).order('data_erogazione', { ascending: false })
  if (anno)      q = q.eq('anno',      parseInt(anno))
  if (trimestre) q = q.eq('trimestre', parseInt(trimestre))

  const { data, error } = await q
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx
  if (!clubId) return Response.json({ error: 'Club non trovato' }, { status: 400 })

  const admin = createAdminClient()
  const body  = await req.json()
  const { trimestre, anno } = calcolaTrimestre(body.data_erogazione)

  const { data, error } = await admin.from('rimborsi_ras').insert({
    club_id:          clubId,
    soggetto_nome:    body.soggetto_nome?.trim(),
    soggetto_cognome: body.soggetto_cognome?.trim(),
    codice_fiscale:   body.codice_fiscale?.trim().toUpperCase(),
    ruolo:            body.ruolo,
    tipo_rimborso:    body.tipo_rimborso,
    importo:          parseFloat(body.importo),
    data_erogazione:  body.data_erogazione,
    trimestre,
    anno,
    causale:          body.causale?.trim() || null,
    note:             body.note?.trim()    || null,
  }).select('*').single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
