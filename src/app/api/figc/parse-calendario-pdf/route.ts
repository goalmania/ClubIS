import { NextRequest, NextResponse } from 'next/server'
// pdfjs-dist/legacy works in Node.js without native deps (no canvas, no DOMMatrix)
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

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

// Extract lines from a PDF page grouping glyphs by Y coordinate
async function extractLines(page: any): Promise<string[]> {
  const content = await page.getTextContent({ includeMarkedContent: false })
  const rows = new Map<number, { x: number; str: string }[]>()
  for (const item of content.items) {
    if (!('str' in item)) continue
    const y = Math.round(item.transform[5])
    if (!rows.has(y)) rows.set(y, [])
    rows.get(y)!.push({ x: item.transform[4], str: item.str })
  }
  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0]) // descending Y = top to bottom
    .map(([, items]) =>
      items
        .sort((a, b) => a.x - b.x)
        .map(i => i.str)
        .join('')
        .trim(),
    )
    .filter(l => l.length > 2)
}

// Split a 3-column line "I col1 I I col2 I I col3 I" → ["col1","col2","col3"]
function splitColumns(line: string): string[] {
  const parts = line.split(' I I ')
  if (parts.length === 0) return []
  parts[0] = parts[0].replace(/^I\s+/, '')
  const last = parts.length - 1
  parts[last] = parts[last].replace(/\s+I$/, '')
  return parts.map(p => p.trim())
}

// FIGC Eccellenza PDF: 3 giornate side-by-side per block
function parseEccellenza(lines: string[]): RigaParsed[] {
  const righe: RigaParsed[] = []
  let andataDate: string[] = []
  let ritornoDate: string[] = []
  let andataTime: string[] = []
  let ritornoTime: string[] = []
  let giornate: number[] = []

  for (const line of lines) {
    if (/^\.[-]{4,}\./.test(line)) {
      andataDate = []; ritornoDate = []; andataTime = []; ritornoTime = []; giornate = []
      continue
    }
    if (line.includes('ANDATA:') && line.includes('RITORNO:')) {
      andataDate = [...line.matchAll(/ANDATA:\s*(\d{1,2}[/]\d{1,2}[/]\d{2,4})/g)].map(m => parseData(m[1]) ?? '')
      ritornoDate = [...line.matchAll(/RITORNO:\s*(\d{1,2}[/]\d{1,2}[/]\d{2,4})/g)].map(m => parseData(m[1]) ?? '')
      continue
    }
    if (/G\s+I\s+O\s+R\s+N\s+A\s+T\s+A/.test(line) || line.includes('GIORNATA')) {
      giornate = [...line.matchAll(/(\d{1,2})\s+G\s*I\s*O\s*R\s*N\s*A\s*T\s*A/g)].map(m => parseInt(m[1]))
      const allTimes = [...line.matchAll(/ORE[.]*:\s*(\d{1,2}:\d{2})/g)].map(m => m[1])
      andataTime = allTimes.filter((_, i) => i % 2 === 0)
      ritornoTime = allTimes.filter((_, i) => i % 2 === 1)
      continue
    }
    if (/^I[-]{4,}I/.test(line)) continue

    if (line.startsWith('I ') && line.includes(' - ') && andataDate.length > 0) {
      const cols = splitColumns(line)
      for (let i = 0; i < cols.length && i < 3; i++) {
        const col = cols[i]
        if (!col || !col.includes(' - ')) continue
        const dashIdx = col.indexOf(' - ')
        const casa   = col.slice(0, dashIdx).trim()
        const ospite = col.slice(dashIdx + 3).trim()
        if (!casa || !ospite) continue
        const aDate = andataDate[i]  ?? ''
        const rDate = ritornoDate[i] ?? ''
        const aTime = andataTime[i]  ?? '00:00'
        const rTime = ritornoTime[i] ?? '00:00'
        const giornata = giornate[i]
        if (aDate) righe.push({ data_ora: `${aDate}T${aTime}:00`, avversario_casa: casa, avversario_ospite: ospite, campo: '', giornata, raw_text: col })
        if (rDate) righe.push({ data_ora: `${rDate}T${rTime}:00`, avversario_casa: ospite, avversario_ospite: casa, campo: '', giornata: undefined, raw_text: col })
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
    const data_ora = `${dataISO}T${m[2]}:00`
    const afterOra = line.slice(line.indexOf(m[2]) + m[2].length).trim()
    const giornata = line.match(/^\s*(\d{1,2})\s/)?.[1] ? parseInt(line.match(/^\s*(\d{1,2})\s/)![1]) : undefined
    let squadraCasa = '', squadraOspite = '', campo = ''
    const sep = afterOra.match(/^(.+?)\s+[-–]\s+(.+?)(?:\s{2,}(.+))?$/)
    if (sep) { squadraCasa = sep[1].trim(); squadraOspite = sep[2].trim(); campo = sep[3]?.trim() ?? '' }
    else { const t = afterOra.split(/\s{2,}/); squadraCasa = t[0]?.trim() ?? ''; squadraOspite = t[1]?.trim() ?? ''; campo = t[2]?.trim() ?? '' }
    if (!squadraCasa && !squadraOspite) continue
    righe.push({ data_ora, avversario_casa: squadraCasa, avversario_ospite: squadraOspite, campo, giornata, raw_text: line })
  }
  return righe
}

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'FormData richiesto' }, { status: 400 })

  const file = formData.get('file') as Blob | null
  if (!file) return NextResponse.json({ error: 'File mancante' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())

  let allLines: string[] = []
  try {
    const doc = await (pdfjsLib as any).getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
    }).promise
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      allLines.push(...(await extractLines(page)))
    }
  } catch {
    return NextResponse.json(
      { error: 'Impossibile leggere il PDF. Assicurati che non sia protetto da password.' },
      { status: 422 },
    )
  }

  const eccellenza = parseEccellenza(allLines)
  const righe = eccellenza.length > 0 ? eccellenza : parseGeneric(allLines)

  return NextResponse.json({
    ok: true,
    righe,
    testo_grezzo: allLines.slice(0, 30).join('\n'),
  })
}
