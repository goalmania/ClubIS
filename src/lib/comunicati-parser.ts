export interface SanzioneEstratta {
  cognome_raw: string
  nome_raw:    string
  societa_raw: string
  tipo_sanzione: 'squalifica' | 'diffida' | 'ammenda'
  durata: string
}

function normalize(s: string): string {
  return s
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
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
  const a = normalize(`${rawCognome} ${rawNome}`)
  const b = normalize(`${cognome} ${nome}`)
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 0
  const score = 1 - levenshtein(a, b) / maxLen
  if (normalize(rawCognome) === normalize(cognome)) return Math.max(score, 0.8)
  return score
}

/* ── numeri in lettere → cifra ───────────────────────────────────────── */
const NUMERI: Record<string, number> = {
  UNA: 1, UN: 1, ONE: 1,
  DUE: 2, TWO: 2,
  TRE: 3, THREE: 3,
  QUATTRO: 4, FOUR: 4,
  CINQUE: 5, FIVE: 5,
  SEI: 6, SIX: 6,
  SETTE: 7, SEVEN: 7,
  OTTO: 8, EIGHT: 8,
  NOVE: 9, NOVE2: 9,
  DIECI: 10,
}

function parseNumGare(s: string): number {
  const u = s.trim().toUpperCase()
  if (NUMERI[u] !== undefined) return NUMERI[u]
  const n = parseInt(u, 10)
  return isNaN(n) ? 1 : n
}

/* ── Helper per capire se una riga è un "header sezione" ─────────────── */

/**
 * Riconosce le righe-intestazione del Giudice Sportivo LND.
 * Restituisce { tipo, durata } oppure null se non è un header.
 */
function parseHeader(line: string): { tipo: SanzioneEstratta['tipo_sanzione']; durata: string } | null {
  const u = line.trim().toUpperCase()

  // "SQUALIFICA PER <N> GAR(A|E) EFFETTIV(A|E) [PER RECIDIVITÀ ...]"
  const mGare = u.match(/^SQUALIFICA\s+PER\s+(\w+)\s+GAR[AE]\s+EFFETTIV[AE]/)
  if (mGare) {
    const n = parseNumGare(mGare[1])
    return { tipo: 'squalifica', durata: `${n} ${n === 1 ? 'gara' : 'gare'}` }
  }

  // "SQUALIFICA FINO AL <data>"  (le date possono avere spazi es. "23/ 5/2026")
  const mData = u.match(/^SQUALIFICA\s+FINO\s+AL?\s+([\d/.\-\s]+?)(?:\s{2,}|$)/)
  if (mData) {
    const dateStr = mData[1].replace(/\s/g, '').trim()
    return { tipo: 'squalifica', durata: `fino al ${dateStr}` }
  }

  // "AMMONIZIONE CON DIFFIDA"
  if (/^AMMONIZIONE\s+CON\s+DIFFIDA/.test(u)) {
    return { tipo: 'diffida', durata: 'ammonizione con diffida' }
  }

  return null
}

/**
 * Riconosce una o più voci giocatore nel formato LND all'interno di una riga:
 *   COGNOME [COGNOME2] NOME (SOCIETÀ)
 * La società è dentro parentesi tonde.
 * Gestisce righe a 2 colonne dove due giocatori appaiono alla stessa y.
 * Restituisce array (vuoto se nessun match).
 */
const PLAYER_RE = /([A-ZÀÈÉÌÍÒÓÙÚ][A-ZÀÈÉÌÍÒÓÙÚ\s']{1,50}?)\s+\(([^)]{2,80})\)/g

function parsePlayerLine(line: string): Array<{ cognome: string; nome: string; societa: string }> {
  const results: Array<{ cognome: string; nome: string; societa: string }> = []
  const matches = [...line.trim().matchAll(PLAYER_RE)]
  for (const m of matches) {
    const fullName = m[1].trim()
    const societa  = m[2].trim()
    const tokens   = fullName.split(/\s+/)
    if (tokens.length < 2) continue
    const nome    = tokens.pop()!
    const cognome = tokens.join(' ')
    results.push({ cognome, nome, societa })
  }
  return results
}

/* ── Parser principale ───────────────────────────────────────────────── */

export function parseComunicatoLND(testo: string): SanzioneEstratta[] {
  const risultati: SanzioneEstratta[] = []
  const seen = new Set<string>()

  const add = (
    cognome:  string,
    nome:     string,
    societa:  string,
    tipo:     SanzioneEstratta['tipo_sanzione'],
    durata:   string,
  ) => {
    const key = `${normalize(cognome)}_${normalize(nome)}_${tipo}`
    if (seen.has(key)) return
    seen.add(key)
    risultati.push({ cognome_raw: cognome, nome_raw: nome, societa_raw: societa, tipo_sanzione: tipo, durata })
  }

  /* ── FORMATO LND: header sezione + righe COGNOME NOME (SOCIETÀ) ── */
  const lines = testo.split(/\r?\n/)
  let currentTipo:   SanzioneEstratta['tipo_sanzione'] | null = null
  let currentDurata  = ''

  // Parole che segnalano inizio di una nuova sezione non-giocatori
  const SEZIONE_RESET = /^(SOCIET[AÀ]|ALLENATORI|DIRIGENTI|CALCIATORI|CAMPIONATO|GARE\s+DEL|PROVVEDIMENTI|IN\s+BASE|LE\s+AMMENDE|ECCELLENZA|PROMOZIONE|PRIMA\s+CAT|SECONDA\s+CAT|TERZA\s+CAT|INIBIZIONE|IL\s+SEGRETARIO|IL\s+PRESIDENTE|COORDINATE|PUBBLICATO)/i

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // 1) Riga che inizia con un header ma potrebbe avere anche un giocatore nella stessa riga
    //    (es. "SQUALIFICA FINO AL 23/ 5/2026  ADAMO LORENZO (NOVOLI CALCIO 1942)")
    const header = parseHeader(line)
    if (header) {
      currentTipo   = header.tipo
      currentDurata = header.durata
      // Cerca comunque giocatori nella stessa riga (dopo l'header)
      const players = parsePlayerLine(line)
      for (const p of players) add(p.cognome, p.nome, p.societa, currentTipo, currentDurata)
      continue
    }

    // 2) Parola-sezione → azzera contesto
    if (SEZIONE_RESET.test(line)) {
      currentTipo   = null
      currentDurata = ''
      continue
    }

    // 3) Riga giocatore/i sotto un header attivo
    //    Gestisce sia 1 giocatore che 2 giocatori affiancati (layout 2 colonne)
    if (currentTipo) {
      const players = parsePlayerLine(line)
      if (players.length > 0) {
        for (const p of players) add(p.cognome, p.nome, p.societa, currentTipo, currentDurata)
        continue
      }
    }

    // 4) Ammenda società:  €/<char128>/\x80  IMPORTO  NOME SOCIETÀ
    //    Il byte 0x80 (latin1) viene da \200 octal nel PDF (Windows-1252 €)
    const mAmm = line.match(/^(?:€|\x80|€)\s*([\d.,]+)\s+(.+)$/)
    if (mAmm) {
      const importo = mAmm[1].replace(',', '.')
      const societa = mAmm[2].trim()
      add('', '', societa, 'ammenda', `€ ${importo}`)
      continue
    }
  }

  /* ── FALLBACK: pattern per comunicati in formato narrativo ─────────── */
  if (risultati.length === 0) {
    // Pattern narrativo: "COGNOME Nome (soc. X) è squalificato per N gare"
    const pat1 = /([A-ZÀÈÌÒÙ][A-ZÀÈÌÒÙ\s']{1,30}?)\s+([A-ZÀÈÌÒÙ][a-zàèìòù]+(?:\s[A-ZÀÈÌÒÙ][a-zàèìòù]+)*)[,\s]+(?:della\s+)?(?:soc(?:iet[aà])?\.?\s+)?([^\n,;]{3,50}?)[,;]?\s+(?:è\s+)?squalificat[oa]\s+(?:per\s+)?(\d+)\s+(?:gare?|giornate?)/gi
    const pat2 = /([A-ZÀÈÌÒÙ][A-ZÀÈÌÒÙ\s']{1,30}?)\s+([A-ZÀÈÌÒÙ][a-zàèìòù]+(?:\s[A-ZÀÈÌÒÙ][a-zàèìòù]+)*)[,\s]+(?:della\s+)?(?:soc(?:iet[aà])?\.?\s+)?([^\n,;]{3,50}?)[,;]?\s+(\d+)\s+(?:gare?|giornate?)\s+di\s+squalifica/gi
    const pat3 = /([A-ZÀÈÌÒÙ][A-ZÀÈÌÒÙ\s']{1,30}?)\s+([A-ZÀÈÌÒÙ][a-zàèìòù]+(?:\s[A-ZÀÈÌÒÙ][a-zàèìòù]+)*)[,\s]+(?:della\s+)?(?:soc(?:iet[aà])?\.?\s+)?([^\n,;]{3,50}?)[,;]?\s+(?:è\s+)?diffidato/gi

    let m: RegExpExecArray | null
    while ((m = pat1.exec(testo)) !== null) add(m[1], m[2], m[3], 'squalifica', `${m[4]} gare`)
    pat1.lastIndex = 0
    while ((m = pat2.exec(testo)) !== null) add(m[1], m[2], m[3], 'squalifica', `${m[4]} gare`)
    pat2.lastIndex = 0
    while ((m = pat3.exec(testo)) !== null) add(m[1], m[2], m[3], 'diffida', '1 giornata')
    pat3.lastIndex = 0
  }

  return risultati
}
