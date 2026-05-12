// src/app/api/settore-giovanile/squadre/route.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'

const RUOLI_WRITE = ['segretario', 'ds', 'presidente', 'admin']

export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const soloAttive = searchParams.get('attive') !== 'false'

  let query = supabase
    .from('squadre')
    .select(`
      id,
      nome,
      categoria_eta,
      colore_badge,
      descrizione,
      max_giocatori,
      attiva,
      allenatore_id,
      allenatore:utenti!allenatore_id(id, nome, cognome)
    `)
    .eq('club_id', ctx.clubId)
    .order('nome')

  if (soloAttive) query = query.eq('attiva', true)

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ squadre: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!RUOLI_WRITE.includes(ctx.ruolo)) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const supabase = createAdminClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('squadre')
    .insert({
      club_id: ctx.clubId,
      nome: body.nome,
      categoria_eta: body.categoria_eta,
      colore_badge: body.colore_badge ?? '#c8f000',
      descrizione: body.descrizione ?? null,
      max_giocatori: body.max_giocatori ?? 30,
      allenatore_id: body.allenatore_id ?? null,
      attiva: true,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ squadra: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!RUOLI_WRITE.includes(ctx.ruolo)) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'id mancante' }, { status: 400 })

  const body = await req.json()

  const aggiornamenti: Record<string, unknown> = {}
  if (body.nome           !== undefined) aggiornamenti.nome            = body.nome
  if (body.categoria_eta  !== undefined) aggiornamenti.categoria_eta   = body.categoria_eta
  if (body.colore_badge   !== undefined) aggiornamenti.colore_badge    = body.colore_badge
  if (body.descrizione    !== undefined) aggiornamenti.descrizione     = body.descrizione
  if (body.max_giocatori  !== undefined) aggiornamenti.max_giocatori   = body.max_giocatori
  if (body.allenatore_id  !== undefined) aggiornamenti.allenatore_id   = body.allenatore_id
  if (body.attiva         !== undefined) aggiornamenti.attiva          = body.attiva

  const { data, error } = await supabase
    .from('squadre')
    .update(aggiornamenti)
    .eq('id', id)
    .eq('club_id', ctx.clubId)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ squadra: data })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!RUOLI_WRITE.includes(ctx.ruolo)) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'id mancante' }, { status: 400 })

  // Soft-delete: disattiva la squadra invece di eliminarla
  const { error } = await supabase
    .from('squadre')
    .update({ attiva: false })
    .eq('id', id)
    .eq('club_id', ctx.clubId)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
