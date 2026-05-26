import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDNA(d: string | null): [string, string, string] {
  if (!d) return ['', '', '']
  const [y, m, dd] = d.split('-')
  return [dd ?? '', m ?? '', y?.slice(2) ?? '']
}

function fmtData(d: string): string {
  return new Date(d).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtOra(d: string): string {
  return new Date(d).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { partita_id: string } },
) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { clubId } = ctx

  const supabase = createAdminClient()

  const [{ data: partita }, { data: distinta }] = await Promise.all([
    supabase
      .from('partite')
      .select('avversario, data_ora, competizione, giornata, casa_trasferta, campo, club_id')
      .eq('id', params.partita_id)
      .single(),
    supabase
      .from('distinte_gara')
      .select('giocatori_snapshot, staff_snapshot')
      .eq('partita_id', params.partita_id)
      .order('versione', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!partita || !distinta) {
    return NextResponse.json({ error: 'Distinta non trovata' }, { status: 404 })
  }

  const resolvedClubId = (partita as any).club_id ?? clubId

  const { data: club } = await supabase
    .from('clubs')
    .select('nome, categoria')
    .eq('id', resolvedClubId)
    .single()

  const isSerieD = club?.categoria === 'serie_d'

  const giocatori = ((distinta.giocatori_snapshot as any[]) ?? [])
    .sort((a: any, b: any) => (a.numero_maglia ?? 99) - (b.numero_maglia ?? 99))
  const staff = (distinta.staff_snapshot ?? {}) as Record<string, string>

  // ── Load template ──────────────────────────────────────────────────────────

  const templateFile = isSerieD ? 'distinta-serie-d.pdf' : 'distinta-adb.pdf'
  const templateBytes = readFileSync(join(process.cwd(), 'public', 'templates', templateFile))
  const pdfDoc = await PDFDocument.load(templateBytes)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const page = pdfDoc.getPages()[0]
  const black = rgb(0, 0, 0)

  const draw = (text: string | null | undefined, x: number, y: number, size = 7) => {
    if (!text) return
    page.drawText(String(text), { x, y, size, font, color: black })
  }

  // ── Fill template ──────────────────────────────────────────────────────────

  if (isSerieD) {
    // ── SERIE D (595.2 × 841.9 pt) ────────────────────────────────────────

    // Header — three lines stacked to the right of the Serie D logo.
    // Calibrated via pixel analysis of the embedded JPEG template (2480×3508px):
    //   SOCIETA'  underline → jpeg_py=179  → pdf_y=799  blank starts pdf_x=179
    //   Elenco    underline → jpeg_py=271  → pdf_y=777  blank starts pdf_x=324
    //   valevole  underline → jpeg_py=342  → pdf_y=760  blank starts pdf_x=188
    // Text drawn 1-2pt above each underline so baseline sits on the line.
    draw(club?.nome, 182, 800)           // "SOCIETA' ___"   (x after label end)
    draw(partita.avversario, 326, 778)   // "Elenco … gara ___" (x after long sentence)
    const giornataLabel = partita.giornata ? `${partita.giornata}\xAA giornata` : ''
    draw(giornataLabel, 190, 761)        // "valevole per ___"
    const comp = partita.competizione ?? 'Campionato Nazionale Serie D'
    draw(comp, 200, 749)                   // "in programma" blank starts at x≈197
    draw(fmtData(partita.data_ora), 140, 736)
    draw(partita.campo ?? '', 334, 736)    // "a ___" 2nd blank starts at x≈332
    draw(partita.campo ?? '', 181, 722)    // "campo" blank starts at x≈179
    draw(fmtOra(partita.data_ora), 453, 722)

    // Player rows – 18 titolari + 4 riserve
    // Row text baselines (y from page bottom), computed from detected horizontal line positions.
    // Separator between rows 11 and 12 accounts for the thin divider row in the PDF.
    const SD_ROWS_Y = [
      672, 652, 632, 613, 593, 573, 553, 533, 513, 494, 473, // titolari 1–11
      439, 420, 400, 380, 360, 340, 320,                      // titolari 12–18
      300, 281, 259, 240,                                      // riserve 1–4
    ]

    for (let i = 0; i < Math.min(giocatori.length, SD_ROWS_Y.length); i++) {
      const g = giocatori[i]
      const y = SD_ROWS_Y[i]
      const [gd, gm, ga] = fmtDNA(g.data_nascita)

      if (g.numero_maglia != null) draw(String(g.numero_maglia), 2, y)
      draw(gd, 26, y)
      draw(gm, 46, y)
      draw(ga, 66, y)
      draw(`${g.cognome ?? ''} ${g.nome ?? ''}`.trim(), 106, y)
      if (g.numero_matricola_figc) draw(g.numero_matricola_figc, 306, y)
    }

    // Staff – "Persone ammesse nel recinto di gioco"
    // Rows detected at y ≈ 262, 241, 220, 199, 178 (text baselines from bottom)
    draw(staff.dirigente,        150, 262)  // Dirigente Accompagnatore Ufficiale
    draw(staff.medico,            90, 220)  // Medico Sociale
    draw(staff.allenatore,        75, 199)  // Allenatore
    draw(staff.vice_allenatore,  120, 178)  // Allenatore in seconda

  } else {
    // ── AdB BAT (595.9 × 842.9 pt) ────────────────────────────────────────

    // Header – "Denominazione Società e Timbro" box
    // Gray fill box: x=276–450pt, row center y≈742
    draw(club?.nome, 278, 742)

    // "Distinta Giocatori partecipanti alla gara:" row  (y ≈ 697)
    // Gray fill box: x=250–544pt (split by pre-printed "–" at ~397pt)
    draw(club?.nome,          252, 697)   // home team (start of gray box)
    draw(partita.avversario,  442, 697)   // away team (right half of gray box)

    // "Campionato … da disputare il: … a:" row  (y ≈ 672)
    // Gray fill boxes (pixel-detected): competition x=123–249 | date x=335–428 | time x=449–544
    const compAdb = (partita.competizione ?? '') +
      (partita.giornata ? ` Giornata ${partita.giornata}` : '')
    draw(compAdb,                     125, 672)   // campionato (gray fill x=123–249)
    draw(fmtData(partita.data_ora),   337, 672)   // data       (gray fill x=335–428)
    draw(fmtOra(partita.data_ora),    452, 672)   // ora        (gray fill x=449–544)

    // Player rows – 20 rows
    // Column borders (x): N.Maglia 0–49.5 | G 49.5–91.5 | M 91.5–107.75 | A 107.75–123.4 | Nome 123.4–250 | Matricola 276.2–334.5
    const ADB_ROWS_Y = [
      617, 599, 581, 563, 545, 527, 509, 491, 472, 454,
      436, 418, 400, 382, 363, 345, 327, 309, 291, 273,
    ]

    for (let i = 0; i < Math.min(giocatori.length, ADB_ROWS_Y.length); i++) {
      const g = giocatori[i]
      const y = ADB_ROWS_Y[i]
      const [gd, gm, ga] = fmtDNA(g.data_nascita)

      if (g.numero_maglia != null) draw(String(g.numero_maglia), 2, y)
      draw(gd, 51, y)
      draw(gm, 93, y)
      draw(ga, 109, y)
      draw(`${g.cognome ?? ''} ${g.nome ?? ''}`.trim(), 125, y)
      if (g.numero_matricola_figc) draw(g.numero_matricola_figc, 278, y)
    }

    // Staff
    // "Dirigente accompagnatore ufficiale della squadra Signor:" row  y ≈ 248
    draw(staff.dirigente,       350, 248)  // name after "Signor:"
    draw(staff.allenatore,       90, 188)  // Allenatore
    draw(staff.medico,           90, 169)  // Medico Sociale
    draw(staff.vice_allenatore,  90, 150)  // Massaggiatore row (vice)
  }

  // ── Return PDF ─────────────────────────────────────────────────────────────

  const pdfBytes = await pdfDoc.save()

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="distinta-${params.partita_id}.pdf"`,
    },
  })
}
