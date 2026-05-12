/**
 * Parser comunicati FIGC / LND — testo incollato
 * Estrae squalifiche, diffide e ammonizioni da un testo grezzo di C.U. LND.
 */

/* ─── Tipi pubblici ──────────────────────────────────────────── */

export type TipoProvvedimento = 'squalifica' | 'diffida' | 'ammonizione' | 'ammenda'

export interface ProvvedimentoFIGC {
  /** UUID generato lato client per tracking abbinamenti */
  _id:           string
  tipo:          TipoProvvedimento
  cognome_raw:   string
  nome_raw:      string
  societa_raw:   string
  /** "2 giornate" | "1 giornata" | "fino al…" | "€ 50" | "" */
  durata:        string
  /** numero giornate (null per diffida/ammonizione/ammenda) */
  giornate:      number | null
}

export interface AbbinamentoProvvedimento {
  provvedimento: ProvvedimentoFIGC
  giocatore_id:  string | null
  nome_abbinato: string | null   // "Cognome Nome" del match
  score:         number           // 0..1
  confermato:    boolean
}

/* ─── Utilità ────────────────────────────────────────────────── */

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function normalize(s: string): string {
  return s
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

export function fuzzyScore(
  rawCognome: string, rawNome: string,
  cognome:    string, nome:    string,
): number {
  const a    = normalize(`${rawCognome} ${rawNome}`)
  const b    = normalize(`${cognome} ${nome}`)
  const maxL = Math.max(a.length, b.length)
  if (maxL === 0) return 0
  const score = 1 - levenshtein(a, b) / maxL
  // Bonus cognome esatto
  if (normalize(rawCognome) === normalize(cognome)) return Math.max(score, 0.80)
  return score
}

/* ─── Parser principale ──────────────────────────────────────── */

/**
 * Estrae provvedimenti dal testo grezzo di un comunicato LND/FIGC.
 * Supporta squalifiche, diffide, ammonizioni e ammende.
 */
export function parseComunicatoFIGC(testo: string): ProvvedimentoFIGC[] {
  const risultati: ProvvedimentoFIGC[] = []
  const seen = new Set<string>()

  const add = (
    tipo:       TipoProvvedimento,
    cognome:    string,
    nome:       string,
    societa:    string,
    durata:     string,
    giornate:   number | null,
  ) => {
    const key = `${normalize(cognome)}_${normalize(nome)}_${tipo}`
    if (seen.has(key)) return
    seen.add(key)
    risultati.push({
      _id:         uid(),
      tipo,
      cognome_raw: cognome.trim(),
      nome_raw:    nome.trim(),
      societa_raw: societa.trim(),
      durata,
      giornate,
    })
  }

  // Segmento per cognome in MAIUSCOLO + nome capitalizzato
  // Gruppo 1: COGNOME (tutto maiuscolo, anche con apostrofo)
  // Gruppo 2: Nome (prima lettera maiuscola, resto minuscolo)
  // Gruppo 3: Società (testo libero fino a punteggiatura/newline)

  const cogNomeSoc = String.raw`([A-ZÀÈÌÒÙ][A-ZÀÈÌÒÙ'\s]{1,30}?)\s+([A-ZÀÈÌÒÙ][a-zàèìòù]+(?:\s[A-ZÀÈÌÒÙ][a-zàèìòù]+)*)[,\s]+(?:della\s+)?(?:soc(?:ietà)?\.?\s+)?([^\n,;]{3,50}?)`

  // ── Squalifica N giornate ────────────────────────────────────
  const rSq1 = new RegExp(
    cogNomeSoc + String.raw`[,;]?\s+(?:è\s+)?squalificat[oa]\s+(?:per\s+)?(\d+)\s+(?:gare?|giornate?)`,
    'gi',
  )
  const rSq2 = new RegExp(
    cogNomeSoc + String.raw`[,;]?\s+(\d+)\s+(?:gare?|giornate?)\s+di\s+squalifica`,
    'gi',
  )

  // ── Squalifica fino a data ───────────────────────────────────
  const rSqData = new RegExp(
    cogNomeSoc + String.raw`[,;]?\s+(?:è\s+)?squalificat[oa]\s+(?:fino\s+al?\s+)([\d/.-]+)`,
    'gi',
  )

  // ── Diffida ──────────────────────────────────────────────────
  const rDiff = new RegExp(
    cogNomeSoc + String.raw`[,;]?\s+(?:è\s+)?diffidato`,
    'gi',
  )

  // ── Ammonizione (verbali, senza sanzione cumulata) ───────────
  const rAmm = new RegExp(
    cogNomeSoc + String.raw`[,;]?\s+(?:è\s+)?ammoniton[oa]`,
    'gi',
  )

  // ── Ammenda ──────────────────────────────────────────────────
  const rAmmenda = new RegExp(
    cogNomeSoc + String.raw`[,;]?\s+(?:è\s+)?ammendato\s+(?:con\s+)?(?:€\s*)?(\d+(?:[.,]\d+)?)`,
    'gi',
  )

  let m: RegExpExecArray | null

  // Squalifica con numero giornate (pattern 1)
  while ((m = rSq1.exec(testo)) !== null) {
    const n = parseInt(m[4], 10)
    add('squalifica', m[1], m[2], m[3], `${n} giornata${n > 1 ? 'e' : ''}`, n)
  }

  // Squalifica con numero giornate (pattern 2)
  while ((m = rSq2.exec(testo)) !== null) {
    const n = parseInt(m[4], 10)
    add('squalifica', m[1], m[2], m[3], `${n} giornata${n > 1 ? 'e' : ''}`, n)
  }

  // Squalifica con data
  while ((m = rSqData.exec(testo)) !== null) {
    add('squalifica', m[1], m[2], m[3], `fino al ${m[4]}`, null)
  }

  // Diffida
  while ((m = rDiff.exec(testo)) !== null) {
    add('diffida', m[1], m[2], m[3], '1 ammonizione', null)
  }

  // Ammonizione
  while ((m = rAmm.exec(testo)) !== null) {
    add('ammonizione', m[1], m[2], m[3], '1 ammonizione', null)
  }

  // Ammenda
  while ((m = rAmmenda.exec(testo)) !== null) {
    add('ammenda', m[1], m[2], m[3], `€ ${m[4]}`, null)
  }

  return risultati
}

/* ─── Abbinamento ────────────────────────────────────────────── */

export interface GiocatoreRosa {
  id:      string
  nome:    string
  cognome: string
}

/**
 * Abbina i provvedimenti estratti alla rosa del club.
 * Soglia auto-match: 0.72.
 */
export function abbinaProvivedimenti(
  provvedimenti: ProvvedimentoFIGC[],
  giocatori:     GiocatoreRosa[],
): AbbinamentoProvvedimento[] {
  return provvedimenti.map(p => {
    let bestId:    string | null = null
    let bestName:  string | null = null
    let bestScore                = 0

    for (const g of giocatori) {
      const s = fuzzyScore(p.cognome_raw, p.nome_raw, g.cognome, g.nome)
      if (s > bestScore) {
        bestScore = s
        bestId    = g.id
        bestName  = `${g.cognome} ${g.nome}`
      }
    }

    const autoMatch = bestScore >= 0.72

    return {
      provvedimento: p,
      giocatore_id:  autoMatch ? bestId  : null,
      nome_abbinato: autoMatch ? bestName : null,
      score:         parseFloat(bestScore.toFixed(2)),
      confermato:    false,
    }
  })
}
