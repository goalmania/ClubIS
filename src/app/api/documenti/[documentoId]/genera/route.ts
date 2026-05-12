import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { caricaDatiGenerazione } from '@/lib/documents/data-loader'
import { generaDocumento } from '@/lib/documents/generator-dispatcher'
import { CATALOGO_MAP, getConfigVariante } from '@/lib/documents/catalogo'

export async function POST(
  req: Request,
  { params }: { params: { documentoId: string } }
) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json()
  const { varianteId, giocatoreId, campiExtra = {} } = body

  // ── Lookup dal catalogo statico (nessuna query DB) ─────────────────────
  const doc = CATALOGO_MAP.get(params.documentoId)
  if (!doc) return Response.json({ error: 'Documento non trovato' }, { status: 404 })

  const configVariante = getConfigVariante(params.documentoId, varianteId ?? null)

  // ── Carica dati club + giocatore ───────────────────────────────────────
  const supabase = createAdminClient()
  const { societa, tesserato, genitore, importo730 } = await caricaDatiGenerazione(
    supabase as any,
    ctx.clubId,
    giocatoreId ?? undefined
  )

  if (!tesserato && giocatoreId) {
    return Response.json({ error: 'Giocatore non trovato' }, { status: 404 })
  }

  const ora     = new Date()
  const anno    = ora.getMonth() >= 7 ? ora.getFullYear() : ora.getFullYear() - 1
  const stagione = `${anno}-${String(anno + 1).slice(-2)}`

  const datiGen = {
    societa,
    tesserato: tesserato ?? { nome: '', cognome: '', data_nascita: '', is_minorenne: false },
    genitore:  genitore ?? undefined,
    stagione,
    data_oggi: new Date().toLocaleDateString('it-IT'),
    anno,
    importo:             campiExtra.importo_manuale ?? importo730,
    disciplina_sportiva: campiExtra.disciplina ?? 'Calcio',
    ...campiExtra,
  }

  const html = await generaDocumento(
    params.documentoId,
    varianteId ?? null,
    configVariante,
    datiGen,
    undefined // nessun template_html custom — tutto TypeScript
  )

  // ── Logging e stato utente (opzionale — fallback silenzioso) ───────────
  try {
    await supabase.from('documenti_generazioni_log').insert({
      utente_id:    ctx.userId,
      club_id:      ctx.clubId,
      documento_id: params.documentoId,
      variante_id:  varianteId ?? null,
      giocatore_id: giocatoreId ?? null,
      dati_usati:   { stagione, importo: datiGen.importo },
    })
  } catch { /* tabella non accessibile — ignora */ }

  try {
    await supabase.from('documenti_stato_utente').upsert({
      utente_id:    ctx.userId,
      club_id:      ctx.clubId,
      documento_id: params.documentoId,
      ultimo_uso:   new Date().toISOString(),
    }, { onConflict: 'utente_id,documento_id' })

    await supabase.rpc('incrementa_generazioni', {
      p_utente_id:    ctx.userId,
      p_documento_id: params.documentoId,
    })
  } catch { /* ignora */ }

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Documento-Id': params.documentoId,
    },
  })
}
