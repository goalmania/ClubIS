// src/app/api/famiglia/piani/route.ts
//
// API dedicata alla famiglia per leggere quote_iscrizione (quota stagionale
// principale) + piani_pagamento/rate_pagamento, e dichiarare il pagamento
// di una rata. Usa createAdminClient() per bypassare RLS (tabelle hanno RLS
// disabilitato ma il browser client con ruolo `authenticated` non ha GRANT
// impliciti).
//
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'

// ── GET /api/famiglia/piani ───────────────────────────────────────────────────
// Ritorna quota di iscrizione + piani di pagamento (con rate) collegati alla
// famiglia dell'utente autenticato. Supporta anche l'anteprima "Visualizza
// come Famiglia" del super admin (nessuna riga in `famiglie`, ma un
// giocatore già risolto dall'impersonazione).
export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (ctx.ruolo !== 'famiglia') return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const supabase = createAdminClient()

  // Recupera tutte le famiglie (uno o più figli) collegate all'utente
  const { data: famiglie } = await supabase
    .from('famiglie')
    .select('id, giocatore_id, nome, cognome, giocatori(id, nome, cognome)')
    .eq('auth_user_id', ctx.userId)
    .order('created_at', { ascending: true })

  const haFamiglie = !!famiglie && famiglie.length > 0

  // Anteprima admin: nessuna famiglia reale, ma l'impersonazione ha già
  // risolto un giocatore (vedi /api/admin/impersonate) — costruiamo un
  // "figlio" sintetico così l'anteprima mostra dati veri invece di essere
  // sempre vuota.
  let previewGiocatore: { id: string; nome: string; cognome: string } | null = null
  if (!haFamiglie && ctx.isImpersonating && ctx.giocatoreId) {
    const { data: g } = await supabase
      .from('giocatori')
      .select('id, nome, cognome')
      .eq('id', ctx.giocatoreId)
      .maybeSingle()
    if (g) previewGiocatore = g
  }

  if (!haFamiglie && !previewGiocatore) {
    return Response.json({ piani: [], quoteIscrizione: [], abbonamenti: [], famiglia: null, famiglie: [], club: null })
  }

  const famigliaIds = haFamiglie ? famiglie!.map(f => f.id) : []
  const giocatoreIds = haFamiglie ? famiglie!.map(f => f.giocatore_id) : [previewGiocatore!.id]

  // Carica i piani (di tutti i figli collegati) con le relative rate —
  // solo per famiglie reali: piani_pagamento è legato a famiglia_id.
  let piani: any[] = []
  if (famigliaIds.length > 0) {
    const { data, error } = await supabase
      .from('piani_pagamento')
      .select(`
        id,
        descrizione,
        importo_totale,
        created_at,
        famiglia_id,
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
      .in('famiglia_id', famigliaIds)
      .order('created_at', { ascending: false })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    piani = data ?? []
  }

  // Mappa giocatore_id → dati giocatore (utile con più figli e per l'anteprima)
  const giocPerId = new Map<string, { id: string; nome: string; cognome: string }>()
  ;(famiglie ?? []).forEach(f => giocPerId.set(f.giocatore_id, (f as any).giocatori))
  if (previewGiocatore) giocPerId.set(previewGiocatore.id, previewGiocatore)

  const famPerId = new Map((famiglie ?? []).map(f => [f.id, f]))
  const pianiConGiocatore = piani.map(p => ({
    ...p,
    giocatore: (famPerId.get(p.famiglia_id) as any)?.giocatori ?? null,
  }))

  // Quota di iscrizione stagionale (sistema principale, tutti i club) —
  // per giocatore_id diretto, funziona sia per account reali sia anteprima.
  const { data: quoteIscr } = await supabase
    .from('quote_iscrizione')
    .select('id, club_id, giocatore_id, stagione, mese, importo_totale, importo_pagato, stato, scadenza')
    .in('giocatore_id', giocatoreIds)
    .order('stagione', { ascending: false })

  const quoteIscrizioneConGiocatore = (quoteIscr ?? []).map(q => ({
    ...q,
    giocatore: giocPerId.get(q.giocatore_id) ?? null,
  }))

  // Addebiti automatici (retta) attivi/in attesa/in pausa per i figli collegati
  const { data: abbonamenti } = await supabase
    .from('retta_abbonamenti')
    .select('id, giocatore_id, importo_centesimi, stato, pausa_da, created_at')
    .in('giocatore_id', giocatoreIds)
    .neq('stato', 'cancellato')

  // Recupera info club (IBAN) tramite il tesseramento più recente del primo figlio collegato
  let club = null
  const primoGiocatoreId = haFamiglie ? famiglie![0]?.giocatore_id : previewGiocatore?.id
  if (primoGiocatoreId) {
    const { data: tess } = await supabase
      .from('tesseramenti')
      .select('club_id')
      .eq('giocatore_id', primoGiocatoreId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (tess?.club_id) {
      const { data: c } = await supabase
        .from('clubs')
        .select('nome, iban, bic, intestatario_conto, stripe_connect_charges_enabled')
        .eq('id', tess.club_id)
        .maybeSingle()
      club = c ?? null
    }
  }

  const fam = haFamiglie ? famiglie![0] : null
  return Response.json({
    piani: pianiConGiocatore,
    quoteIscrizione: quoteIscrizioneConGiocatore,
    abbonamenti: abbonamenti ?? [],
    famiglia: fam
      ? { id: fam.id, giocatore_id: fam.giocatore_id, giocatore: (fam as any).giocatori ?? null }
      : (previewGiocatore ? { id: null, giocatore_id: previewGiocatore.id, giocatore: previewGiocatore } : null),
    famiglie: fam
      ? famiglie!.map(f => ({ id: f.id, giocatore_id: f.giocatore_id, giocatore: (f as any).giocatori ?? null }))
      : (previewGiocatore ? [{ id: null, giocatore_id: previewGiocatore.id, giocatore: previewGiocatore }] : []),
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
