import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'
import { stagioneCorrente } from '@/lib/helpers'
import { categoriaFederaleDaEta, categoriaFederaleDaEtaAnagrafica, collegaGiocatoreGruppoCategoria } from '@/lib/settore-giovanile'

export const dynamic = 'force-dynamic'

/**
 * POST /api/giocatori
 * Crea un nuovo giocatore + tesseramento usando getUserContext (rispetta impersonazione).
 */
export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const { clubId } = ctx
  if (!clubId) return Response.json({ error: 'Club non trovato' }, { status: 400 })

  const admin = createAdminClient()
  const body  = await req.json()

  const cf = body.codice_fiscale?.trim().toUpperCase()

  // Controlla duplicato CF nel club
  if (cf) {
    const { data: dup } = await admin
      .from('giocatori').select('id')
      .eq('club_id', clubId).eq('codice_fiscale', cf)
      .maybeSingle()
    if (dup) return Response.json({ error: 'DUPLICATE_CF' }, { status: 409 })
  }

  // 1 — Inserisci giocatore
  const { data: giocatore, error: errG } = await admin
    .from('giocatori')
    .insert({
      club_id:           clubId,
      nome:              body.nome?.trim(),
      cognome:           body.cognome?.trim(),
      data_nascita:      body.data_nascita || null,
      luogo_nascita:     body.luogo_nascita?.trim() || null,
      codice_fiscale:    cf || null,
      nazionalita_tipo:  body.nazionalita ?? 'italiano',
      nazionalita_paese: body.nazionalita_paese?.trim() || 'Italia',
      ruolo_principale:  body.ruolo_principale || null,
      ruolo_secondario:  body.ruolo_secondario || null,
      piede:             body.piede ?? 'destro',
      altezza_cm:        body.altezza ? parseInt(body.altezza) : null,
      peso_kg:           body.peso    ? parseInt(body.peso)    : null,
      email_contatto:    body.email_contatto?.trim()    || null,
      telefono_contatto: body.telefono_contatto?.trim() || null,
      consenso_gdpr:          body.consenso_gdpr    ?? false,
      consenso_data:          body.consenso_gdpr ? new Date().toISOString() : null,
      consenso_immagini:      body.consenso_immagini ?? false,
      numero_matricola_figc:  body.numero_matricola_figc?.trim() || null,
    })
    .select('id').single()

  if (errG) return Response.json({ error: errG.message }, { status: 500 })

  // 2 — Tesseramento
  await admin.from('tesseramenti').insert({
    giocatore_id:  giocatore.id,
    club_id:       clubId,
    squadra_id:    body.squadra_id || null,
    stagione:      stagioneCorrente(),
    tipo:          body.tipo_tesseramento ?? 'definitivo',
    data_inizio:   body.data_inizio || new Date().toISOString().split('T')[0],
    numero_maglia: body.numero_maglia ? parseInt(body.numero_maglia) : null,
    stato:         'attivo',
  })

  // 3 — Famiglia (se minore)
  if (body.nome_genitore?.trim() && body.email_genitore?.trim()) {
    await admin.from('famiglie').insert({
      giocatore_id:      giocatore.id,
      club_id:           clubId,
      nome:              body.nome_genitore.trim(),
      cognome:           body.cognome_genitore?.trim() || '',
      relazione:         body.relazione_genitore ?? 'padre',
      email:             body.email_genitore.trim(),
      telefono:          body.telefono_genitore?.trim() || null,
      consenso_dati:     body.consenso_gdpr    ?? false,
      consenso_immagini: body.consenso_immagini ?? false,
    })
  }

  // 4 — Scuola calcio: aggiungi automaticamente al gruppo della categoria
  // (per età se non è stata assegnata una squadra) così il giocatore compare
  // subito in "Gruppi & Categorie" senza dover premere "Crea gruppi default"
  try {
    const { data: clubData } = await admin.from('clubs').select('tipo_prodotto').eq('id', clubId).maybeSingle()
    if (clubData?.tipo_prodotto === 'scuola_calcio_standalone') {
      let categoria = null as ReturnType<typeof categoriaFederaleDaEta> | null
      if (body.squadra_id) {
        const { data: sq } = await admin.from('squadre').select('categoria_eta').eq('id', body.squadra_id).maybeSingle()
        if (sq?.categoria_eta) categoria = categoriaFederaleDaEta(sq.categoria_eta)
      }
      if (!categoria) categoria = categoriaFederaleDaEtaAnagrafica(body.data_nascita)
      if (categoria) {
        await collegaGiocatoreGruppoCategoria(admin, { clubId, giocatoreId: giocatore.id, categoriaFederale: categoria })
      }

      // 5 — Genera in automatico le quote mensili per il nuovo tesserato, per
      // tutti i mesi già "aperti" per gli altri tesserati (stessa stagione),
      // ma solo dal suo mese di iscrizione in poi — mai per mesi precedenti.
      // Copia importo e scadenza già usati per quel mese, così non serve
      // ripassare a generarle a mano dal segretario.
      const stagione = stagioneCorrente()
      const dataIscrizione = body.data_inizio || new Date().toISOString().split('T')[0]
      const meseIscrizione = new Date(dataIscrizione).getMonth() + 1 // 1-12

      const { data: quoteEsistenti } = await admin
        .from('quote_iscrizione')
        .select('mese, importo_totale, scadenza')
        .eq('club_id', clubId)
        .eq('stagione', stagione)
        .gt('mese', 0)

      if (quoteEsistenti && quoteEsistenti.length > 0) {
        const perMese = new Map<number, { importo_totale: number; scadenza: string | null }>()
        for (const q of quoteEsistenti) {
          if (!perMese.has(q.mese)) perMese.set(q.mese, { importo_totale: q.importo_totale, scadenza: q.scadenza })
        }

        // La stagione scuola calcio va da settembre(9) a giugno(6): normalizza
        // l'ordine cronologico reale per poter confrontare "mese >= iscrizione".
        const ordineStagione = (m: number) => (m >= 7 ? m : m + 12)
        const sogliaIscrizione = ordineStagione(meseIscrizione)

        const daCreare = Array.from(perMese.entries())
          .filter(([mese]) => ordineStagione(mese) >= sogliaIscrizione)
          .map(([mese, dati]) => ({
            giocatore_id:   giocatore.id,
            club_id:        clubId,
            stagione,
            mese,
            importo_totale: dati.importo_totale,
            importo_pagato: 0,
            stato:          'non_pagato',
            scadenza:       dati.scadenza,
          }))

        if (daCreare.length > 0) {
          await admin.from('quote_iscrizione')
            .upsert(daCreare, { onConflict: 'giocatore_id,club_id,stagione,mese', ignoreDuplicates: true })
        }
      }
    }
  } catch {}

  return Response.json({ id: giocatore.id })
}

/**
 * GET /api/giocatori
 * ?tutti=1  → tutti i tesserati attivi del club (usato da Rosa FIGC)
 * default   → prima squadra; fallback a tutti se prima_squadra vuota
 */
export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const { clubId } = ctx
  console.log('ROSA FIGC club_id usato:', clubId)
  if (!clubId) return Response.json([], { status: 200 })

  const admin = createAdminClient()
  const tutti = new URL(req.url).searchParams.get('tutti') === '1'

  const FIELDS = 'numero_maglia, squadra_id, squadre(categoria_eta), giocatori(id, nome, cognome, ruolo_principale, data_nascita, nazionalita_paese, codice_tessera_figc)'

  let rows: any[] | null = null

  if (tutti) {
    // Rosa FIGC: tutti i tesserati attivi del club, tutte le squadre
    const { data, error } = await admin
      .from('tesseramenti')
      .select(FIELDS)
      .eq('club_id', clubId)
      .eq('stato', 'attivo')
    console.log('ROSA FIGC risultato query:', data?.length ?? 0, error)
    rows = data
  } else {
    // Prima squadra del club
    const { data: sqPS } = await admin
      .from('squadre')
      .select('id')
      .eq('club_id', clubId)
      .eq('categoria_eta', 'prima_squadra')
      .eq('attiva', true)
    const sqIds = (sqPS ?? []).map(s => s.id)

    if (sqIds.length > 0) {
      const { data, error } = await admin
        .from('tesseramenti')
        .select(FIELDS)
        .in('squadra_id', sqIds)
        .eq('club_id', clubId)
        .eq('stato', 'attivo')
      console.log('ROSA FIGC risultato query:', data?.length ?? 0, error)
      rows = data
    }

    // Fallback: tutti i tesserati attivi del club
    if (!rows || rows.length === 0) {
      const { data, error } = await admin
        .from('tesseramenti')
        .select(FIELDS)
        .eq('club_id', clubId)
        .eq('stato', 'attivo')
      console.log('ROSA FIGC risultato query (fallback):', data?.length ?? 0, error)
      rows = data
    }
  }

  // Deduplica per giocatore_id (tieni prima occorrenza — prima_squadra ha priorità se ordinata prima)
  const seen = new Map<string, any>()
  for (const t of rows ?? []) {
    const g = (t as any).giocatori
    if (!g?.id) continue
    const cat = (t as any).squadre?.categoria_eta ?? null
    if (!seen.has(g.id)) {
      seen.set(g.id, { ...g, numero_maglia: (t as any).numero_maglia ?? null, categoria_eta: cat })
    }
  }
  const giocatori = Array.from(seen.values())
  giocatori.sort((a, b) => (a.cognome ?? '').localeCompare(b.cognome ?? '', 'it'))

  return Response.json(giocatori)
}
