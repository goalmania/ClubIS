/**
 * Parser comunicati FIGC / LND — testo incollato
 * Estrae squalifiche, diffide e ammonizioni da un testo grezzo di C.U. LND.
 *
 * Gestisce i formati reali dei C.U. LND:
 *  - Nomi TUTTO MAIUSCOLO (come estratti da PDF)
 *  - Nomi "Cognome Nome" misti
 *  - Società tra parentesi: (A.S.D. Nome)
 *  - Società preceduta da "della Soc." / "della A.S.D." ecc.
 *  - Numeri con "n. N" o "n.N" (formato ufficiale italiano)
 *  - Numeri scritti in lettere (una, due, tre...)
 *  - Varianti del verbo: "è squalificato", "viene squalificato", "squalificato per"
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

export function normalize(s: string): string {
  return s
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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

/** Formatta il numero di giornate: "1 giornata" | "2 giornate" */
function formattaGiornate(n: number): string {
  return `${n} giornat${n === 1 ? 'a' : 'e'}`
}

/** Converte numeri scritti in lettere → intero */
function parseNumeroGiornate(s: string): number | null {
  const map: Record<string, number> = {
    una: 1, un: 1, uno: 1, due: 2, tre: 3, quattro: 4,
    cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10,
  }
  const n = parseInt(s, 10)
  if (!isNaN(n)) return n
  return map[s.toLowerCase().trim()] ?? null
}

/* ─── Pattern building blocks ────────────────────────────────── */

/**
 * Parola in MAIUSCOLO (include accenti, apostrofo, trattino interno)
 * Accetta sia tutto-maiuscolo (MARIO) sia capitalizzato (Mario)
 */
const WORD = String.raw`[A-ZÀÈÌÒÙ][A-ZÀÈÌÒÙa-zàèìòùA-Z''\-]*`

/**
 * Parole che precedono spesso il nome nei C.U. reali (articoli, ruolo)
 * e che il match case-insensitive di WORD scambierebbe per cognome/nome:
 * "Il calciatore ROSSI Mario" | "La calciatrice ROSSI Maria" ecc.
 * Bloccate dal cognome via lookahead negativo.
 */
const STOPWORD = String.raw`(?:Il|Lo|La|Gli|Le|Un|Una|Uno|Del|Della|Dei|Delle|Degli|Si|Che|Per|Con|Calciator[ei]|Calciatric[ei]|Giocator[ei]|Giocatric[ei]|Atlet[ae]|Tesserat[oa]|Dirigent[ei]|Allenator[ei]|Allenatric[ei]|Capitan[oa]|Mister|Sig|Sig\.ra|Dott|Rag|Prof)`

/**
 * COGNOME: 1 o 2 parole in maiuscolo
 * es: ROSSI | DE LUCA | D'AMICO
 */
const cognomePat = String.raw`\b(?!${STOPWORD}\b)(${WORD}(?:\s${WORD})?)`

/**
 * NOME: 1 o 2 parole (maiuscolo o misto)
 * es: Mario | MARIO | Maria Grazia
 */
const nomePat = String.raw`(${WORD}(?:\s${WORD})?)`

/**
 * Separatore tra nome e società: virgola, spazio, parentesi aperta
 */
const SEP = String.raw`[,\s(]+`

/**
 * Prefisso opzionale del tipo di società
 * es: "della Soc. " | "della A.S.D. " | "A.S.D. " | ""
 */
const TIPO_SOC = String.raw`(?:(?:della|del|de|di)\s+)?(?:(?:a\.?s\.?d\.?|s\.?s\.?d\.?|a\.?s\.?c\.?|pol(?:isportiva)?\.?|u\.?s\.?|f\.?c\.?|calcio\s+)?\.?\s*)`

/**
 * NOME SOCIETÀ: testo fino a ), ; o fine riga (non-greedy)
 */
const societaPat = String.raw`([^\n();,]{3,60}?)`

/**
 * Fine opzionale della società: ), ; spazi
 */
const SOC_END = String.raw`[),;\s]*`

/** Blocco completo cognome+nome+società */
const cogNomeSoc = cognomePat + String.raw`\s+` + nomePat + SEP + TIPO_SOC + societaPat + SOC_END

/**
 * Verbo squalifica in varianti:
 * "è squalificato" | "viene squalificato" | "squalificato" | "risulta squalificato"
 */
const VERBO_SQ = String.raw`(?:[,;]\s*)?(?:(?:è|viene|risulta|è\s+stato|viene\s+ritenuto)\s+)?squalificat[oa]`

/**
 * Numero giornate: supporta "n. 2", "n.2", "2", "due", "una" ecc.
 * Gruppo di cattura per il valore
 */
const NUM_GIORNI = String.raw`n\.?\s*(\d+|una?|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)`

/* ─── Parser principale ──────────────────────────────────────── */

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

  // ── Squalifica N giornate (pattern 1: "squalificato per N giornate") ─
  const rSq1 = new RegExp(
    cogNomeSoc + String.raw`\s*` + VERBO_SQ + String.raw`\s+(?:per\s+)?` + NUM_GIORNI + String.raw`\s+(?:gare?|giornate?(?:\s+di\s+gara)?)`,
    'gi',
  )

  // ── Squalifica N giornate (pattern 2: "N giornate di squalifica") ─────
  const rSq2 = new RegExp(
    cogNomeSoc + String.raw`\s*[,;]?\s*` + NUM_GIORNI + String.raw`\s+(?:gare?|giornate?)\s+di\s+squalifica`,
    'gi',
  )

  // ── Squalifica fino a data ───────────────────────────────────────────
  const rSqData = new RegExp(
    cogNomeSoc + String.raw`\s*` + VERBO_SQ + String.raw`\s+(?:fino\s+al?\s+)([\d/.\-]+)`,
    'gi',
  )

  // ── Diffida ──────────────────────────────────────────────────────────
  const rDiff = new RegExp(
    cogNomeSoc + String.raw`\s*[,;]?\s*(?:(?:è|viene|risulta)\s+)?diffidato`,
    'gi',
  )

  // ── Ammonizione ──────────────────────────────────────────────────────
  const rAmm = new RegExp(
    cogNomeSoc + String.raw`\s*[,;]?\s*(?:(?:è|viene|risulta)\s+)?ammonito`,
    'gi',
  )

  // ── Ammenda ──────────────────────────────────────────────────────────
  const rAmmenda = new RegExp(
    cogNomeSoc + String.raw`\s*[,;]?\s*(?:(?:è|viene|risulta)\s+)?ammendato\s+(?:con\s+)?(?:€\s*)?(\d+(?:[.,]\d+)?)`,
    'gi',
  )

  // ── Formato tabellare LND: "COGNOME Nome (Soc.): N gg" ──────────────
  // Pattern alternativo per sezioni tabellari tipo:
  //   ROSSI Mario (A.S.D. Esempio)  2 giornate
  const rTabella = new RegExp(
    cognomePat + String.raw`\s+` + nomePat +
    String.raw`\s*\(\s*([^\n)]{3,60}?)\s*\)\s*[:\-–—]?\s*` +
    NUM_GIORNI + String.raw`\s+(?:gare?|giornate?(?:\s+di\s+gara)?)`,
    'gi',
  )

  let m: RegExpExecArray | null

  // Squalifica pattern 1
  while ((m = rSq1.exec(testo)) !== null) {
    const n = parseNumeroGiornate(m[4])
    if (n !== null)
      add('squalifica', m[1], m[2], m[3], formattaGiornate(n), n)
  }

  // Squalifica pattern 2
  while ((m = rSq2.exec(testo)) !== null) {
    const n = parseNumeroGiornate(m[4])
    if (n !== null)
      add('squalifica', m[1], m[2], m[3], formattaGiornate(n), n)
  }

  // Squalifica con data
  while ((m = rSqData.exec(testo)) !== null) {
    add('squalifica', m[1], m[2], m[3], `fino al ${m[4]}`, null)
  }

  // Formato tabellare
  while ((m = rTabella.exec(testo)) !== null) {
    const n = parseNumeroGiornate(m[4])
    if (n !== null)
      add('squalifica', m[1], m[2], m[3], formattaGiornate(n), n)
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
