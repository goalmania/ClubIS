import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const sub = body?.subscription
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return Response.json({ error: 'Subscription non valida' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('cis_push_subscriptions')
    .upsert({
      utente_id: ctx.userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    }, { onConflict: 'utente_id,endpoint' })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const supabase = createAdminClient()

  let query = supabase.from('cis_push_subscriptions').delete().eq('utente_id', ctx.userId)
  if (body?.endpoint) query = query.eq('endpoint', body.endpoint)

  const { error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
