/**
 * Estrattore testo PDF universale.
 * Usa pdfjs-dist (legacy/Node.js build) come engine principale:
 * gestisce FlateDecode, ASCII85Decode, LZWDecode, CID/Type0 fonts,
 * ToUnicode CMaps, testo ruotato — tutti i casi reali.
 *
 * Fallback: parser custom zero-dipendenze per PDF semplici.
 */
import path from 'path'
import { inflateSync, inflateRawSync } from 'zlib'

/* ── pdfjs-dist (engine principale) ─────────────────────────────────── */

export async function extractPDFText(pdfBuffer: Buffer): Promise<string> {
  try {
    // Import dinamico per evitare problemi di bundling SWC
    const pdfjsModule = await import(
      /* webpackIgnore: true */ 'pdfjs-dist/legacy/build/pdf.mjs'
    )
    const { getDocument, GlobalWorkerOptions } = pdfjsModule as any

    // Worker path per Node.js — process.cwd() è la root del progetto
    GlobalWorkerOptions.workerSrc = path.join(
      process.cwd(),
      'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
    )

    const data = new Uint8Array(pdfBuffer)
    const pdf = await getDocument({
      data,
      useWorkerFetch:  false,
      isEvalSupported: false,
      useSystemFonts:  true,
      disableRange:    true,
      disableStream:   true,
      verbosity:       0,        // silenzia warning nella console
    }).promise

    const parts: string[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page    = await pdf.getPage(i)
      const content = await page.getTextContent()

      // Group items by y-coordinate (tolerance 2pt) to reconstruct visual lines.
      // Items at the same y are sorted by x and joined → handles 2-column layouts.
      const Y_TOL = 2
      const rows = new Map<number, Array<{ x: number; str: string }>>()

      for (const item of content.items as any[]) {
        if (!('str' in item) || !item.str) continue
        const x = item.transform?.[4] ?? 0
        const y = item.transform?.[5] ?? 0

        // Find existing row key within tolerance (or create a new one)
        let rowKey = y as number
        let found = false
        for (const k of rows.keys()) {
          if (Math.abs(k - y) <= Y_TOL) { rowKey = k; found = true; break }
        }
        if (!found) rows.set(rowKey, [])
        rows.get(rowKey)!.push({ x, str: item.str })
      }

      // Sort rows by descending y (PDF y increases upward; top of page = high y)
      const sortedRows = [...rows.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, cells]) =>
          cells
            .sort((a, b) => a.x - b.x)
            .map(c => c.str)
            .join(' ')
            .replace(/\s{2,}/g, '  ')  // preserve column gap as 2 spaces
            .trim()
        )
        .filter(l => l.length > 0)

      if (sortedRows.length > 0) parts.push(sortedRows.join('\n'))
    }

    return parts.join('\n')
  } catch {
    // Fallback al parser custom (FlateDecode + ASCII85)
    return extractPDFTextFallback(pdfBuffer)
  }
}

/* ── Fallback: parser custom zero-dipendenze ─────────────────────────── */

function pdfUnescape(s: string): string {
  return s.replace(/\\([\\u](?:[0-9a-fA-F]{4})?|\d{3}|[nrt()]|\r?\n|[\s\S])/g, (_, c: string) => {
    if (c === '\\') return '\\'
    if (c[0] === 'u' && c.length === 5) return String.fromCharCode(parseInt(c.slice(1), 16))
    if (/^\d{3}$/.test(c)) return String.fromCharCode(parseInt(c, 8))
    if (c === 'n') return '\n'
    if (c === 'r') return '\r'
    if (c === 't') return '\t'
    if (c === '(') return '('
    if (c === ')') return ')'
    if (c === '\n' || c === '\r\n') return ''
    return ''
  })
}

function hexToStr(hex: string): string {
  const h = hex.replace(/\s/g, ''); let out = ''
  for (let i = 0; i < h.length; i += 2) out += String.fromCharCode(parseInt(h.slice(i, i + 2), 16))
  return out
}

function decodeASCII85(data: Buffer): Buffer {
  let s = data.toString('latin1').replace(/\s/g, '')
  const eodIdx = s.indexOf('~>'); if (eodIdx !== -1) s = s.slice(0, eodIdx)
  const out: number[] = []; let i = 0
  while (i < s.length) {
    if (s[i] === 'z') { out.push(0, 0, 0, 0); i++; continue }
    const group = s.slice(i, i + 5); const n = group.length; if (!n) break
    const padded = group.padEnd(5, 'u'); let val = 0
    for (let k = 0; k < 5; k++) val = val * 85 + (padded.charCodeAt(k) - 33)
    const bytes = [(val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8) & 0xff, val & 0xff]
    out.push(...bytes.slice(0, n === 5 ? 4 : n - 1)); i += n
  }
  return Buffer.from(out)
}

/**
 * Estrae i nomi dei filtri da un dizionario PDF.
 * Usa [A-Za-z0-9]+ per il nome del filtro (evita di catturare chiavi successive).
 */
function parseFilters(dict: string): string[] {
  const m = dict.match(/\/Filter\s*(\[([^\]]*)\]|\/([A-Za-z0-9]+))/)
  if (!m) return []
  if (m[2] !== undefined) return [...m[2].matchAll(/\/([A-Za-z0-9]+)/g)].map(x => x[1])
  return m[3] ? [m[3]] : []
}

function applyFilters(raw: Buffer, filters: string[]): Buffer | null {
  let buf: Buffer = raw
  for (const f of filters) {
    if (f === 'FlateDecode') {
      try { buf = inflateSync(buf) } catch {
        try { buf = inflateRawSync(buf) } catch { return null }
      }
    } else if (f === 'ASCII85Decode') {
      try { buf = decodeASCII85(buf) } catch { return null }
    } else if (f === 'ASCIIHexDecode') {
      const hex = buf.toString('latin1').replace(/\s/g, '').replace(/>$/, '')
      const bytes: number[] = []
      for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16))
      buf = Buffer.from(bytes)
    }
    // LZWDecode, RunLengthDecode ecc. → lascia il buffer invariato e continua
  }
  return buf
}

function textFromStream(stream: string): string {
  const lines: string[] = []
  const btEt = /BT\b([\s\S]*?)\bET/g; let bm: RegExpExecArray | null
  while ((bm = btEt.exec(stream)) !== null) {
    const parts: string[] = []; const pend: string[] = []
    const tr = /\(([^)\\]*(?:\\[\s\S][^)\\]*)*)\)|<([0-9a-fA-F\s]+)>|\[([^\]]*)\]|(T\*|Tj|TJ|'|")/g
    let tok: RegExpExecArray | null
    while ((tok = tr.exec(bm[1])) !== null) {
      if (tok[1] !== undefined) pend.push(pdfUnescape(tok[1]))
      else if (tok[2] !== undefined) pend.push(hexToStr(tok[2]))
      else if (tok[3] !== undefined) {
        const inn = /\(([^)\\]*(?:\\[\s\S][^)\\]*)*)\)|<([0-9a-fA-F\s]+)>/g; let im: RegExpExecArray | null
        const ap: string[] = []
        while ((im = inn.exec(tok[3])) !== null) {
          if (im[1] !== undefined) ap.push(pdfUnescape(im[1]))
          else if (im[2] !== undefined) ap.push(hexToStr(im[2]))
        }
        pend.push(ap.join(''))
      } else if (tok[4]) {
        const op = tok[4]
        if (op === 'T*') { if (pend.length) { parts.push(pend.join('')); pend.length = 0 } parts.push('\n') }
        else if (op === 'Tj' || op === "'") { if (pend.length) { parts.push(pend[pend.length - 1]); if (op === "'") parts.push('\n') } pend.length = 0 }
        else if (op === 'TJ' || op === '"') { if (pend.length) parts.push(pend[pend.length - 1]); pend.length = 0 }
      }
    }
    if (pend.length) parts.push(pend.join(''))
    const t = parts.join('').trim(); if (t.length > 0) lines.push(t)
  }
  return lines.join('\n')
}

function extractPDFTextFallback(pdfBuffer: Buffer): string {
  const buf = pdfBuffer; const allTexts: string[] = []; let pos = 0
  while (pos < buf.length) {
    const streamIdx = buf.indexOf(Buffer.from('stream'), pos); if (streamIdx === -1) break
    const afterStream = streamIdx + 6
    if (buf[afterStream] !== 0x0a && !(buf[afterStream] === 0x0d && buf[afterStream + 1] === 0x0a)) { pos = streamIdx + 6; continue }
    const dataStart = buf[afterStream] === 0x0d ? afterStream + 2 : afterStream + 1
    const endIdx = buf.indexOf(Buffer.from('endstream'), dataStart); if (endIdx === -1) { pos = dataStart; continue }
    const dictRaw = buf.slice(Math.max(0, streamIdx - 2048), streamIdx).toString('latin1')
    const dictStart = dictRaw.lastIndexOf('<<'); const dict = dictStart !== -1 ? dictRaw.slice(dictStart) : ''
    if (/\/Subtype\s*\/Image/.test(dict)) { pos = endIdx + 9; continue }
    if (/\/Type\s*\/Font/.test(dict))     { pos = endIdx + 9; continue }
    const rawData = buf.slice(dataStart, endIdx > 0 && buf[endIdx - 1] === 0x0a ? endIdx - 1 : endIdx)
    const filters = parseFilters(dict)
    let content: string
    if (filters.length > 0) {
      const decoded = applyFilters(rawData, filters); if (!decoded) { pos = endIdx + 9; continue }
      content = decoded.toString('latin1')
    } else {
      let decoded: Buffer | null = null
      try { decoded = inflateSync(rawData) } catch { /* noop */ }
      if (!decoded) { try { decoded = inflateRawSync(rawData) } catch { /* noop */ } }
      content = decoded ? decoded.toString('latin1') : rawData.toString('latin1')
    }
    const text = textFromStream(content); if (text.trim().length > 5) allTexts.push(text)
    pos = endIdx + 9
  }
  return allTexts.join('\n')
}
