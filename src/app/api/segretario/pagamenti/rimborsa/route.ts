// POST /api/segretario/pagamenti/rimborsa
//
// Rimborsa un pagamento carta (quote_iscrizione → pagamenti) fatto tramite
// ClubIS Pay. Chiama Stripe refunds sul payment_intent originale (charge sul
// conto piattaforma con destination transfer al club: reverse_transfer +
// refund_application_fee per recuperare sia il trasferito al club sia la
// nostra commissione). Non elimina lo storico: inserisce una riga pagamenti
// di segno opposto (il trigger sync_pagamenti ricalcola importo_pagato/stato
// della quota) e uno storno in Prima Nota (stesso pattern di
// src/app/api/prima-nota/route.ts DELETE).
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { stripeRequest, importoNettoClub } from '@/lib/stripe'
import { NextRequest } from 'next/server'

const RUOLI_WRITE = ['segretario', 'presidente', 'admin']

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!RUOLI_WRITE.includes(ctx.ruolo)) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json()
  const pagamentoId = body.pagamentoId as string
  const motivo = (body.motivo as string) ?? ''
  if (!pagamentoId) return Response.json({ error: 'pagamentoId mancante' }, { status: 400 })

  const admin = createAdminClient()

  const { data: pagamento } = await admin
    .from('pagamenti')
    .select('id, quota_id, importo, metodo, stripe_payment_id, quota:quote_iscrizione!quota_id(club_id, stagione, mese, giocatore:giocatori!giocatore_id(nome, cognome))')
    .eq('id', pagamentoId)
    .maybeSingle()

  if (!pagamento) return Response.json({ error: 'Pagamento non trovato' }, { status: 404 })

  const quota = pagamento.quota as any
  if (!quota || quota.club_id !== ctx.clubId) {
    return Response.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  if (pagamento.metodo !== 'stripe' || !pagamento.stripe_payment_id) {
    return Response.json({ error: 'Questo pagamento non è stato effettuato con carta (ClubIS Pay)' }, { status: 400 })
  }

  const marcaRimborso = `rimborso_${pagamento.id}`
  const { count: giaRimborsato } = await admin
    .from('pagamenti')
    .select('id', { count: 'exact', head: true })
    .eq('stripe_payment_id', marcaRimborso)

  if ((giaRimborsato ?? 0) > 0) {
    return Response.json({ error: 'Pagamento già rimborsato' }, { status: 400 })
  }

  try {
    await stripeRequest('POST', '/refunds', {
      payment_intent: pagamento.stripe_payment_id,
      reverse_transfer: true,
      refund_application_fee: true,
    })
  } catch (e: any) {
    return Response.json({ error: e.message ?? 'Errore Stripe' }, { status: 500 })
  }

  const oggi = new Date().toISOString().split('T')[0]
  const g = quota.giocatore as any
  const nomeGiocatore = g ? `${g.nome} ${g.cognome}` : 'giocatore'

  await admin.from('pagamenti').insert({
    quota_id: pagamento.quota_id,
    importo: -Number(pagamento.importo),
    metodo: 'stripe',
    data_pagamento: oggi,
    stripe_payment_id: marcaRimborso,
    registrato_da: ctx.userId,
    note: `Rimborso pagamento ${pagamento.id}${motivo ? ` — ${motivo}` : ''}`,
  })

  await admin.from('prima_nota').insert({
    club_id: quota.club_id,
    tipo: 'uscita',
    categoria: 'quote_iscrizione',
    importo: importoNettoClub(Number(pagamento.importo)),
    data: oggi,
    descrizione: `[STORNO] Rimborso quota iscrizione — ${nomeGiocatore}`,
    controparte: nomeGiocatore,
    sorgente: 'storno',
    sorgente_id: pagamento.id,
    registrato_da: ctx.userId,
  })

  return Response.json({ ok: true })
}
