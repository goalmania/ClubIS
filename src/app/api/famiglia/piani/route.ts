// src/app/api/famiglia/piani/route.ts
//
// API dedicata alla famiglia per leggere piani_pagamento + rate_pagamento
// e dichiarare il pagamento di una rata.
// Usa createAdminClient() per bypassare RLS (tabelle hanno RLS disabilitato
// ma il browser client con ruolo `authenticated` non ha GRANT impliciti).
//
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'

// ── GET /api/famiglia/piani ───────────────────────────────────────────────────
// Ritorna tutti i piani di pagamento (con rate) collegati alla famiglia
// dell'utente autenticato.
export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (ctx.ruolo !== 'famiglia') return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const supabase = createAdminClient()

  // Recupera l'id della famiglia collegata all'utente
  const { data: fam } = await supabase
    .from('famiglie')
    .select('id, giocatore_id, nome, cognome, giocatori(id, nome, cognome)')
    .eq('auth_user_id', ctx.userId)
    .maybeSingle()

  if (!fam) return Response.json({ piani: [], famiglia: null })

  // Carica i piani con le relative rate
  const { data: piani, error } = await supabase
    .from('piani_pagamento')
    .select(`
      id,
      descrizione,
      importo_totale,
      created_at,
      rate_pagamento(
        id,
        numero_rata,
        importo,
        scadenza,
        stato,
        data_pagamento,
        metodo_pagamento,
        note
      )
    `)
    .eq('famiglia_id', fam.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Recupera info club (IBAN) tramite tesseramento più recente
  let club = null
  if (fam.giocatore_id) {
    const { data: tess } = await supabase
      .from('tesseramenti')
      .select('club_id')
      .eq('giocatore_id', fam.giocatore_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (tess?.club_id) {
      const { data: c } = await supabase
        .from('clubs')
        .select('nome, iban, bic, intestatario_conto')
        .eq('id', tess.club_id)
        .maybeSingle()
      club = c ?? null
    }
  }

  return Response.json({
    piani: piani ?? [],
    famiglia: {
      id: fam.id,
      giocatore_id: fam.giocatore_id,
      giocatore: (fam as any).giocatori ?? null,
    },
    club,
  })
}

// ── PATCH /api/famiglia/piani?rata_id=<id> ────────────────────────────────────
// La famiglia dichiara il pagamento di una rata specifica.
// Verifica che la rata appartenga a un piano della famiglia prima di aggiornare.
export async function PATCH(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (ctx.ruolo !== 'famiglia') return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const rataId = searchParams.get('rata_id')
  if (!rataId) return Response.json({ error: 'rata_id mancante' }, { status: 400 })

  const supabase = createAdminClient()

  // Verifica ownership: la rata deve appartenere a un piano della famiglia
  const { data: rata } = await supabase
    .from('rate_pagamento')
    .select('id, stato, piano_id, famiglia_id')
    .eq('id', rataId)
    .maybeSingle()

  if (!rata) return Response.json({ error: 'Rata non trovata' }, { status: 404 })

  // Controlla che la famiglia dell'utente sia quella del piano
  const { data: fam } = await supabase
    .from('famiglie')
    .select('id')
    .eq('auth_user_id', ctx.userId)
    .eq('id', rata.famiglia_id)
    .maybeSingle()

  if (!fam) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  if (rata.stato === 'pagata') {
    return Response.json({ error: 'Rata già pagata' }, { status: 400 })
  }
  if (rata.stato === 'dichiarato') {
    return Response.json({ error: 'Rata già dichiarata, in attesa di conferma' }, { status: 400 })
  }

  const body = await req.json()

  const { data, error } = await supabase
    .from('rate_pagamento')
    .update({
      stato:            'dichiarato',
      metodo_pagamento: body.metodo_pagamento ?? null,
      data_pagamento:   body.data_pagamento   ?? new Date().toISOString().split('T')[0],
      note:             body.note             ?? null,
      updated_at:       new Date().toISOString(),
    })
    .eq('id', rataId)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ rata: data })
}
