import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'
import { stagioneCorrente } from '@/lib/helpers'

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
      consenso_gdpr:     body.consenso_gdpr    ?? false,
      consenso_data:     body.consenso_gdpr ? new Date().toISOString() : null,
      consenso_immagini: body.consenso_immagini ?? false,
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
      nome:              body.nome_genitore.trim(),
      cognome:           body.cognome_genitore?.trim() || '',
      relazione:         body.relazione_genitore ?? 'padre',
      email:             body.email_genitore.trim(),
      telefono:          body.telefono_genitore?.trim() || null,
      consenso_dati:     body.consenso_gdpr    ?? false,
      consenso_immagini: body.consenso_immagini ?? false,
    })
  }

  return Response.json({ id: giocatore.id })
}

/**
 * GET /api/giocatori
 * Restituisce i giocatori della prima squadra del club.
 * Fallback: se nessun giocatore nella prima squadra, restituisce tutti i tesserati attivi del club.
 */
export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const { clubId } = ctx
  if (!clubId) return Response.json([], { status: 200 })

  const admin = createAdminClient()

  // Prima squadra del club
  const { data: sqPS } = await admin
    .from('squadre')
    .select('id')
    .eq('club_id', clubId)
    .eq('categoria_eta', 'prima_squadra')
    .eq('attiva', true)
  const sqIds = (sqPS ?? []).map(s => s.id)

  let rows: any[] | null = null

  const FIELDS = 'numero_maglia, squadra_id, squadre(categoria_eta), giocatori(id, nome, cognome, ruolo_principale, data_nascita, nazionalita_paese, codice_tessera_figc)'

  if (sqIds.length > 0) {
    const { data } = await admin
      .from('tesseramenti')
      .select(FIELDS)
      .in('squadra_id', sqIds)
      .eq('stato', 'attivo')
    rows = data
  }

  // Fallback: tutti i tesserati attivi del club
  if (!rows || rows.length === 0) {
    const { data } = await admin
      .from('tesseramenti')
      .select(FIELDS)
      .eq('club_id', clubId)
      .eq('stato', 'attivo')
    rows = data
  }

  // Deduplica per giocatore_id (tieni prima_squadra se duplicato)
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
