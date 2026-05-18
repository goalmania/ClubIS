import { NextRequest, NextResponse } from 'next/server'
import { PDFParse } from 'pdf-parse'

export const dynamic = 'force-dynamic'

interface RigaParsed {
  data_ora: string
  avversario_casa: string
  avversario_ospite: string
  campo: string
  giornata: number | undefined
  raw_text: string
}

// Converte DD/MM/YYYY → YYYY-MM-DD
function parseData(s: string): string | null {
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return null
}

// Prova a estrarre partite dal testo PDF della FIGC.
// La struttura tipica è una tabella con colonne: Giornata Data Ora CasaNome Ospite Campo
// Tuttavia i PDF FIGC variano per formato — usiamo pattern multipli.
function parseFigcText(text: string): RigaParsed[] {
  const righe: RigaParsed[] = []

  // Normalizza newline e spazi multipli
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 3)

  // Pattern 1: righe che contengono data DD/MM/YYYY e ora HH:MM
  // Es: "1  07/09/2025  15:30  ASD Molfetta  Avversario FC  Campo Comunale"
  const PATTERN_ROW = /(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{4})\s+(\d{1,2}:\d{2})/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const m = line.match(PATTERN_ROW)
    if (!m) continue

    const dataISO = parseData(m[1])
    if (!dataISO) continue
    const ora = m[2]
    const data_ora = `${dataISO}T${ora}:00`

    // Tutto il resto della riga dopo ora
    const afterOra = line.slice(line.indexOf(m[2]) + m[2].length).trim()

    // Cerca un numero di giornata all'inizio della riga
    const gMatch = line.match(/^\s*(\d{1,2})\s/)
    const giornata = gMatch ? parseInt(gMatch[1]) : undefined

    // I nomi delle squadre sono separati da " - " oppure " vs " oppure dalla struttura
    // Proviamo con " - " come separatore primario
    let squadraCasa = ''
    let squadraOspite = ''
    let campo = ''

    // Separatori comuni nei PDF FIGC
    const sepMatch = afterOra.match(/^(.+?)\s+[-–]\s+(.+?)(?:\s{2,}(.+))?$/)
    if (sepMatch) {
      squadraCasa  = sepMatch[1].trim()
      squadraOspite = sepMatch[2].trim()
      campo = sepMatch[3]?.trim() ?? ''
    } else {
      // Fallback: prova a dividere in token e assumere struttura fissa
      const tokens = afterOra.split(/\s{2,}/)
      if (tokens.length >= 2) {
        squadraCasa  = tokens[0]?.trim() ?? ''
        squadraOspite = tokens[1]?.trim() ?? ''
        campo = tokens[2]?.trim() ?? ''
      } else {
        // Ultima spiaggia: prossima riga
        squadraCasa = afterOra
        squadraOspite = lines[i + 1]?.trim() ?? ''
      }
    }

    if (!squadraCasa && !squadraOspite) continue

    righe.push({
      data_ora,
      avversario_casa: squadraCasa,
      avversario_ospite: squadraOspite,
      campo,
      giornata,
      raw_text: line,
    })
  }

  // Pattern 2: se nessuna riga trovata, prova formato con tabella multicolonna
  // Cerca coppie data/ora su righe separate con nomi squadre sulle righe successive
  if (righe.length === 0) {
    const DATA_LINE = /(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{4})/
    for (let i = 0; i < lines.length; i++) {
      if (!DATA_LINE.test(lines[i])) continue
      const dataM = lines[i].match(DATA_LINE)
      if (!dataM) continue
      const dataISO = parseData(dataM[1])
      if (!dataISO) continue
      const oraM = (lines[i] + ' ' + (lines[i + 1] ?? '')).match(/(\d{1,2}:\d{2})/)
      const ora = oraM ? oraM[1] : '00:00'
      // Cerca nomi nelle prossime righe
      const squadraCasa   = lines[i + 1]?.trim() ?? ''
      const squadraOspite = lines[i + 2]?.trim() ?? ''
      if (!squadraCasa) continue
      righe.push({
        data_ora: `${dataISO}T${ora}:00`,
        avversario_casa: squadraCasa,
        avversario_ospite: squadraOspite,
        campo: '',
        giornata: undefined,
        raw_text: lines[i],
      })
      i += 2
    }
  }

  return righe
}

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'FormData richiesto' }, { status: 400 })
  }

  const file = formData.get('file') as Blob | null
  if (!file) {
    return NextResponse.json({ error: 'File mancante' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let testo: string
  try {
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    testo = result.text
  } catch {
    return NextResponse.json({ error: 'Impossibile leggere il PDF. Assicurati che non sia protetto da password.' }, { status: 422 })
  }

  const righe = parseFigcText(testo)

  return NextResponse.json({
    ok: true,
    righe,
    testo_grezzo: testo.slice(0, 2000), // per debug in caso di parsing fallito
  })
}
