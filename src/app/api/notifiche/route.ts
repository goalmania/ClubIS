// src/app/api/notifiche/route.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'

// GET  — ultime 40 notifiche dell'utente corrente
// PATCH — segna lette (body: { id } | { tutti: true })
// DELETE — elimina una notifica

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()

  const [{ data, error }, { count: totaleNonLette }] = await Promise.all([
    supabase
      .from('notifiche_sistema')
      .select('id, tipo, titolo, messaggio, letta, azione_url, creata_at, ruolo_destinatario')
      .eq('destinatario_id', ctx.userId)
      .eq('club_id', ctx.clubId)
      .order('creata_at', { ascending: false })
      .limit(50),
    supabase
      .from('notifiche_sistema')
      .select('*', { count: 'exact', head: true })
      .eq('destinatario_id', ctx.userId)
      .eq('club_id', ctx.clubId)
      .eq('letta', false),
  ])

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ notifiche: data ?? [], nonLette: totaleNonLette ?? 0 })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()
  const body = await req.json()

  if (body.tutti) {
    // Segna tutte come lette
    await supabase
      .from('notifiche_sistema')
      .update({ letta: true })
      .eq('destinatario_id', ctx.userId)
      .eq('club_id', ctx.clubId)
      .eq('letta', false)

    return Response.json({ ok: true })
  }

  if (body.id) {
    // Segna una sola
    await supabase
      .from('notifiche_sistema')
      .update({ letta: true })
      .eq('id', body.id)
      .eq('destinatario_id', ctx.userId)

    return Response.json({ ok: true })
  }

  return Response.json({ error: 'Parametri mancanti' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  // Elimina tutte le lette
  if (searchParams.get('lette') === 'true') {
    await supabase
      .from('notifiche_sistema')
      .delete()
      .eq('destinatario_id', ctx.userId)
      .eq('club_id', ctx.clubId)
      .eq('letta', true)
    return Response.json({ ok: true })
  }

  if (!id) return Response.json({ error: 'id mancante' }, { status: 400 })

  await supabase
    .from('notifiche_sistema')
    .delete()
    .eq('id', id)
    .eq('destinatario_id', ctx.userId)

  return Response.json({ ok: true })
}
