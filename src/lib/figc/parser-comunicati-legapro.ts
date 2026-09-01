/**
 * Parser comunicati Lega Pro (Serie C) — Giudice Sportivo
 *
 * Formato reale dal PDF:
 *   SQUALIFICA PER [N/UNA/DUE/TRE] GARE EFFETTIVE [ED € X DI AMMENDA]
 *   COGNOME NOME      (SOCIETA)
 *   COGNOME NOME      (SOCIETA)
 *
 *   AMMENDA € X,XX
 *   NOME SOCIETA per motivo...
 *
 *   AMMONIZIONE CON DIFFIDA (N INFR)
 *   COGNOME NOME      (SOCIETA)
 *
 *   AMMONIZIONE (N INFR)
 *   COGNOME NOME      (SOCIETA)
 *
 * Fondamentalmente diverso dal parser LND (che è inline per riga):
 * qui il TIPO e le GIORNATE sono nel titolo di sezione,
 * i nomi seguono sotto fino al prossimo titolo.
 */

import type { SanzioneEstratta } from '@/lib/comunicati-parser'

/* ─── Utility ────────────────────────────────────────────────── */

const NUMERI_LETTERE: Record<string, number> = {
  una: 1, un: 1, uno: 1, due: 2, tre: 3, quattro: 4,
  cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10,
}

function parseGiornate(s: string): number {
  const n = parseInt(s, 10)
  if (!isNaN(n)) return n
  return NUMERI_LETTERE[s.toLowerCase().trim()] ?? 1
}

/* ─── Pattern riconoscimento sezione ─────────────────────────── */

// "SQUALIFICA PER DUE GARE EFFETTIVE" / "... PER UNA GARA EFFETTIVA ..."
const RX_SQ_GARE = /SQUALIFICA\s+PER\s+([\w]+)\s+GAR[AE]\s+EFFETTIV[AE]/i

// Ammenda inclusa nella riga squalifica: "ED € 200,00 DI AMMENDA"
const RX_AMM_INCLUSA = /ED\s+€\s*([\d,.]+)\s+DI\s+AMMENDA/i

// "AMMENDA € 200,00" (solo societaria)
const RX_AMMENDA_SOC = /^AMMENDA\s+€\s*([\d,.]+)/i

// "AMMONIZIONE CON DIFFIDA"
const RX_DIFFIDA = /AMMONIZIONE\s+CON\s+DIFFIDA/i

// "AMMONIZIONE (N INFR)"
const RX_AMMONIZIONE = /^AMMONIZIONE\s*\(/i

// Nomi persona: "COGNOME NOME      (SOCIETA)"
// SOCIETA può contenere spazi: (SAN MARINO ACADEMY)
const RX_NOME_SOC = /^([A-ZÀÈÌÒÙ][A-ZÀÈÌÒÙ\s''\-]{1,40}?)\s{2,}|\s+\(([^)]+)\)/

// Alternativa più robusta: cerca pattern NOME (...) sulla stessa riga
const RX_PERSONA = /^([A-ZÀÈÌÒÙ][A-ZÀÈÌÒÙ '\-]{2,40})\s+\(([^)]{2,50})\)\s*$/

/* ─── Tipo sezione corrente ───────────────────────────────────── */

type TipoSezione =
  | { tipo: 'squalifica'; giornate: number; ammendaExtra: number | null }
  | { tipo: 'ammenda_societa'; importo: number }
  | { tipo: 'diffida' }
  | { tipo: 'ammonizione' }
  | null

/* ─── Parser principale ──────────────────────────────────────── */

export function parseComunicatoLegaPro(testo: string): SanzioneEstratta[] {
  const righe = testo
    .split('\n')
    .map(r => r.trim())
    .filter(Boolean)

  const risultati: SanzioneEstratta[] = []
  const seen = new Set<string>()

  const add = (s: SanzioneEstratta) => {
    const key = `${s.cognome_raw}|${s.nome_raw}|${s.societa_raw}|${s.tipo_sanzione}`
    if (seen.has(key)) return
    seen.add(key)
    risultati.push(s)
  }

  let sezione: TipoSezione = null

  for (const riga of righe) {
    const rigaUp = riga.toUpperCase()

    // ── Riconosce header di sezione ───────────────────────────

    // Squalifica per N gare
    const mSq = RX_SQ_GARE.exec(riga)
    if (mSq) {
      const giornate = parseGiornate(mSq[1])
      const mAmm = RX_AMM_INCLUSA.exec(riga)
      const ammendaExtra = mAmm ? parseFloat(mAmm[1].replace('.', '').replace(',', '.')) : null
      sezione = { tipo: 'squalifica', giornate, ammendaExtra }
      continue
    }

    // Ammenda societaria
    const mAmmSoc = RX_AMMENDA_SOC.exec(riga)
    if (mAmmSoc) {
      const importo = parseFloat(mAmmSoc[1].replace('.', '').replace(',', '.'))
      sezione = { tipo: 'ammenda_societa', importo }
      continue
    }

    // Diffida
    if (RX_DIFFIDA.test(riga)) {
      sezione = { tipo: 'diffida' }
      continue
    }

    // Ammonizione
    if (RX_AMMONIZIONE.test(riga)) {
      sezione = { tipo: 'ammonizione' }
      continue
    }

    // Reset su sezioni narrative che non portano nomi
    if (
      /^(SOCIETA'?|CALCIATORI\s|DIRIGENTI\s|ALLENATORI\s|COLLABORATORI\s|GARE DEL|CAMPIONATO|PROVVEDIMENTI|DECISIONI|IL GIUDICE|EVENTUALI|PUBBLICATO)/i.test(riga)
    ) {
      sezione = null
      continue
    }

    // ── Prova a parsare una riga-nome se siamo in una sezione ─

    if (!sezione) continue

    // Pattern: COGNOME NOME (SOCIETA)
    const mPersona = RX_PERSONA.exec(riga)
    if (mPersona) {
      const nomeCompleto = mPersona[1].trim()
      const societa = mPersona[2].trim()

      // Divide nome completo in cognome + nome
      // Lega Pro usa TUTTO MAIUSCOLO, tipicamente "COGNOME NOME" o "DE COGNOME NOME"
      const parti = nomeCompleto.split(/\s+/)
      let cognome: string
      let nome: string

      if (parti.length >= 3 && /^(DE|DEL|DELLA|DI|D'|LA|LO|EL)$/i.test(parti[0])) {
        // Particella nobiliare: "DE ROSA CHRISTIAN" → cognome="DE ROSA", nome="CHRISTIAN"
        cognome = `${parti[0]} ${parti[1]}`
        nome = parti.slice(2).join(' ')
      } else if (parti.length >= 2) {
        cognome = parti[0]
        nome = parti.slice(1).join(' ')
      } else {
        cognome = nomeCompleto
        nome = ''
      }

      switch (sezione.tipo) {
        case 'squalifica':
          add({
            cognome_raw:   cognome,
            nome_raw:      nome,
            societa_raw:   societa,
            tipo_sanzione: 'squalifica',
            durata:        `${sezione.giornate} gara${sezione.giornate > 1 ? 'e' : ''} effettiv${sezione.giornate > 1 ? 'e' : 'a'}`,
          })
          // Se la squalifica aveva anche un'ammenda personale, la aggiunge
          if (sezione.ammendaExtra) {
            add({
              cognome_raw:   cognome,
              nome_raw:      nome,
              societa_raw:   societa,
              tipo_sanzione: 'ammenda',
              durata:        `€ ${sezione.ammendaExtra.toFixed(2)}`,
            })
          }
          break

        case 'diffida':
          add({
            cognome_raw:   cognome,
            nome_raw:      nome,
            societa_raw:   societa,
            tipo_sanzione: 'diffida',
            durata:        '1 ammonizione',
          })
          break

        case 'ammonizione':
          add({
            cognome_raw:   cognome,
            nome_raw:      nome,
            societa_raw:   societa,
            tipo_sanzione: 'diffida',  // ammonizione → gestita come diffida lato UI
            durata:        '1 ammonizione',
          })
          break

        case 'ammenda_societa':
          // Riga dopo AMMENDA € X: contiene NOME SOCIETA (maiuscolo) + motivazione
          // Es: "GUIDONIA MONTECELIO per non aver..."
          add({
            cognome_raw:   '',
            nome_raw:      '',
            societa_raw:   nomeCompleto,
            tipo_sanzione: 'ammenda',
            durata:        `€ ${sezione.importo.toFixed(2)}`,
          })
          // Dopo la riga della società, la prossima riga è la motivazione → sezione ancora attiva
          // ma non aggiungiamo nulla dalla motivazione
          sezione = null
          break
      }
      continue
    }

    // Riga motivazione (testo libero dopo una squalifica espulso) — ignora
    // Se non è un nome-società, la lasciamo scorrere senza reset sezione
  }

  return risultati
}

/* ─── Re-export di fuzzyScore per l'API route ────────────────── */
export { fuzzyScore } from '@/lib/comunicati-parser'
