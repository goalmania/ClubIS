import * as XLSX from 'xlsx'
import type { ImportSchema } from './schemas'

export interface ParseResult<T> {
  validi: T[]
  errori: Array<{ riga: number; messaggio: string; dati_raw: Record<string, string> }>
  totale: number
}

export function parseCSV(testo: string, schema: ImportSchema): ParseResult<Record<string, unknown>> {
  const separatore = detectSeparatore(testo)
  const righe = testo.split('\n').map(r => r.trim()).filter(Boolean)

  if (righe.length < 2) {
    return { validi: [], errori: [{ riga: 0, messaggio: 'File vuoto o senza dati', dati_raw: {} }], totale: 0 }
  }

  const celle2D = righe.map(r => r.split(separatore).map(c => c.trim().replace(/^["']|["']$/g, '')))
  return parseRows(celle2D, schema)
}

/**
 * Legge un file Excel (.xlsx/.xls) e restituisce lo stesso ParseResult del CSV,
 * riusando identica logica di mappatura colonne/validazione (parseRows).
 * Le celle formattate come data in Excel vengono lette come oggetti Date reali
 * (cellDates:true) invece che come stringa, per evitare l'ambiguità
 * GG/MM/AAAA vs MM/GG/AAAA che dipenderebbe dal locale del file.
 */
export async function parseExcel(file: File, schema: ImportSchema): Promise<ParseResult<Record<string, unknown>>> {
  let workbook: XLSX.WorkBook
  try {
    const buffer = await file.arrayBuffer()
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  } catch {
    return {
      validi: [], totale: 0,
      errori: [{ riga: 0, messaggio: 'Impossibile leggere il file Excel: assicurati che sia un .xlsx o .xls valido e non danneggiato.', dati_raw: {} }],
    }
  }

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { validi: [], errori: [{ riga: 0, messaggio: 'Il file Excel non contiene nessun foglio.', dati_raw: {} }], totale: 0 }
  }

  const ws: XLSX.WorkSheet = workbook.Sheets[sheetName]
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false })
  const celle2D = raw.map(riga => riga.map(cellaExcelToString))

  if (celle2D.length < 2) {
    return { validi: [], errori: [{ riga: 0, messaggio: 'Il foglio Excel è vuoto o contiene solo l\'intestazione', dati_raw: {} }], totale: 0 }
  }

  return parseRows(celle2D, schema)
}

function cellaExcelToString(v: unknown): string {
  if (v == null) return ''
  if (v instanceof Date) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}` // ISO — già nel formato che parseDataItaliana riconosce
  }
  return String(v).trim()
}

/**
 * Nucleo di validazione condiviso tra CSV ed Excel: riceve una griglia di
 * celle già come stringhe (prima riga = intestazione) e produce righe valide
 * mappate sui campi DB dello schema, con relativi errori per riga.
 */
function parseRows(celle2D: string[][], schema: ImportSchema): ParseResult<Record<string, unknown>> {
  const header = celle2D[0].map(h => normalizzaHeader(h))

  // colonna index → DB field name
  const colonneMap = new Map<number, string>()
  header.forEach((h, i) => {
    // Match esatto dopo normalizzazione (lowercase, no accenti, _ al posto di spazi).
    // Il vecchio approccio con h.includes(pattern) causava falsi positivi:
    // es. "cognome_bambino" veniva catturato dal pattern "nome_bambino" prima
    // che arrivasse il suo pattern corretto, rendendo la colonna non trovata.
    for (const [pattern, campo] of Object.entries(schema.mapping)) {
      if (normalizzaHeader(pattern) === h) {
        colonneMap.set(i, campo)
        return
      }
    }
  })

  const campiTrovati = new Set(colonneMap.values())
  const missing = schema.required.filter(r => {
    const dbField = schema.mapping[r]
    return dbField ? !campiTrovati.has(dbField) : true
  })

  if (missing.length > 0) {
    return {
      validi: [],
      errori: [{ riga: 0, messaggio: `Colonne obbligatorie mancanti: ${missing.join(', ')}`, dati_raw: {} }],
      totale: 0,
    }
  }

  const validi: Record<string, unknown>[] = []
  const errori: ParseResult<Record<string, unknown>>['errori'] = []
  const numericFields = ['importo', 'altezza_cm', 'peso_kg', 'numero_maglia', 'importo_totale', 'importo_pagato']

  celle2D.slice(1).forEach((celle, idx) => {
    const numRiga = idx + 2

    const record: Record<string, unknown> = {}
    let hasError = false

    const rawData = Object.fromEntries(
      Array.from(colonneMap.entries()).map(([i, c]) => [c, celle[i] ?? ''])
    )

    for (const [colIdx, campo] of colonneMap.entries()) {
      let valore: string = celle[colIdx] ?? ''

      if (schema.dateFields.includes(campo) && valore) {
        const parsed = parseDataItaliana(valore)
        if (!parsed) {
          errori.push({ riga: numRiga, messaggio: `Data non valida in colonna ${campo}: "${valore}"`, dati_raw: rawData })
          hasError = true
          break
        }
        record[campo] = parsed
        continue
      }

      if (numericFields.includes(campo) && valore) {
        const num = parseFloat(valore.replace(',', '.').replace('€', '').trim())
        if (isNaN(num)) {
          errori.push({ riga: numRiga, messaggio: `Numero non valido in colonna ${campo}: "${valore}"`, dati_raw: rawData })
          hasError = true
          break
        }
        record[campo] = num
        continue
      }

      // Campi enum PostgreSQL: normalizza a lowercase per evitare errori di tipo
      if (schema.lowercaseFields?.includes(campo) && valore) {
        record[campo] = valore.toLowerCase().trim()
        continue
      }

      if (valore !== '') record[campo] = valore
    }

    if (!hasError) {
      for (const req of schema.required) {
        const dbField = schema.mapping[req]
        if (dbField && !record[dbField]) {
          errori.push({ riga: numRiga, messaggio: `Campo obbligatorio mancante: ${req}`, dati_raw: rawData })
          hasError = true
          break
        }
      }
    }

    if (!hasError) validi.push(record)
  })

  return { validi, errori, totale: celle2D.length - 1 }
}

function detectSeparatore(testo: string): string {
  const prima = testo.split('\n')[0] ?? ''
  const conti: Record<string, number> = { ';': 0, ',': 0, '\t': 0 }
  for (const c of prima) if (c in conti) conti[c]++
  return Object.entries(conti).sort(([, a], [, b]) => b - a)[0][0]
}

function normalizzaHeader(h: string): string {
  return h.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_').replace(/^_|_$/g, '')
}

function parseDataItaliana(s: string): string | null {
  const m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})$/)
  if (m) {
    const [, g, mes, a] = m
    const anno = a.length === 2 ? `20${a}` : a
    return `${anno}-${mes.padStart(2, '0')}-${g.padStart(2, '0')}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return null
}
