import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { parseComunicatoLegaPro, fuzzyScore } from '@/lib/figc/parser-comunicati-legapro'
import { extractPDFText } from '@/lib/pdf/extractor'
import { getClubFromSession } from '@/lib/server-helpers'
import { isPro } from '@/lib/categorie-club'

function normalizeNome(s: string): string {
  return s
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(A\.?S\.?D?\.?|S\.?S\.?D?\.?|A\.?C\.?|F\.?C\.?|U\.?S\.?|S\.?S\.?C\.?|CALCIO|FOOTBALL|SPORT|SPORTING)\b/g, '')
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function societyScore(societaRaw: string, clubNome: string, clubNomeEsteso?: string | null): number {
  const a = normalizeNome(societaRaw)
  if (!a) return 0

  const scores = ([clubNome, clubNomeEsteso] as (string | null)[])
    .filter(Boolean)
    .map(n => {
      const b = normalizeNome(n!)
      if (!b) return 0
      if (a.includes(b) || b.includes(a)) return 0.95
      const maxL = Math.max(a.length, b.length)
      if (maxL === 0) return 0
      const dp = Array.from({ length: a.length + 1 }, (_, i) =>
        Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
      )
      for (let i = 1; i <= a.length; i++)
        for (let j = 1; j <= b.length; j++)
          dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      return 1 - dp[a.length][b.length] / maxL
    })

  return scores.length ? Math.max(...scores) : 0
}

export async function POST(req: NextRequest) {
  const session = await getClubFromSession()
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const supabase = createAdminClient()

  // Verifica che il club sia di categoria pro — doppio controllo lato server
  const { data: club } = await supabase
    .from('clubs')
    .select('nome, nome_esteso, categoria')
    .eq('id', session.clubId)
    .single()

  if (!club || !isPro(club.categoria)) {
    return NextResponse.json({ error: 'Funzione disponibile solo per club di Serie C e superiori.' }, { status: 403 })
  }

  const formData = await req.formData()
  const file         = formData.get('pdf') as File | null
  const numeroComun  = (formData.get('numero_comunicato') as string | null) ?? null
  const dataComun    = (formData.get('data_comunicato')   as string | null) ?? new Date().toISOString().split('T')[0]

  if (!file) return NextResponse.json({ error: 'File PDF mancante' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())

  let testo = ''
  try {
    testo = await extractPDFText(buffer)
  } catch {
    return NextResponse.json(
      { error: 'Impossibile leggere il PDF. Assicurarsi che non sia un PDF scansionato.' },
      { status: 422 },
    )
  }

  if (!testo.trim()) {
    return NextResponse.json(
      { error: 'Il PDF non contiene testo estraibile.' },
      { status: 422 },
    )
  }

  const clubId = session.clubId

  // Rosa per fuzzy matching
  const { data: tesserati } = await supabase
    .from('tesseramenti')
    .select('giocatori(id, nome, cognome)')
    .eq('club_id', clubId)
    .eq('stato', 'attivo')

  const rosa = (tesserati ?? [])
    .map((t: any) => t.giocatori)
    .filter(Boolean) as Array<{ id: string; nome: string; cognome: string }>

  // Salva comunicato con lega = 'LegaPro'
  const testoSanitizzato = testo
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
    .slice(0, 50000)

  const { data: comunicato, error: commErr } = await supabase
    .from('comunicati_figc')
    .insert({
      club_id:            clubId,
      comitato_regionale: 'Lega Pro',
      numero_comunicato:  numeroComun,
      data_comunicato:    dataComun,
      testo_estratto:     testoSanitizzato,
      lega:               'LegaPro',
    })
    .select('id')
    .single()

  if (commErr || !comunicato) {
    return NextResponse.json({ error: commErr?.message ?? 'Errore salvataggio comunicato' }, { status: 500 })
  }

  // Parser Lega Pro (section-based)
  const tuttiSanzioni = parseComunicatoLegaPro(testo)

  const SOGLIA_SOC    = 0.50  // Lega Pro: nomi brevi senza prefissi ASD, soglia più bassa
  const SOGLIA_PLAYER = 0.72

  const elaborati = tuttiSanzioni.map(s => {
    // Per ammende societarie (cognome_raw vuoto) usa solo society score
    let bestId: string | null = null
    let bestPlayerScore = 0
    if (s.cognome_raw || s.nome_raw) {
      for (const g of rosa) {
        const score = fuzzyScore(s.cognome_raw, s.nome_raw, g.cognome, g.nome)
        if (score > bestPlayerScore) { bestPlayerScore = score; bestId = g.id }
      }
    }

    const socScore = societyScore(s.societa_raw, club.nome, club.nome_esteso)
    return { sanzione: s, bestId, bestPlayerScore, socScore }
  })

  const rilevanti = elaborati.filter(({ socScore }) => socScore >= SOGLIA_SOC)

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
    lega:          'LegaPro',
  }))

  if (inserimenti.length > 0) {
    await supabase.from('squalifiche_comunicato').insert(inserimenti)
  }

  await supabase.from('comunicati_figc')
    .update({ processato: true })
    .eq('id', comunicato.id)

  return NextResponse.json({
    comunicato_id: comunicato.id,
    trovate:       tuttiSanzioni.length,
    rilevanti:     rilevanti.length,
    matchate:      inserimenti.filter(i => i.giocatore_id).length,
  })
}
