import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx
  if (!clubId) return Response.json([], { status: 200 })

  const admin = createAdminClient()
  const cfs   = new URL(req.url).searchParams.getAll('cf')

  let q = admin.from('dati_bancari_collaboratori').select('*').eq('club_id', clubId)
  if (cfs.length > 0) q = q.in('codice_fiscale', cfs.map(c => c.toUpperCase()))

  const { data } = await q
  return Response.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx
  if (!clubId) return Response.json({ error: 'Club non trovato' }, { status: 400 })

  const admin = createAdminClient()
  const body  = await req.json()

  const { data, error } = await admin.from('dati_bancari_collaboratori').upsert({
    club_id:        clubId,
    codice_fiscale: body.codice_fiscale.trim().toUpperCase(),
    iban:           body.iban.replace(/\s/g, '').toUpperCase(),
    intestatario:   body.intestatario.trim(),
    bic:            body.bic?.trim() || null,
  }, { onConflict: 'club_id,codice_fiscale' }).select('*').single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
