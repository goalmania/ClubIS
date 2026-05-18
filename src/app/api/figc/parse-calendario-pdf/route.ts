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

function parseData(s: string): string | null {
  s = s.trim()
  // DD/MM/YY (2-digit year — common in FIGC Eccellenza PDFs)
  const m2 = s.match(/^(\d{1,2})[/](\d{1,2})[/](\d{2})$/)
  if (m2) {
    const yr = parseInt(m2[3])
    const year = yr >= 50 ? `19${m2[3]}` : `20${m2[3]}`
    return `${year}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`
  }
  // DD/MM/YYYY or DD-MM-YYYY
  const m4 = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (m4) return `${m4[3]}-${m4[2].padStart(2, '0')}-${m4[1].padStart(2, '0')}`
  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return null
}

// Split a 3-column line like "I col1 I I col2 I I col3 I" into ["col1","col2","col3"]
function splitColumns(line: string): string[] {
  const parts = line.split(' I I ')
  if (parts.length === 0) return []
  parts[0] = parts[0].replace(/^I\s+/, '')
  const last = parts.length - 1
  parts[last] = parts[last].replace(/\s+I$/, '')
  return parts.map(p => p.trim())
}

// FIGC Eccellenza PDF: 3 giornate shown side-by-side per block.
// Each block has:
//  - date header: "I ANDATA: DD/MM/YY ! ! RITORNO: DD/MM/YY I I ..."
//  - giornata/time header: "I ORE...: HH:MM ! N G I O R N A T A ! ORE....: HH:MM I I ..."
//  - ~10 match rows: "I TEAM_A - TEAM_B I I TEAM_C - TEAM_D I I TEAM_E - TEAM_F I"
function parseEccellenza(lines: string[]): RigaParsed[] {
  const righe: RigaParsed[] = []

  let andataDate: string[] = []
  let ritornoDate: string[] = []
  let andataTime: string[] = []
  let ritornoTime: string[] = []
  let giornate: number[] = []

  for (const line of lines) {
    // Block separator — reset column state (line starts with "." followed by many dashes)
    if (/^\.[-]{4,}\./.test(line)) {
      andataDate = []
      ritornoDate = []
      andataTime = []
      ritornoTime = []
      giornate = []
      continue
    }

    // Date header: contains both ANDATA: and RITORNO:
    if (line.includes('ANDATA:') && line.includes('RITORNO:')) {
      andataDate = [...line.matchAll(/ANDATA:\s*(\d{1,2}[/]\d{1,2}[/]\d{2,4})/g)]
        .map(m => parseData(m[1]) ?? '')
      ritornoDate = [...line.matchAll(/RITORNO:\s*(\d{1,2}[/]\d{1,2}[/]\d{2,4})/g)]
        .map(m => parseData(m[1]) ?? '')
      continue
    }

    // Giornata/time header: contains letter-spaced "G I O R N A T A"
    if (/G\s+I\s+O\s+R\s+N\s+A\s+T\s+A/.test(line) || line.includes('GIORNATA')) {
      giornate = [...line.matchAll(/(\d{1,2})\s+G\s*I\s*O\s*R\s*N\s*A\s*T\s*A/g)]
        .map(m => parseInt(m[1]))
      const allTimes = [...line.matchAll(/ORE[.]*:\s*(\d{1,2}:\d{2})/g)].map(m => m[1])
      // Pairs per column: [andata_col0, ritorno_col0, andata_col1, ritorno_col1, ...]
      andataTime = allTimes.filter((_, i) => i % 2 === 0)
      ritornoTime = allTimes.filter((_, i) => i % 2 === 1)
      continue
    }

    // Inner divider "I----...----I ..."
    if (/^I[-]{4,}I/.test(line)) continue

    // Match row: starts with "I " and has " - " separator (team names)
    if (line.startsWith('I ') && line.includes(' - ') && andataDate.length > 0) {
      const cols = splitColumns(line)

      for (let i = 0; i < cols.length && i < 3; i++) {
        const col = cols[i]
        if (!col || !col.includes(' - ')) continue

        const dashIdx = col.indexOf(' - ')
        const casa   = col.slice(0, dashIdx).trim()
        const ospite = col.slice(dashIdx + 3).trim()
        if (!casa || !ospite) continue

        const aDate = andataDate[i]   ?? ''
        const rDate = ritornoDate[i]  ?? ''
        const aTime = andataTime[i]   ?? '00:00'
        const rTime = ritornoTime[i]  ?? '00:00'
        const giornata = giornate[i]

        if (aDate) {
          righe.push({
            data_ora: `${aDate}T${aTime}:00`,
            avversario_casa: casa,
            avversario_ospite: ospite,
            campo: '',
            giornata,
            raw_text: col,
          })
        }

        // Ritorno: squadre invertite, giornata non inclusa (non indicata nel PDF)
        if (rDate) {
          righe.push({
            data_ora: `${rDate}T${rTime}:00`,
            avversario_casa: ospite,
            avversario_ospite: casa,
            campo: '',
            giornata: undefined,
            raw_text: col,
          })
        }
      }
    }
  }

  return righe
}

// Generic fallback: lines with date + time on same line
function parseGeneric(lines: string[]): RigaParsed[] {
  const righe: RigaParsed[] = []
  const PATTERN_ROW = /(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{4})\s+(\d{1,2}:\d{2})/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const m = line.match(PATTERN_ROW)
    if (!m) continue

    const dataISO = parseData(m[1])
    if (!dataISO) continue
    const ora = m[2]
    const data_ora = `${dataISO}T${ora}:00`

    const afterOra = line.slice(line.indexOf(m[2]) + m[2].length).trim()
    const gMatch = line.match(/^\s*(\d{1,2})\s/)
    const giornata = gMatch ? parseInt(gMatch[1]) : undefined

    let squadraCasa  = ''
    let squadraOspite = ''
    let campo = ''

    const sepMatch = afterOra.match(/^(.+?)\s+[-–]\s+(.+?)(?:\s{2,}(.+))?$/)
    if (sepMatch) {
      squadraCasa   = sepMatch[1].trim()
      squadraOspite = sepMatch[2].trim()
      campo = sepMatch[3]?.trim() ?? ''
    } else {
      const tokens = afterOra.split(/\s{2,}/)
      if (tokens.length >= 2) {
        squadraCasa   = tokens[0]?.trim() ?? ''
        squadraOspite = tokens[1]?.trim() ?? ''
        campo = tokens[2]?.trim() ?? ''
      } else {
        squadraCasa   = afterOra
        squadraOspite = lines[i + 1]?.trim() ?? ''
      }
    }

    if (!squadraCasa && !squadraOspite) continue

    righe.push({ data_ora, avversario_casa: squadraCasa, avversario_ospite: squadraOspite, campo, giornata, raw_text: line })
  }

  return righe
}

function parseFigcText(text: string): RigaParsed[] {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 3)

  // Try Eccellenza column-based format first
  const eccellenza = parseEccellenza(lines)
  if (eccellenza.length > 0) return eccellenza

  // Fallback: generic single-line format
  return parseGeneric(lines)
}

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'FormData richiesto' }, { status: 400 })

  const file = formData.get('file') as Blob | null
  if (!file) return NextResponse.json({ error: 'File mancante' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())

  let testo: string
  try {
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    testo = result.text
  } catch {
    return NextResponse.json(
      { error: 'Impossibile leggere il PDF. Assicurati che non sia protetto da password.' },
      { status: 422 },
    )
  }

  const righe = parseFigcText(testo)

  return NextResponse.json({
    ok: true,
    righe,
    testo_grezzo: testo.slice(0, 2000),
  })
}
