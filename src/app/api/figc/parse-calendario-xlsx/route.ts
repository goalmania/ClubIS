import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

interface RigaParsed {
  data_ora: string
  avversario_casa: string
  avversario_ospite: string
  campo: string
  giornata: number | undefined
  raw_text: string
}

function parseDataString(s: string): string | null {
  s = s.trim()
  const mIT = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (mIT) return `${mIT[3]}-${mIT[2].padStart(2, '0')}-${mIT[1].padStart(2, '0')}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return null
}

// Excel serial date → YYYY-MM-DD
function excelSerialToDate(serial: number): string {
  // Excel wrongly treats 1900 as a leap year; subtract 1 for serials > 59
  const ms = (serial - (serial > 59 ? 1 : 0) - 25569) * 86400 * 1000
  const d = new Date(Math.round(ms))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

// Excel decimal time (0.625 = 15:00) → HH:MM
function excelDecimalToTime(dec: number): string {
  const totalMins = Math.round(dec * 24 * 60)
  const h = Math.floor(totalMins / 60) % 24
  const m = totalMins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function parseOra(v: unknown): string {
  if (typeof v === 'number') return excelDecimalToTime(v)
  const s = String(v ?? '').trim()
  if (/^\d{1,2}:\d{2}/.test(s)) return s.slice(0, 5).padStart(5, '0')
  return '00:00'
}

function parseDataValue(v: unknown): string | null {
  if (typeof v === 'number' && v > 1000) return excelSerialToDate(v)
  return parseDataString(String(v ?? ''))
}

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'FormData richiesto' }, { status: 400 })

  const file = formData.get('file') as Blob | null
  if (!file) return NextResponse.json({ error: 'File mancante' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())

  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' })
  } catch {
    return NextResponse.json({ error: 'Impossibile leggere il file XLSX.' }, { status: 422 })
  }

  const righe: RigaParsed[] = []

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName]
    // header:'A' keys each cell by its column letter (A, B, C, ...)
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { raw: true, defval: '', header: 'A' })

    for (const row of rows) {
      const casa      = String(row['A'] ?? '').trim()
      const ospite    = String(row['B'] ?? '').trim()
      const dataVal   = row['C']
      const oraVal    = row['D']
      const giornataRaw = String(row['E'] ?? '').trim()
      const campo     = String(row['F'] ?? '').trim()

      // Skip header/empty rows
      if (!casa || !ospite || casa.length < 2) continue

      const dataISO = parseDataValue(dataVal)
      if (!dataISO) continue

      const ora = parseOra(oraVal)
      const giornataNum = giornataRaw ? parseInt(giornataRaw.replace(/\D/g, ''), 10) : NaN

      righe.push({
        data_ora: `${dataISO}T${ora}:00`,
        avversario_casa: casa,
        avversario_ospite: ospite,
        campo,
        giornata: isNaN(giornataNum) ? undefined : giornataNum,
        raw_text: `${casa} - ${ospite}`,
      })
    }
  }

  return NextResponse.json({
    ok: true,
    righe,
    testo_grezzo: `${workbook.SheetNames.length} fogli: ${workbook.SheetNames.join(', ')}`,
  })
}
