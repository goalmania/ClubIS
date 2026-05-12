import type { RisultatoTuttocampo } from '@/lib/tuttocampo'

// ── GET: tenta fetch automatico ──────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (!url || !url.includes('tuttocampo.it')) {
    return Response.json({ error: 'URL non valido' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9',
      },
      next: { revalidate: 300 },
    })

    // Tuttocampo usa AWS WAF: blocca le richieste server-side con 202 challenge
    if (res.status === 202) {
      return Response.json({ risultati: [], waf: true })
    }
    if (!res.ok) {
      return Response.json({ risultati: [], errore: `Tuttocampo ha risposto con ${res.status}`, waf: res.status === 403 })
    }

    const html = await res.text()
    // Se la risposta è vuota o troppo corta, è ancora un blocco WAF
    if (html.length < 5000) {
      return Response.json({ risultati: [], waf: true })
    }

    const risultati = parseTuttocampoHtml(html)
    return Response.json({ risultati })
  } catch {
    return Response.json({ risultati: [], errore: 'Impossibile raggiungere Tuttocampo' })
  }
}

// ── POST: analizza HTML incollato dall'utente ─────────────────────────
export async function POST(req: Request) {
  try {
    const { html } = await req.json()
    if (!html || typeof html !== 'string') {
      return Response.json({ error: 'HTML mancante' }, { status: 400 })
    }
    const risultati = parseTuttocampoHtml(html)
    return Response.json({ risultati })
  } catch {
    return Response.json({ error: 'Errore nel parsing' }, { status: 500 })
  }
}

// ── Parser ────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 20)
}

function buildId(data: string, casa: string, ospite: string): string {
  const parts = data.split('/')
  const ymd = parts.length === 3 ? `${parts[2]}${parts[1]}${parts[0]}` : data.replace(/\D/g, '')
  return `${ymd}_${slugify(casa)}_${slugify(ospite)}`
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '-').replace(/&#\d+;/g, '').replace(/\s+/g, ' ').trim()
}

function parseTuttocampoHtml(html: string): RisultatoTuttocampo[] {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')

  // ── Strategia 1: struttura nota di Tuttocampo ──────────────────────
  // Il calendar PHP rende: <table class="table-results">
  //   <tr class="match" data-link="/...">
  //     <td>giornata</td><td>DD/MM</td><td>HH:MM</td><td>Casa</td><td>N-N</td><td>Ospite</td>
  //   </tr>
  // La struttura può variare (a volte giornata mancante, a volte anno presente)
  const matchRows = [...clean.matchAll(/<tr[^>]*class="[^"]*match[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi)]

  if (matchRows.length > 0) {
    const risultati: RisultatoTuttocampo[] = []
    for (const [, rowInner] of matchRows) {
      const cells = [...rowInner.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
        .map(m => stripHtml(m[1]))
        .filter(t => t.length > 0)

      if (cells.length < 3) continue

      // Trova la cella con la data
      const dataIdx = cells.findIndex(t => /^\d{2}\/\d{2}/.test(t))
      if (dataIdx === -1) continue

      const rawData = cells[dataIdx]
      const data = rawData.length === 5
        ? rawData + '/' + new Date().getFullYear()
        : rawData

      // Score: cella con N-N o - (partita non ancora giocata)
      const scoreIdx = cells.findIndex(t => /^\d+\s*[-–]\s*\d+$/.test(t) || /^[-–]$/.test(t))

      let golCasa: number | null = null
      let golOspite: number | null = null
      let squadraCasa = ''
      let squadraOspite = ''

      if (scoreIdx > 0) {
        const scoreText = cells[scoreIdx].trim()
        if (/^\d/.test(scoreText)) {
          const sm = scoreText.match(/(\d+)\s*[-–]\s*(\d+)/)
          if (sm) { golCasa = parseInt(sm[1]); golOspite = parseInt(sm[2]) }
        }
        squadraCasa = cells[scoreIdx - 1] ?? ''
        squadraOspite = cells[scoreIdx + 1] ?? ''
      } else {
        // Nessun risultato: prendi i testi non-numerici/non-data/non-ora
        const textCells = cells.filter(t =>
          t.length > 2 &&
          !/^\d{1,2}$/.test(t) &&
          !/^\d{2}\/\d{2}/.test(t) &&
          !/^\d{2}:\d{2}$/.test(t)
        )
        squadraCasa = textCells[0] ?? ''
        squadraOspite = textCells[1] ?? ''
      }

      if (!squadraCasa || !squadraOspite || squadraCasa === squadraOspite) continue
      if (squadraCasa.length > 60 || squadraOspite.length > 60) continue

      // Giornata: prima cella numerica prima della data
      const giornata = dataIdx > 0 && /^\d{1,2}$/.test(cells[dataIdx - 1])
        ? cells[dataIdx - 1]
        : null

      risultati.push({
        data,
        squadraCasa,
        squadraOspite,
        golCasa,
        golOspite,
        competizione: '',
        giornata,
        tuttocampoId: buildId(data, squadraCasa, squadraOspite),
      })
    }
    if (risultati.length > 0) return deduplica(risultati)
  }

  // ── Strategia 2: tr generico con data + squadre + risultato ──────────
  const risultati: RisultatoTuttocampo[] = []
  const rows = clean.split(/<tr[\s\S]*?>/i).slice(1)

  for (const row of rows) {
    const dataMatch = row.match(/\b(\d{2}\/\d{2}(?:\/\d{4})?)\b/)
    if (!dataMatch) continue

    const data = dataMatch[1].length === 5
      ? dataMatch[1] + '/' + new Date().getFullYear()
      : dataMatch[1]

    const tdTexts = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(m => stripHtml(m[1]))
      .filter(t => t.length > 0)

    if (tdTexts.length < 2) continue

    const scoreIdx = tdTexts.findIndex(t => /^\d+\s*[-–]\s*\d+$/.test(t.trim()))
    if (scoreIdx < 1) continue

    const sm = tdTexts[scoreIdx].match(/(\d+)\s*[-–]\s*(\d+)/)
    const squadraCasa = tdTexts[scoreIdx - 1] ?? ''
    const squadraOspite = tdTexts[scoreIdx + 1] ?? ''

    if (!squadraCasa || !squadraOspite || squadraCasa === squadraOspite) continue
    if (squadraCasa.length > 60 || squadraOspite.length > 60) continue

    risultati.push({
      data,
      squadraCasa,
      squadraOspite,
      golCasa: sm ? parseInt(sm[1]) : null,
      golOspite: sm ? parseInt(sm[2]) : null,
      competizione: '',
      giornata: null,
      tuttocampoId: buildId(data, squadraCasa, squadraOspite),
    })
  }

  return deduplica(risultati)
}

function deduplica(arr: RisultatoTuttocampo[]): RisultatoTuttocampo[] {
  const seen = new Set<string>()
  return arr.filter(r => {
    const key = r.tuttocampoId ?? `${r.data}_${r.squadraCasa}_${r.squadraOspite}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
