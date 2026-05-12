import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { parseComunicatoLND, fuzzyScore } from '@/lib/comunicati-parser'
import { extractPDFText } from '@/lib/pdf/extractor'
import { getClubFromSession } from '@/lib/server-helpers'
import { canAccess } from '@/lib/features'

/* ── Normalizza un nome di società per il confronto ─────────────────── */
function normalizeNome(s: string): string {
  return s
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Rimuove prefissi associativi comuni
    .replace(/\b(A\.?S\.?D?\.?|S\.?S\.?D?\.?|A\.?C\.?|F\.?C\.?|U\.?S\.?|S\.?S\.?C\.?|A\.?S\.?C\.?|CALCIO|FOOTBALL|SPORT|SPORTING)\b/g, '')
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Calcola quanto una società nel PDF corrisponde al nome del club.
 * Usa Levenshtein su stringhe normalizzate.
 */
function societyScore(societaRaw: string, clubNome: string, clubNomeEsteso?: string | null): number {
  const a = normalizeNome(societaRaw)
  if (!a) return 0

  const scores: number[] = [clubNome, clubNomeEsteso].filter(Boolean).map(n => {
    const b = normalizeNome(n!)
    if (!b) return 0
    // Containment bonus: se uno contiene l'altro integralmente
    if (a.includes(b) || b.includes(a)) return 0.95
    // Levenshtein normalizzato
    const maxL = Math.max(a.length, b.length)
    if (maxL === 0) return 0
    let dist = 0
    const dp = Array.from({ length: a.length + 1 }, (_, i) =>
      Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
    )
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    dist = dp[a.length][b.length]
    return 1 - dist / maxL
  })

  return scores.length ? Math.max(...scores) : 0
}

export async function POST(req: NextRequest) {
  const session = await getClubFromSession()
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canAccess('comunicati_figc_analisi', session.plan)) {
    return NextResponse.json({ error: 'Piano insufficiente. Aggiorna il tuo abbonamento.' }, { status: 403 })
  }

  const sessionClient = createClient()
  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente } = await supabase
    .from('utenti').select('club_id').eq('id', user.id).single()
  if (!utente?.club_id) return NextResponse.json({ error: 'Club non trovato' }, { status: 403 })

  const clubId = utente.club_id

  const formData = await req.formData()
  const file = formData.get('pdf') as File | null
  const comitato    = (formData.get('comitato')           as string | null) ?? 'LND'
  const numeroComun = (formData.get('numero_comunicato')  as string | null) ?? null
  const dataComun   = (formData.get('data_comunicato')    as string | null) ?? new Date().toISOString().split('T')[0]

  if (!file) return NextResponse.json({ error: 'File PDF mancante' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())

  let testo = ''
  try {
    testo = await extractPDFText(buffer)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[pdf/extractor] error:', msg)
    return NextResponse.json(
      { error: 'Impossibile leggere il PDF. Assicurarsi che non sia un PDF scansionato (immagine senza layer testo).' },
      { status: 422 },
    )
  }

  if (!testo.trim()) {
    return NextResponse.json(
      { error: 'Il PDF non contiene testo estraibile. Potrebbe essere un PDF scansionato.' },
      { status: 422 },
    )
  }

  try {
    // ── Carica nome club per il filtro società ────────────────────────
    const { data: club } = await supabase
      .from('clubs')
      .select('nome, nome_esteso')
      .eq('id', clubId)
      .single()

    const clubNome      = club?.nome ?? ''
    const clubNomeEsteso = club?.nome_esteso ?? null

    // ── Carica rosa per il fuzzy matching giocatori ───────────────────
    const { data: tesserati } = await supabase
      .from('tesseramenti')
      .select('giocatori(id, nome, cognome)')
      .eq('club_id', clubId)
      .eq('stato', 'attivo')

    const rosa = (tesserati ?? [])
      .map((t: any) => t.giocatori)
      .filter(Boolean) as Array<{ id: string; nome: string; cognome: string }>

    // ── Salva comunicato ──────────────────────────────────────────────
    const testoSanitizzato = testo
      .replace(/\0/g, '')
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
      .slice(0, 50000)

    const { data: comunicato, error: commErr } = await supabase
      .from('comunicati_figc')
      .insert({
        club_id:            clubId,
        comitato_regionale: comitato,
        numero_comunicato:  numeroComun,
        data_comunicato:    dataComun,
        testo_estratto:     testoSanitizzato,
      })
      .select('id')
      .single()

    if (commErr || !comunicato) {
      return NextResponse.json({ error: commErr?.message ?? 'Errore salvataggio comunicato' }, { status: 500 })
    }

    // ── Estrai TUTTE le sanzioni dal testo ────────────────────────────
    const tuttiSanzioni = parseComunicatoLND(testo)

    // ── Per ogni sanzione: calcola score giocatore + score società ────
    const elaborati = tuttiSanzioni.map(s => {
      // Match giocatore sulla rosa
      let bestId: string | null = null
      let bestPlayerScore = 0
      for (const g of rosa) {
        const score = fuzzyScore(s.cognome_raw, s.nome_raw, g.cognome, g.nome)
        if (score > bestPlayerScore) { bestPlayerScore = score; bestId = g.id }
      }

      // Match società col nome del club
      const socScore = societyScore(s.societa_raw, clubNome, clubNomeEsteso)

      return {
        sanzione:        s,
        bestId,
        bestPlayerScore,
        socScore,
      }
    })

    // ── Filtro: tieni solo ciò che riguarda questo club ───────────────
    //   La SOCIETÀ deve sempre corrispondere (≥ SOGLIA_SOC).
    //   Il player score serve solo per identificare QUALE giocatore in rosa,
    //   non per decidere se la sanzione riguarda il club.
    //   (Un giocatore con nome simile a uno nostro ma di altra squadra NON va incluso.)
    const SOGLIA_SOC    = 0.55
    const SOGLIA_PLAYER = 0.72

    const rilevanti = elaborati.filter(({ socScore }) => socScore >= SOGLIA_SOC)

    // ── Costruisce i record da inserire ───────────────────────────────
    const inserimenti = rilevanti.map(({ sanzione: s, bestId, bestPlayerScore }) => ({
      comunicato_id: comunicato.id,
      club_id:       clubId,
      cognome_raw:   s.cognome_raw,
      nome_raw:      s.nome_raw,
      societa_raw:   s.societa_raw,
      tipo_sanzione: s.tipo_sanzione,
      durata:        s.durata,
      giocatore_id:  bestPlayerScore >= SOGLIA_PLAYER ? bestId : null,
      match_score:   parseFloat(bestPlayerScore.toFixed(2)),
    }))

    if (inserimenti.length > 0) {
      await supabase.from('squalifiche_comunicato').insert(inserimenti)
    }

    await supabase.from('comunicati_figc')
      .update({ processato: true })
      .eq('id', comunicato.id)

    return NextResponse.json({
      comunicato_id: comunicato.id,
      trovate:       tuttiSanzioni.length,    // totale nel PDF
      rilevanti:     rilevanti.length,         // filtrate per questo club
      matchate:      inserimenti.filter(i => i.giocatore_id).length,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[figc/upload] unexpected error:', msg)
    return NextResponse.json({ error: `Errore interno: ${msg}` }, { status: 500 })
  }
}
