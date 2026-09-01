// /api/segretario/pagamenti/abbonamento — gestione staff degli addebiti
// automatici retta (retta_abbonamenti). La società può sospendere un
// addebito (es. il bambino ha smesso di frequentare ma la famiglia non ha
// annullato) e riattivarlo in seguito, senza cancellare l'abbonamento —
// usa `pause_collection` di Stripe, reversibile, invece di eliminarlo.
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { stripeRequest } from '@/lib/stripe'
import { NextRequest } from 'next/server'

const RUOLI_WRITE = ['segretario', 'presidente', 'admin']

export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!ctx.clubId) return Response.json({ abbonamenti: [] })

  const { searchParams } = new URL(req.url)
  const giocatoreId = searchParams.get('giocatore_id')

  const admin = createAdminClient()
  let query = admin
    .from('retta_abbonamenti')
    .select('id, giocatore_id, importo_centesimi, stato, pausa_da, created_at')
    .eq('club_id', ctx.clubId)
    .neq('stato', 'cancellato')

  if (giocatoreId) query = query.eq('giocatore_id', giocatoreId)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ abbonamenti: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!RUOLI_WRITE.includes(ctx.ruolo)) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json()
  const id = body.id as string
  const azione = body.azione as 'sospendi' | 'riattiva'
  if (!id || (azione !== 'sospendi' && azione !== 'riattiva')) {
    return Response.json({ error: 'Parametri mancanti o non validi' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: abbonamento } = await admin
    .from('retta_abbonamenti')
    .select('id, club_id, stripe_subscription_id, stato')
    .eq('id', id)
    .eq('club_id', ctx.clubId)
    .maybeSingle()

  if (!abbonamento) return Response.json({ error: 'Abbonamento non trovato' }, { status: 404 })
  if (!abbonamento.stripe_subscription_id) {
    return Response.json({ error: 'Abbonamento non ancora attivo su Stripe' }, { status: 400 })
  }

  try {
    if (azione === 'sospendi') {
      if (abbonamento.stato !== 'attivo') {
        return Response.json({ error: 'Solo un abbonamento attivo può essere sospeso' }, { status: 400 })
      }
      await stripeRequest('POST', `/subscriptions/${abbonamento.stripe_subscription_id}`, {
        pause_collection: { behavior: 'void' },
      })
      await admin.from('retta_abbonamenti')
        .update({ stato: 'pausa', pausa_da: 'societa' })
        .eq('id', id)
    } else {
      if (abbonamento.stato !== 'pausa') {
        return Response.json({ error: 'Solo un abbonamento in pausa può essere riattivato' }, { status: 400 })
      }
      await stripeRequest('POST', `/subscriptions/${abbonamento.stripe_subscription_id}`, {
        pause_collection: '',
      })
      await admin.from('retta_abbonamenti')
        .update({ stato: 'attivo', pausa_da: null })
        .eq('id', id)
    }
    return Response.json({ ok: true })
  } catch (e: any) {
    return Response.json({ error: e.message ?? 'Errore Stripe' }, { status: 500 })
  }
}
