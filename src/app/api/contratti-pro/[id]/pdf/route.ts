import { createAdminClient } from '@/lib/supabase/admin'
import { getClubFromSession } from '@/lib/server-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib'
import { isPro } from '@/lib/categorie-club'

/* ─── Helpers ─────────────────────────────────────────────────────── */

function fmtData(d: string | null | undefined): string {
  if (!d) return ''
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`
}

function fmtEuro(v: number | null | undefined): string {
  if (v == null) return ''
  return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

function blank(val: string | null | undefined, fallback = ''): string {
  return val?.trim() || fallback
}

function dotLine(len = 40): string {
  return '.'.repeat(len)
}

/* ─── PDF drawing context ─────────────────────────────────────────── */

class PdfCtx {
  doc: PDFDocument
  page!: PDFPage
  fontR: PDFFont
  fontB: PDFFont
  fontI: PDFFont
  fontBI: PDFFont
  readonly W = 595
  readonly H = 842
  readonly ML = 62   // margin left
  readonly MR = 62   // margin right
  readonly MT = 60   // margin top
  readonly MB = 50   // margin bottom
  y = 0
  get COL() { return this.W - this.ML - this.MR }

  constructor(doc: PDFDocument, r: PDFFont, b: PDFFont, i: PDFFont, bi: PDFFont) {
    this.doc = doc; this.fontR = r; this.fontB = b; this.fontI = i; this.fontBI = bi
  }

  newPage() {
    this.page = this.doc.addPage([this.W, this.H])
    this.y = this.H - this.MT
  }

  // Draw text at absolute position
  t(str: string, x: number, y: number, sz: number, font: PDFFont, color = rgb(0, 0, 0)) {
    if (!str) return
    this.page.drawText(str, { x, y, size: sz, font, color })
  }

  // Draw centered text
  tc(str: string, y: number, sz: number, font: PDFFont) {
    const w = font.widthOfTextAtSize(str, sz)
    this.t(str, (this.W - w) / 2, y, sz, font)
  }

  // Draw line
  hline(y: number, x1 = this.ML, x2 = this.W - this.MR, thick = 0.5) {
    this.page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: thick, color: rgb(0, 0, 0) })
  }

  // Wrap and draw a paragraph, returns new y
  para(text: string, x: number, startY: number, maxW: number, sz: number, font: PDFFont, leading = sz * 1.45): number {
    const words = text.split(' ')
    let line = ''
    let y = startY
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(test, sz) > maxW && line) {
        this.t(line, x, y, sz, font)
        y -= leading
        line = word
        if (y < this.MB + 40) { this.newPage(); y = this.y }
      } else {
        line = test
      }
    }
    if (line) { this.t(line, x, y, sz, font); y -= leading }
    return y
  }

  // Draw a labeled field with dotted underline
  field(label: string, value: string, x: number, y: number, w: number, sz = 9): void {
    this.t(label, x, y + sz + 2, sz - 1, this.fontI, rgb(0.4, 0.4, 0.4))
    this.t(value || '', x + 2, y + 2, sz, this.fontR)
    this.hline(y, x, x + w, 0.3)
  }

  // Dotted fill line
  dottedFill(y: number, x1 = this.ML, x2 = this.W - this.MR) {
    const dots = '.'.repeat(Math.floor((x2 - x1) / 3))
    this.t(dots, x1, y, 9, this.fontR, rgb(0.6, 0.6, 0.6))
    this.hline(y - 1, x1, x2, 0.2)
  }
}

/* ─── Template Lega Pro (Serie C) ────────────────────────────────── */

async function buildLegaPro(c: any, club: any): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const fontR  = await doc.embedFont(StandardFonts.TimesRoman)
  const fontB  = await doc.embedFont(StandardFonts.TimesRomanBold)
  const fontI  = await doc.embedFont(StandardFonts.TimesRomanItalic)
  const fontBI = await doc.embedFont(StandardFonts.TimesRomanBoldItalic)
  const ctx    = new PdfCtx(doc, fontR, fontB, fontI, fontBI)

  const nomeClub     = blank(club.nome, 'Società')
  const dataInizio   = fmtData(c.data_inizio)
  const annoScadenza = c.data_scadenza ? new Date(c.data_scadenza).getFullYear().toString() : '____'
  const retLorda     = c.retribuzione_lorda_annua ? `€ ${fmtEuro(c.retribuzione_lorda_annua)}` : ''
  const premi: { tipo: string; importo: number; condizione: string }[] = c.premi ?? []
  const haVariabile  = premi.length > 0

  /* ── PAGINA 1 ─────────────────────────────────────────────────── */
  ctx.newPage()
  let y = ctx.y

  // Titolo
  ctx.tc('CONTRATTO TIPO', y, 13, ctx.fontB)
  y -= 30

  // Preambolo
  const INTRO = 'Con la presente scrittura privata, da valere ad ogni effetto di legge, tra la Società ed il Calciatore professionista sottoindicati, si stipula e si conviene quanto segue:'
  y = ctx.para(INTRO, ctx.ML, y, ctx.COL, 10, ctx.fontR)
  y -= 20

  // TRA
  ctx.tc('TRA', y, 11, ctx.fontB)
  y -= 24

  // Società box
  const colW3 = ctx.COL / 3
  ctx.t('Denominazione SOCIETÀ', ctx.ML, y, 8, ctx.fontR, rgb(0.35, 0.35, 0.35))
  ctx.t('SEDE LEGALE',            ctx.ML + colW3, y, 8, ctx.fontR, rgb(0.35, 0.35, 0.35))
  ctx.t('P. IVA',                 ctx.ML + colW3 * 2, y, 8, ctx.fontR, rgb(0.35, 0.35, 0.35))
  y -= 14
  ctx.t(nomeClub, ctx.ML, y, 10, ctx.fontB)
  ctx.t(blank(club.sede_legale), ctx.ML + colW3, y, 10, ctx.fontR)
  ctx.t(blank(club.piva), ctx.ML + colW3 * 2, y, 10, ctx.fontR)
  y -= 6
  ctx.hline(y)
  y -= 20

  ctx.t('rappresentata da', ctx.ML, y, 9, ctx.fontR, rgb(0.35, 0.35, 0.35))
  ctx.t('con qualifica di legale rappresentante ', ctx.ML + colW3, y, 9, ctx.fontR, rgb(0.35, 0.35, 0.35))
  ctx.t('pro tempore', ctx.ML + colW3 + ctx.fontR.widthOfTextAtSize('con qualifica di legale rappresentante ', 9), y, 9, ctx.fontI, rgb(0.35, 0.35, 0.35))
  y -= 14
  ctx.t(blank(c.rappresentante_legale), ctx.ML, y, 10, ctx.fontR)
  ctx.t(blank(c.qualifica_rappresentante), ctx.ML + colW3, y, 10, ctx.fontR)
  y -= 6
  ctx.hline(y)
  y -= 20

  // E
  ctx.tc('E', y, 11, ctx.fontB)
  y -= 20

  // Calciatore
  ctx.t('Cognome e nome del Calciatore', ctx.ML, y, 8, ctx.fontR, rgb(0.35, 0.35, 0.35))
  y -= 14
  ctx.t(`${blank(c.cognome_tesserato)} ${blank(c.nome_tesserato)}`, ctx.ML, y, 10, ctx.fontB)
  y -= 6
  ctx.hline(y)
  y -= 20

  ctx.t('Data e luogo di nascita', ctx.ML, y, 8, ctx.fontR, rgb(0.35, 0.35, 0.35))
  y -= 14
  ctx.t(`${blank(c.data_nascita_tesserato)}${c.luogo_nascita_tesserato ? '  —  ' + c.luogo_nascita_tesserato : ''}`, ctx.ML, y, 10, ctx.fontR)
  y -= 6
  ctx.hline(y)
  y -= 20

  const colW2 = ctx.COL / 3
  ctx.t('Domicilio', ctx.ML, y, 8, ctx.fontR, rgb(0.35, 0.35, 0.35))
  ctx.t('Codice fiscale', ctx.ML + colW2, y, 8, ctx.fontR, rgb(0.35, 0.35, 0.35))
  ctx.t('Matricola', ctx.ML + colW2 * 2, y, 8, ctx.fontR, rgb(0.35, 0.35, 0.35))
  y -= 14
  ctx.t(blank(c.domicilio_tesserato), ctx.ML, y, 10, ctx.fontR)
  ctx.t(blank(c.cf_tesserato), ctx.ML + colW2, y, 10, ctx.fontR)
  ctx.t(blank(c.matricola_tesserato), ctx.ML + colW2 * 2, y, 10, ctx.fontR)
  y -= 6
  ctx.hline(y)
  y -= 24

  // Art. 1
  const art1 = `Il Sig. ${c.cognome_tesserato} ${c.nome_tesserato} si impegna, nella sua qualità di Calciatore professionista tesserato per la F.I.G.C. (come sarà fin d'ora individuato in contratto) a prestare la sua attività nelle squadre della Società ${nomeClub} a decorrere dal ${dataInizio} e fino al 30 giugno ${annoScadenza}.`
  ctx.t('Art. 1', ctx.ML, y, 10, ctx.fontB)
  ctx.t(' -', ctx.ML + ctx.fontB.widthOfTextAtSize('Art. 1', 10), y, 10, ctx.fontR)
  y -= 15
  y = ctx.para(art1, ctx.ML, y, ctx.COL, 10, ctx.fontR)
  y -= 12

  // Art. 2
  ctx.t('Art. 2', ctx.ML, y, 10, ctx.fontB)
  ctx.t(` - La Società si impegna a corrispondere al Sig. ${c.cognome_tesserato} ${c.nome_tesserato}`, ctx.ML + ctx.fontB.widthOfTextAtSize('Art. 2', 10), y, 10, ctx.fontR)
  y -= 20

  if (!haVariabile) {
    // IPOTESI A – solo fissa
    const titleA = 'IPOTESI A – Retribuzione fissa'
    ctx.tc(titleA, y, 10, ctx.fontBI)
    ctx.hline(y - 2, (ctx.W - ctx.fontBI.widthOfTextAtSize(titleA, 10)) / 2 - 5, (ctx.W + ctx.fontBI.widthOfTextAtSize(titleA, 10)) / 2 + 5, 0.5)
    y -= 20

    ctx.t(`- un compenso totale lordo di €. ${retLorda}`, ctx.ML, y, 10, ctx.fontR)
    y -= 18
    ctx.dottedFill(y)
    y -= 4
  } else {
    // IPOTESI B – in parte fissa, in parte variabile
    const titleB = 'IPOTESI B – Retribuzione in parte fissa ed in parte variabile'
    ctx.tc(titleB, y, 10, ctx.fontBI)
    y -= 20

    ctx.t(`- un compenso fisso lordo di €. ${retLorda}`, ctx.ML, y, 10, ctx.fontR)
    y -= 18
    ctx.t('  ed in parte variabile legata al conseguimento dei seguenti risultati:', ctx.ML, y, 10, ctx.fontR)
    y -= 18

    for (const p of premi) {
      if (y < ctx.MB + 30) { ctx.newPage(); y = ctx.y }
      ctx.t(`  • ${p.tipo}: ${p.condizione} — € ${fmtEuro(p.importo)}`, ctx.ML, y, 10, ctx.fontR)
      y -= 15
    }
    y -= 6
  }

  /* ── PAGINA 2 — Art. 3, Art. 4, Art. 5, Firme ─────────────────── */
  ctx.newPage()
  y = ctx.y

  // Art. 3 — accordo collettivo + procuratore
  ctx.t('Art. 3', ctx.ML, y, 10, ctx.fontB)
  y -= 15
  const art3 = 'Le parti, con la sottoscrizione del presente contratto di prestazione sportiva, si impegnano a recepire e rispettare integralmente le pattuizioni che – in sede di stipulazione del nuovo contratto collettivo – verranno concordate tra F.I.G.C., Lega Italiana Calcio Professionistico ("Lega Pro") ed A.I.C.'
  y = ctx.para(art3, ctx.ML, y, ctx.COL, 10, ctx.fontR)
  y -= 14

  if (c.agente_calciatore_nome || c.agente_societa_nome) {
    const tA = 'IPOTESI A – Presenza di Procuratore Sportivo nella trattativa'
    ctx.tc(tA, y, 10, ctx.fontBI)
    y -= 18
    if (c.agente_calciatore_nome) {
      const s1 = `Le parti si danno atto, altresì, che il Calciatore è stato rappresentato nella fase di trattativa dal Procuratore Sportivo ${c.agente_calciatore_nome} iscritto nel registro dei Procuratori Sportivi F.I.G.C. col n. id ${blank(c.agente_calciatore_reg, '___________')}.`
      y = ctx.para(s1, ctx.ML, y, ctx.COL, 10, ctx.fontR)
      y -= 8
    }
    if (c.agente_societa_nome) {
      const s2 = `Le parti si danno atto, altresì, che la Società è stata rappresentata nella fase di trattativa dal Procuratore Sportivo ${c.agente_societa_nome} iscritto nel registro dei Procuratori Sportivi F.I.G.C. col n. id ${blank(c.agente_societa_reg, '___________')}.`
      y = ctx.para(s2, ctx.ML, y, ctx.COL, 10, ctx.fontR)
    }
  } else {
    const tB = 'IPOTESI B – Assenza di Procuratore Sportivo nella trattativa'
    ctx.tc(tB, y, 10, ctx.fontBI)
    y -= 18
    y = ctx.para('Le parti si danno atto, altresì, che il Calciatore non è stato rappresentato nella fase di trattativa per la stipula del presente contratto da alcun Procuratore Sportivo.', ctx.ML, y, ctx.COL, 10, ctx.fontR)
    y -= 8
    y = ctx.para('Le parti si danno atto, altresì, che la Società non è stata rappresentata nella fase di trattativa per la stipula del presente contratto da alcun Procuratore Sportivo.', ctx.ML, y, ctx.COL, 10, ctx.fontR)
  }
  y -= 16

  // Art. 4
  ctx.t('Art. 4', ctx.ML, y, 10, ctx.fontB)
  y -= 15
  const art4 = 'Con la firma del presente contratto, che rinnova e sostituisce ogni eventuale precedente accordo nei modi e nei termini sanciti dall\'accordo collettivo, le parti assumono l\'obbligo di osservare le norme del CONI, della FIGC e della Lega Pro. Assumono altresì l\'impegno di accettare la piena e definitiva efficacia di tutti i provvedimenti generali e di tutte la decisioni particolari adottate dalla F.I.G.C., dai suoi Organi e Soggetti delegati nonché degli Organi di Giustizia sportiva di ogni ordine e grado, nelle materie comunque attinenti all\'attività sportiva e nelle relative vertenze di carattere tecnico, disciplinare ed economico. Le parti riconoscono in particolare la validità, efficacia e vincolatività della clausola compromissoria contenuta nell\'Accordo Collettivo fra Lega Pro ed A.I.C.'
  y = ctx.para(art4, ctx.ML, y, ctx.COL, 10, ctx.fontR)
  y -= 16

  // Art. 5
  ctx.t('Art. 5', ctx.ML, y, 10, ctx.fontB)
  y -= 15
  const art5 = 'A tutti gli effetti del presente contratto la Società elegge domicilio presso la propria sede, il Calciatore nel luogo indicato in epigrafe, salvo variazioni delle quali dovrà essere data comunicazione scritta alla Società.'
  y = ctx.para(art5, ctx.ML, y, ctx.COL, 10, ctx.fontR)
  y -= 30

  // Luogo e data
  ctx.t('Luogo e data', ctx.ML, y, 9, ctx.fontR)
  ctx.hline(y - 4, ctx.ML, ctx.ML + 160, 0.5)
  y -= 30

  // Firme
  const halfW = ctx.COL / 2 - 10
  ctx.t('Per la Società', ctx.ML, y, 9, ctx.fontR)
  ctx.t('Il Calciatore', ctx.ML + halfW + 20, y, 9, ctx.fontR)
  y -= 4
  ctx.hline(y, ctx.ML, ctx.ML + halfW)
  ctx.hline(y, ctx.ML + halfW + 20, ctx.W - ctx.MR)
  y -= 30

  // Approvazione specifica
  const approv = 'Le parti dichiarano di aver preso esatta cognizione del contenuto delle clausole previste dagli artt. 2-3-4-5 del presente contratto e le approvano specificatamente.'
  y = ctx.para(approv, ctx.ML, y, ctx.COL, 10, ctx.fontR)
  y -= 16

  ctx.t('Per la Società', ctx.ML, y, 9, ctx.fontR)
  ctx.t('Il Calciatore', ctx.ML + halfW + 20, y, 9, ctx.fontR)
  y -= 4
  ctx.hline(y, ctx.ML, ctx.ML + halfW)
  ctx.hline(y, ctx.ML + halfW + 20, ctx.W - ctx.MR)
  y -= 30

  // N.B.
  const nb = 'N.B. - Il presente Contratto deve essere depositato a cura della Società presso l\'Organo federale competente, nelle forme e modalità all\'uopo previste dalla normativa federale, entro il quinto giorno successivo alla data di stipulazione. Un\'ulteriore copia del Contratto, regolarmente sottoscritta, deve essere consegnata al calciatore al momento della stipulazione.'
  y = ctx.para(nb, ctx.ML, y, ctx.COL, 8.5, ctx.fontI, 12)

  // Clausola rescissoria in nota se presente
  if (c.clausola_rescissoria) {
    y -= 12
    ctx.t(`Clausola rescissoria pattuita: € ${fmtEuro(c.clausola_rescissoria)}`, ctx.ML, y, 9, ctx.fontR)
  }

  return doc.save()
}

/* ─── Template Serie B ───────────────────────────────────────────── */

async function buildSerieB(c: any, club: any): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const fontR  = await doc.embedFont(StandardFonts.Helvetica)
  const fontB  = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontI  = await doc.embedFont(StandardFonts.Helvetica)
  const fontBI = await doc.embedFont(StandardFonts.HelveticaBold)
  const ctx    = new PdfCtx(doc, fontR, fontB, fontI, fontBI)

  const nomeClub    = blank(club.nome, 'Società')
  const dataInizio  = fmtData(c.data_inizio)
  const dataFine    = fmtData(c.data_scadenza)
  const retLorda    = c.retribuzione_lorda_annua ? `€ ${fmtEuro(c.retribuzione_lorda_annua)}` : dotLine(30)
  const premi: { tipo: string; importo: number; condizione: string }[] = c.premi ?? []
  const stagione    = c.data_inizio ? `${new Date(c.data_inizio).getFullYear()}/${new Date(c.data_inizio).getFullYear() + 1}` : '20__/20__'
  const numModulo   = blank(c.numero_modulo, '___')

  /* ── PAGINA 1 ─────────────────────────────────────────────────── */
  ctx.newPage()
  let y = ctx.y

  ctx.t('Allegato 1', ctx.ML, y, 8, ctx.fontR, rgb(0.4, 0.4, 0.4))
  y -= 20

  // Titolo
  ctx.tc('MODULO DI CONTRATTO DI PRESTAZIONE SPORTIVA', y, 12, ctx.fontB)
  y -= 16
  ctx.hline(y + 4)
  ctx.tc(`Lega Nazionale Professionisti Serie B  -  Stagione Sportiva ${stagione}  -  Modulo n. ${numModulo}`, y, 9, ctx.fontR)
  y -= 24

  const INTRO_B = 'Con la presente scrittura privata, a valere ad ogni effetto di legge e regolamentare tra la Società ed il Calciatore professionista sottoindicati, si conviene e si stipula quanto segue:'
  y = ctx.para(INTRO_B, ctx.ML, y, ctx.COL, 9, ctx.fontR, 13)
  y -= 16

  // Società row
  const colQ = ctx.COL / 3
  ctx.t('SOCIETÁ', ctx.ML, y, 7.5, ctx.fontB, rgb(0.3, 0.3, 0.3))
  ctx.t('SEDE LEGALE', ctx.ML + colQ, y, 7.5, ctx.fontB, rgb(0.3, 0.3, 0.3))
  ctx.t('PARTITA IVA', ctx.ML + colQ * 2, y, 7.5, ctx.fontB, rgb(0.3, 0.3, 0.3))
  y -= 14
  ctx.t(nomeClub, ctx.ML, y, 9.5, ctx.fontR)
  ctx.t(blank(club.sede_legale), ctx.ML + colQ, y, 9.5, ctx.fontR)
  ctx.t(blank(club.piva), ctx.ML + colQ * 2, y, 9.5, ctx.fontR)
  y -= 3; ctx.hline(y, ctx.ML, ctx.ML + colQ - 4, 0.3)
  ctx.hline(y, ctx.ML + colQ, ctx.ML + colQ * 2 - 4, 0.3)
  ctx.hline(y, ctx.ML + colQ * 2, ctx.W - ctx.MR, 0.3)
  y -= 16

  const colH = ctx.COL / 2
  ctx.t('RAPPRESENTATA DA', ctx.ML, y, 7.5, ctx.fontB, rgb(0.3, 0.3, 0.3))
  ctx.t('QUALIFICA', ctx.ML + colH, y, 7.5, ctx.fontB, rgb(0.3, 0.3, 0.3))
  y -= 14
  ctx.t(blank(c.rappresentante_legale), ctx.ML, y, 9.5, ctx.fontR)
  ctx.t(blank(c.qualifica_rappresentante) + (c.qualifica_rappresentante ? ', munito dei necessari poteri' : ''), ctx.ML + colH, y, 9.5, ctx.fontR)
  y -= 3; ctx.hline(y)
  y -= 16

  // Agente sportivo — Società
  ctx.t('(Apporre il segno sulla casella che interessa)', ctx.ML, y, 8, ctx.fontI, rgb(0.4, 0.4, 0.4))
  y -= 16
  const haAgenteSoc = !!c.agente_societa_nome
  // checkbox visivo
  ctx.page.drawRectangle({ x: ctx.ML, y: y - 2, width: 9, height: 9, borderColor: rgb(0, 0, 0), borderWidth: 0.5, color: haAgenteSoc ? rgb(0, 0, 0) : rgb(1, 1, 1) })
  ctx.t('CHE SI È AVVALSA DEI SERVIZI DI', ctx.ML + 14, y + 5, 8.5, ctx.fontR)
  y -= 12
  ctx.t(`"${blank(c.agente_societa_nome, 'COGNOME E NOME DELL\'AGENTE SPORTIVO')}"`, ctx.ML + 14, y, 8.5, ctx.fontR)
  y -= 12
  ctx.t(`N. DI ISCRIZIONE AL REGISTRO NAZIONALE ${blank(c.agente_societa_reg)}`, ctx.ML + 14, y, 8.5, ctx.fontR)
  y -= 14
  ctx.page.drawRectangle({ x: ctx.ML, y: y - 2, width: 9, height: 9, borderColor: rgb(0, 0, 0), borderWidth: 0.5, color: !haAgenteSoc ? rgb(0, 0, 0) : rgb(1, 1, 1) })
  ctx.t('CHE NON SI È AVVALSA DEI SERVIZI DI UN PROCURATORE SPORTIVO', ctx.ML + 14, y + 5, 8.5, ctx.fontR)
  y -= 22

  // Calciatore
  ctx.t('CALCIATORE', ctx.ML, y, 7.5, ctx.fontB, rgb(0.3, 0.3, 0.3))
  ctx.t('DOMICILIO', ctx.ML + colH, y, 7.5, ctx.fontB, rgb(0.3, 0.3, 0.3))
  y -= 14
  ctx.t(`${blank(c.cognome_tesserato)} ${blank(c.nome_tesserato)}`, ctx.ML, y, 9.5, ctx.fontR)
  ctx.t(blank(c.domicilio_tesserato), ctx.ML + colH, y, 9.5, ctx.fontR)
  y -= 3; ctx.hline(y)
  y -= 16

  const col4 = ctx.COL / 4
  ctx.t('CODICE FISCALE', ctx.ML, y, 7.5, ctx.fontB, rgb(0.3, 0.3, 0.3))
  ctx.t('DATA DI NASCITA', ctx.ML + col4, y, 7.5, ctx.fontB, rgb(0.3, 0.3, 0.3))
  ctx.t('LUOGO DI NASCITA', ctx.ML + col4 * 2, y, 7.5, ctx.fontB, rgb(0.3, 0.3, 0.3))
  ctx.t('MATRICOLA', ctx.ML + col4 * 3, y, 7.5, ctx.fontB, rgb(0.3, 0.3, 0.3))
  y -= 14
  ctx.t(blank(c.cf_tesserato), ctx.ML, y, 9.5, ctx.fontR)
  ctx.t(blank(c.data_nascita_tesserato), ctx.ML + col4, y, 9.5, ctx.fontR)
  ctx.t(blank(c.luogo_nascita_tesserato), ctx.ML + col4 * 2, y, 9.5, ctx.fontR)
  ctx.t(blank(c.matricola_tesserato), ctx.ML + col4 * 3, y, 9.5, ctx.fontR)
  y -= 3; ctx.hline(y, ctx.ML, ctx.ML + col4 - 4, 0.3)
  ctx.hline(y, ctx.ML + col4, ctx.ML + col4 * 2 - 4, 0.3)
  ctx.hline(y, ctx.ML + col4 * 2, ctx.ML + col4 * 3 - 4, 0.3)
  ctx.hline(y, ctx.ML + col4 * 3, ctx.W - ctx.MR, 0.3)
  y -= 20

  // Agente sportivo — Calciatore
  ctx.t('(Apporre il segno sulla casella che interessa)', ctx.ML, y, 8, ctx.fontI, rgb(0.4, 0.4, 0.4))
  y -= 16
  const haAgenteCal = !!c.agente_calciatore_nome
  ctx.page.drawRectangle({ x: ctx.ML, y: y - 2, width: 9, height: 9, borderColor: rgb(0, 0, 0), borderWidth: 0.5, color: haAgenteCal ? rgb(0, 0, 0) : rgb(1, 1, 1) })
  ctx.t('CHE SI È AVVALSO DEI SERVIZI DI', ctx.ML + 14, y + 5, 8.5, ctx.fontR)
  y -= 12
  ctx.t(`"${blank(c.agente_calciatore_nome, 'COGNOME E NOME DELL\'AGENTE SPORTIVO')}"`, ctx.ML + 14, y, 8.5, ctx.fontR)
  y -= 12
  ctx.t(`N. DI ISCRIZIONE AL REGISTRO NAZIONALE ${blank(c.agente_calciatore_reg)}`, ctx.ML + 14, y, 8.5, ctx.fontR)
  y -= 14
  ctx.page.drawRectangle({ x: ctx.ML, y: y - 2, width: 9, height: 9, borderColor: rgb(0, 0, 0), borderWidth: 0.5, color: !haAgenteCal ? rgb(0, 0, 0) : rgb(1, 1, 1) })
  ctx.t('CHE NON SI È AVVALSO DEI SERVIZI DI UN AGENTE SPORTIVO', ctx.ML + 14, y + 5, 8.5, ctx.fontR)
  y -= 22

  // Art. 1
  ctx.t('ART.1', ctx.ML, y, 9.5, ctx.fontB)
  const art1b = `Il Calciatore si impegna, nella sua qualità di tesserato della FIGC, a prestare la propria attività atletica ed agonistica in favore della Società a decorrere dal ${dataInizio} e sino al ${dataFine}, con inizio dell'attività lavorativa alla data del ${dataInizio}.`
  y = ctx.para(art1b, ctx.ML + 32, y, ctx.COL - 32, 9.5, ctx.fontR)

  /* ── PAGINA 2 ─────────────────────────────────────────────────── */
  ctx.newPage()
  y = ctx.y

  ctx.t('ART.2', ctx.ML, y, 9.5, ctx.fontB)
  ctx.t(' La Società si obbliga a corrispondere al Calciatore le seguenti retribuzioni lorde:', ctx.ML + 32, y, 9.5, ctx.fontR)
  y -= 20

  // a) retribuzione fissa
  ctx.t('a)', ctx.ML + 10, y, 9.5, ctx.fontB)
  ctx.t('RETRIBUZIONE FISSA', ctx.ML + 24, y, 9.5, ctx.fontB)
  y -= 16
  ctx.t(`Stagione sportiva ${stagione}  `, ctx.ML + 14, y, 9.5, ctx.fontR)
  const startXret = ctx.ML + 14 + ctx.fontR.widthOfTextAtSize(`Stagione sportiva ${stagione}  `, 9.5)
  ctx.t(retLorda, startXret, y, 9.5, ctx.fontR)
  y -= 4; ctx.hline(y, ctx.ML + 14, ctx.W - ctx.MR, 0.3)
  y -= 12

  if (premi.length > 0) {
    ctx.t('b)', ctx.ML + 10, y, 9.5, ctx.fontB)
    ctx.t('RETRIBUZIONE VARIABILE', ctx.ML + 24, y, 9.5, ctx.fontB)
    y -= 16
    for (const p of premi) {
      if (y < ctx.MB + 30) { ctx.newPage(); y = ctx.y }
      const lineP = `• ${p.tipo}: ${p.condizione} — € ${fmtEuro(p.importo)}`
      y = ctx.para(lineP, ctx.ML + 14, y, ctx.COL - 14, 9.5, ctx.fontR, 14)
    }
    y -= 10
  }

  // c) partecipazione promo-pubblicitarie
  ctx.t('c)', ctx.ML + 10, y, 9.5, ctx.fontB)
  ctx.t('PARTECIPAZIONE ALLE INIZIATIVE PROMO-PUBBLICITARIE DELLA SOCIETÀ', ctx.ML + 24, y, 9.5, ctx.fontB)
  y -= 16
  ctx.page.drawRectangle({ x: ctx.ML + 14, y: y - 2, width: 9, height: 9, borderColor: rgb(0, 0, 0), borderWidth: 0.5, color: rgb(0, 0, 0) })
  ctx.t('Compresa nella retribuzione sub a)', ctx.ML + 28, y + 5, 9, ctx.fontR)
  y -= 24

  // Art. 3
  ctx.t('ART.3', ctx.ML, y, 9.5, ctx.fontB)
  y -= 15
  const art3b = 'Le parti, con la sottoscrizione del presente contratto di prestazione sportiva, recepiscono e si impegnano a rispettare integralmente le pattuizioni contenute nell\'Accordo Collettivo vigente (suo testo e suoi Allegati), tra le quali, non esaustivamente, le seguenti previsioni: art. 2.2. (limiti al patto di opzione); artt. 3.1-3.4 (obblighi di deposito del Contratto e delle Altre Scritture); artt. 3.3 e 3.5 (necessità dell\'approvazione del Contratto e delle Altre Scritture); art. 5.1 (onnicomprensività della retribuzione); artt. 8.1-8.2 (divieto di svolgimento di altra attività sportiva e attività diversa, se incompatibile); artt. 11.1-11.7 (inadempimenti, clausole penali, ammonizione, multa, riduzione della retribuzione); artt. 15.1-15.7 (inidoneità, inabilità, durate, effetti e cause). Le parti si impegnano altresì all\'osservanza dei futuri Accordi Collettivi.'
  y = ctx.para(art3b, ctx.ML + 32, y, ctx.COL - 32, 9, ctx.fontR, 13)

  /* ── PAGINA 3 ─────────────────────────────────────────────────── */
  ctx.newPage()
  y = ctx.y

  // Art. 4
  ctx.t('ART.4', ctx.ML, y, 9.5, ctx.fontB)
  y -= 15
  const art4b = 'La soluzione di tutte le controversie aventi ad oggetto l\'interpretazione, l\'esecuzione o la risoluzione del Contratto o delle Altre Scritture, così come tutte le controversie comunque riconducibili al rapporto tra la Società e il Calciatore sono deferite al Collegio Arbitrale, che si pronuncerà nei modi, nei tempi e secondo le previsioni del relativo Regolamento, che costituisce allegato dell\'Accordo Collettivo.'
  y = ctx.para(art4b, ctx.ML + 32, y, ctx.COL - 32, 9, ctx.fontR, 13)
  y -= 10

  // Art. 5
  ctx.t('ART.5', ctx.ML, y, 9.5, ctx.fontB)
  y -= 15
  const art5b = 'Con la sottoscrizione del presente Contratto, le parti si obbligano, in ragione della comune appartenenza all\'ordinamento settoriale sportivo e dei vincoli conseguentemente assunti con il tesseramento o l\'affiliazione: ad osservare le norme dello Statuto e quelle regolamentari federali; ad accettare la piena e definitiva efficacia di qualsiasi provvedimento adottato dalla FIGC, dai suoi Organi e soggetti delegati nelle materie comunque riconducibili allo svolgimento dell\'attività federale, ivi comprese le relative vertenze di carattere tecnico e disciplinare, nonché delle decisioni del Collegio Arbitrale, dichiarando in particolare di accettare senza riserve la clausola compromissoria di cui all\'art. 30 dello Statuto della FIGC.'
  y = ctx.para(art5b, ctx.ML + 32, y, ctx.COL - 32, 9, ctx.fontR, 13)
  y -= 10

  // Art. 6
  ctx.t('ART.6', ctx.ML, y, 9.5, ctx.fontB)
  y -= 15
  const art6b = 'A tutti gli effetti del presente contratto la Società elegge domicilio presso la propria sede, il Calciatore nel luogo indicato in epigrafe, salvo variazioni delle quali dovrà essere data comunicazione scritta alla Società e alla Lega. Fino al ricevimento della comunicazione esplica i suoi effetti il domicilio indicato nel presente contratto.'
  y = ctx.para(art6b, ctx.ML + 32, y, ctx.COL - 32, 9, ctx.fontR, 13)
  y -= 24

  // Prima firma
  ctx.t('Luogo ......................................, data ..............................', ctx.ML, y, 9.5, ctx.fontR)
  y -= 24
  const halfW = ctx.COL / 2 - 10
  ctx.t('Per la Società', ctx.ML + halfW / 2 - 20, y, 9.5, ctx.fontR)
  ctx.t('Il Calciatore', ctx.ML + halfW + 20 + halfW / 2 - 20, y, 9.5, ctx.fontR)
  y -= 4
  ctx.hline(y, ctx.ML, ctx.ML + halfW)
  ctx.hline(y, ctx.ML + halfW + 20, ctx.W - ctx.MR)
  y -= 26

  // Approvazione specifica
  const approvB = 'Le parti dichiarano di aver preso piena e consapevole cognizione del contenuto delle clausole previste dagli artt. 3, 4, 5 e 6 del presente contratto e le approvano specificamente con espressa sottoscrizione.'
  y = ctx.para(approvB, ctx.ML, y, ctx.COL, 9.5, ctx.fontR, 13)
  y -= 16

  ctx.t('Luogo ......................................, data ..............................', ctx.ML, y, 9.5, ctx.fontR)
  y -= 24
  ctx.t('Per la Società', ctx.ML + halfW / 2 - 20, y, 9.5, ctx.fontR)
  ctx.t('Il Calciatore', ctx.ML + halfW + 20 + halfW / 2 - 20, y, 9.5, ctx.fontR)
  y -= 4
  ctx.hline(y, ctx.ML, ctx.ML + halfW)
  ctx.hline(y, ctx.ML + halfW + 20, ctx.W - ctx.MR)
  y -= 30

  // N.B.
  const nbB = 'N.B.: il presente contratto deve essere redato in due esemplari, di cui uno deve essere depositato a cura della Società presso la Lega entro il settimo giorno successivo alla data di stipula. L\'ulteriore copia del contratto sottoscritta deve essere consegnata al Calciatore al momento della stipula.'
  y = ctx.para(nbB, ctx.ML, y, ctx.COL, 8.5, ctx.fontI, 12)

  if (c.clausola_rescissoria) {
    y -= 12
    ctx.t(`Clausola rescissoria pattuita: € ${fmtEuro(c.clausola_rescissoria)}`, ctx.ML, y, 9, ctx.fontR)
  }

  return doc.save()
}

/* ─── Route handler ──────────────────────────────────────────────── */

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getClubFromSession()
    console.log('[PDF] ctx:', ctx ? `clubId=${ctx.clubId}` : 'null')
    if (!ctx) return new NextResponse('Non autorizzato', { status: 401 })

    const supabase = createAdminClient()
    const { data: club, error: clubErr } = await supabase
      .from('clubs')
      .select('nome, categoria, citta')
      .eq('id', ctx.clubId)
      .single()

    console.log('[PDF] club:', club?.categoria, clubErr?.message)
    if (!club || !isPro(club.categoria)) {
      return new NextResponse(`403 clubId=${ctx.clubId} categoria=${club?.categoria ?? 'null'} err=${clubErr?.message ?? ''}`, { status: 403 })
    }

    const { data: contratto, error: contrErr } = await supabase
      .from('contratti_professionisti')
      .select('*')
      .eq('id', params.id)
      .eq('club_id', ctx.clubId)
      .maybeSingle()

    console.log('[PDF] contratto:', contratto?.id ?? 'null', contrErr?.message)
    if (!contratto) return new NextResponse('Non trovato', { status: 404 })

    const categoria = club.categoria ?? ''
    const bytes = categoria === 'serie_b' || categoria === 'serie_a'
      ? await buildSerieB(contratto, club)
      : await buildLegaPro(contratto, club)

    const nomeFile = `contratto_${contratto.cognome_tesserato ?? 'tesserato'}_${contratto.data_scadenza ?? ''}.pdf`.replace(/\s+/g, '_')

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nomeFile}"`,
      },
    })
  } catch (err: any) {
    console.error('[PDF] errore:', err)
    return new NextResponse(`Errore interno: ${err?.message ?? 'unknown'}`, { status: 500 })
  }
}
