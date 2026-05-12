import { NextRequest, NextResponse } from 'next/server'
import pdfParse from 'pdf-parse'

export interface PartitaEstratta {
  data: string       // DD/MM/YYYY
  ora: string        // HH:MM
  squadraCasa: string
  squadraOspite: string
  campo?: string
  giornata?: number
}

function parsePDFText(text: string): PartitaEstratta[] {
  const risultati: PartitaEstratta[] = []
  const righe = text.split('\n').map(r => r.trim()).filter(r => r.length > 0)

  let giornataCorrente: number | undefined
  let dataCorrente: string | null = null
  let oraCorrente = '15:00'
  let campoCorrente: string | undefined

  for (let i = 0; i < righe.length; i++) {
    const riga = righe[i]

    // Detect giornata: "Giornata 1", "1a Giornata", "GIORNATA 01"
    const mGiornata = riga.match(/giornata\s+(\d+)/i)
      || riga.match(/(\d+)[°a]?\s*giornata/i)
      || riga.match(/^(\d+)\s*[-–]\s*giornata/i)
    if (mGiornata) {
      giornataCorrente = parseInt(mGiornata[1], 10)
      continue
    }

    // Detect campo: lines containing "Stadio:", "Campo:", "Impianto:"
    const mCampo = riga.match(/^(?:stadio|campo|impianto)\s*[:\-]\s*(.+)/i)
    if (mCampo) {
      campoCorrente = mCampo[1].trim()
      continue
    }

    // Detect date DD/MM/YYYY or DD-MM-YYYY
    const mData = riga.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/)
    if (mData) {
      dataCorrente = `${mData[1]}/${mData[2]}/${mData[3]}`
      // Reset campo per nuova data
      campoCorrente = undefined
      // Extract time from same line: "ore 15:30" or "15:30" or "15.30"
      const mOra = riga.match(/ore\s*(\d{2})[:\.](\d{2})/)
        || riga.match(/\b(\d{2})[:\.](\d{2})\b/)
      if (mOra) oraCorrente = `${mOra[1]}:${mOra[2]}`
    }

    // Detect match line: "SquadraCasa - SquadraOspite" or "vs"
    const separatori = [' - ', ' VS ', ' vs ', ' – ', ' — ']
    for (const sep of separatori) {
      const idx = riga.indexOf(sep)
      if (idx < 0) continue

      // Remove date, time, and "ore" from the line before splitting
      let teams = riga
        .replace(/\d{2}[\/\-]\d{2}[\/\-]\d{4}/, '')
        .replace(/ore\s*\d{2}[:\.]?\d{2}/i, '')
        .replace(/\b\d{2}[:\.]?\d{2}\b/, '')
        .trim()

      const parts = teams.split(sep)
      if (parts.length < 2) break

      const squadraCasa = parts[0].trim()
      const squadraOspite = parts.slice(1).join(sep).trim()

      if (squadraCasa.length > 1 && squadraOspite.length > 1 && dataCorrente) {
        // Check next line for campo if not yet detected
        const nextRiga = righe[i + 1] ?? ''
        const mCampoNext = nextRiga.match(/^(?:stadio|campo|impianto)\s*[:\-]\s*(.+)/i)
        const campo = campoCorrente ?? (mCampoNext ? mCampoNext[1].trim() : undefined)

        risultati.push({
          data: dataCorrente,
          ora: oraCorrente,
          squadraCasa,
          squadraOspite,
          campo,
          giornata: giornataCorrente,
        })
        // Reset ora for next potential match on different time
        oraCorrente = '15:00'
      }
      break
    }
  }

  return risultati
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'File PDF mancante' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await pdfParse(buffer)
    const partite = parsePDFText(parsed.text)

    return NextResponse.json({ partite, righe: parsed.numpages })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Errore nel parsing del PDF' }, { status: 500 })
  }
}
