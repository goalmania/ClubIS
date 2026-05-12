// src/app/api/settore-giovanile/quote/route.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { isQuotaInRitardo } from '@/lib/settore-giovanile'
import { NextRequest } from 'next/server'

const RUOLI_WRITE = ['segretario', 'ds', 'presidente', 'admin', 'team_manager']

export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const squadraId  = searchParams.get('squadra_id')
  const mese       = searchParams.get('mese')         // es. '2025-09-01'
  const giocatoreId = searchParams.get('giocatore_id')
  const stato      = searchParams.get('stato')

  // Se ruolo famiglia, forza il filtro ai propri figli
  // ctx.giocatoreId è già risolto da getUserContext via famiglie (fallback incluso)
  let forcedGiocatoreIds: string[] = []
  if (ctx.ruolo === 'famiglia') {
    if (ctx.giocatoreId) {
      forcedGiocatoreIds = [ctx.giocatoreId]
    } else {
      // Ultima risorsa: carica tutti i figli dalla tabella famiglie
      const { data: fams } = await supabase
        .from('famiglie')
        .select('giocatore_id')
        .eq('auth_user_id', ctx.userId)
      forcedGiocatoreIds = (fams ?? []).map((f: { giocatore_id: string }) => f.giocatore_id).filter(Boolean)
    }
    if (forcedGiocatoreIds.length === 0) return Response.json({ quote: [] })
  }

  const selectFields = `
      id,
      squadra_id,
      giocatore_id,
      famiglia_id,
      importo_mensile,
      mese_competenza,
      stato,
      data_pagamento,
      metodo_pagamento,
      note,
      ricevuta_url,
      created_at,
      giocatore:giocatori!giocatore_id(id, nome, cognome),
      squadra:squadre!squadra_id(id, nome, categoria_eta, colore_badge)
    `

  let query = supabase
    .from('quote_giovanili')
    .select(selectFields)
    .order('mese_competenza', { ascending: false })

  // Per la famiglia filtriamo per giocatore (sicuro — già limitato da getUserContext)
  // Se ctx.clubId è null (utente famiglia senza tesseramento attivo), omettiamo il
  // filtro club_id e ci affidiamo solo al filtro giocatore_id
  if (forcedGiocatoreIds.length > 0) {
    query = forcedGiocatoreIds.length === 1
      ? query.eq('giocatore_id', forcedGiocatoreIds[0])
      : query.in('giocatore_id', forcedGiocatoreIds)
    // aggiungi club_id solo se disponibile
    if (ctx.clubId) query = query.eq('club_id', ctx.clubId)
  } else {
    // Staff: filtro obbligatorio per club
    if (ctx.clubId) query = query.eq('club_id', ctx.clubId)
    else return Response.json({ quote: [] })
    if (squadraId)    query = query.eq('squadra_id', squadraId)
    if (giocatoreId)  query = query.eq('giocatore_id', giocatoreId)
    if (stato)        query = query.eq('stato', stato)
  }
  if (mese) query = query.eq('mese_competenza', mese)

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Aggiorna automaticamente in_ritardo dove necessario
  const oggi = new Date().toISOString().split('T')[0]
  const daAggiornare = (data ?? [])
    .filter(q => isQuotaInRitardo(q.mese_competenza, q.stato) && q.stato === 'da_pagare')
    .map(q => q.id)

  if (daAggiornare.length > 0) {
    await supabase
      .from('quote_giovanili')
      .update({ stato: 'in_ritardo', updated_at: oggi })
      .in('id', daAggiornare)

    // Notifica segretario per le quote in ritardo
    const { data: segretari } = await supabase
      .from('utenti')
      .select('id')
      .eq('club_id', ctx.clubId)
      .eq('ruolo', 'segretario')

    if (segretari && segretari.length > 0) {
      const notifiche = segretari.map((s: { id: string }) => ({
        destinatario_id:    s.id,
        club_id:            ctx.clubId,
        ruolo_destinatario: 'segretario',
        tipo:               'alert_sistema',
        titolo:             'Quote giovanili in ritardo',
        messaggio:          `${daAggiornare.length} quot${daAggiornare.length === 1 ? 'a' : 'e'} mensile non ${daAggiornare.length === 1 ? 'è stata pagata' : 'sono state pagate'} entro il 10 del mese.`,
        azione_url:         '/dashboard/segretario/settore-giovanile',
        letta:              false,
      }))
      await supabase.from('notifiche_sistema').insert(notifiche)
    }

    // Aggiorna i dati localmente
    data?.forEach(q => {
      if (daAggiornare.includes(q.id)) q.stato = 'in_ritardo'
    })
  }

  return Response.json({ quote: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!RUOLI_WRITE.includes(ctx.ruolo)) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const supabase = createAdminClient()
  const body = await req.json()

  // Generazione massiva: body.giocatori = array di giocatore_id
  if (Array.isArray(body.giocatori) && body.giocatori.length > 0) {
    const righe = body.giocatori.map((gid: string) => ({
      club_id: ctx.clubId,
      squadra_id: body.squadra_id,
      giocatore_id: gid,
      famiglia_id: body.famiglia_id ?? null,
      importo_mensile: body.importo_mensile ?? 0,
      mese_competenza: body.mese_competenza,
      stato: 'da_pagare',
      creato_da: ctx.userId,
    }))

    const { data, error } = await supabase
      .from('quote_giovanili')
      .insert(righe)
      .select()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ quote: data }, { status: 201 })
  }

  // Inserimento singolo
  const { data, error } = await supabase
    .from('quote_giovanili')
    .insert({
      club_id: ctx.clubId,
      squadra_id: body.squadra_id,
      giocatore_id: body.giocatore_id,
      famiglia_id: body.famiglia_id ?? null,
      importo_mensile: body.importo_mensile ?? 0,
      mese_competenza: body.mese_competenza,
      stato: body.stato ?? 'da_pagare',
      data_pagamento: body.data_pagamento ?? null,
      metodo_pagamento: body.metodo_pagamento ?? null,
      note: body.note ?? null,
      ricevuta_url: body.ricevuta_url ?? null,
      creato_da: ctx.userId,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ quota: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'id mancante' }, { status: 400 })

  const body = await req.json()

  // ── Percorso famiglia: può solo dichiarare una quota come "dichiarata" ──────
  if (ctx.ruolo === 'famiglia') {
    // Verifica che la quota appartenga al figlio collegato
    const { data: quota } = await supabase
      .from('quote_giovanili')
      .select('id, giocatore_id, stato')
      .eq('id', id)
      .maybeSingle()

    if (!quota) return Response.json({ error: 'Quota non trovata' }, { status: 404 })

    // Controlla che il giocatore sia figlio di questa famiglia
    const { data: fam } = await supabase
      .from('famiglie')
      .select('id')
      .eq('auth_user_id', ctx.userId)
      .eq('giocatore_id', quota.giocatore_id)
      .maybeSingle()

    if (!fam) return Response.json({ error: 'Non autorizzato' }, { status: 403 })
    if (quota.stato === 'pagata' || quota.stato === 'esonerata') {
      return Response.json({ error: 'Quota già saldata' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('quote_giovanili')
      .update({
        stato:            'dichiarata',
        metodo_pagamento: body.metodo_pagamento ?? null,
        data_pagamento:   body.data_pagamento   ?? new Date().toISOString().split('T')[0],
        note:             body.note             ?? null,
        updated_at:       new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ quota: data })
  }

  // ── Percorso staff ────────────────────────────────────────────────────────
  if (!RUOLI_WRITE.includes(ctx.ruolo)) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const aggiornamenti: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (body.stato            !== undefined) aggiornamenti.stato            = body.stato
  if (body.importo_mensile  !== undefined) aggiornamenti.importo_mensile  = body.importo_mensile
  if (body.data_pagamento   !== undefined) aggiornamenti.data_pagamento   = body.data_pagamento
  if (body.metodo_pagamento !== undefined) aggiornamenti.metodo_pagamento = body.metodo_pagamento
  if (body.note             !== undefined) aggiornamenti.note             = body.note
  if (body.ricevuta_url     !== undefined) aggiornamenti.ricevuta_url     = body.ricevuta_url

  // Se segnata come pagata, auto-popola data_pagamento
  if (body.stato === 'pagata' && !body.data_pagamento) {
    aggiornamenti.data_pagamento = new Date().toISOString().split('T')[0]
  }

  const { data, error } = await supabase
    .from('quote_giovanili')
    .update(aggiornamenti)
    .eq('id', id)
    .eq('club_id', ctx.clubId)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ quota: data })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!RUOLI_WRITE.includes(ctx.ruolo)) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'id mancante' }, { status: 400 })

  const { error } = await supabase
    .from('quote_giovanili')
    .delete()
    .eq('id', id)
    .eq('club_id', ctx.clubId)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
