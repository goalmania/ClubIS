import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { CATALOGO_DOCUMENTI } from '@/lib/documents/catalogo'
import type { CategoriaDocumento } from '@/lib/documents/types'

export async function GET(req: Request) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const categoria = searchParams.get('categoria') as CategoriaDocumento | null
  const filtro    = searchParams.get('filtro') // 'preferiti' | 'archiviati' | null

  // ── Catalogo statico — nessuna dipendenza DB ───────────────────────────
  let catalogo = CATALOGO_DOCUMENTI
  if (categoria) {
    catalogo = catalogo.filter(d => d.categoria === categoria)
  }

  // ── Stato utente dal DB (preferiti/archiviati/contatori) ──────────────
  // Opzionale: se la tabella non è accessibile, i documenti vengono
  // comunque mostrati senza stato personalizzato.
  let statiMap = new Map<string, { is_preferito: boolean; is_archiviato: boolean; n_generazioni?: number }>()
  try {
    const supabase = createAdminClient()
    const { data: stati } = await supabase
      .from('documenti_stato_utente')
      .select('documento_id, is_preferito, is_archiviato, ultimo_uso, n_generazioni')
      .eq('utente_id', ctx.userId)
    statiMap = new Map(stati?.map(s => [s.documento_id, s]) ?? [])
  } catch {
    // tabella non accessibile — continua senza stato personalizzato
  }

  // ── Assembla risultato ─────────────────────────────────────────────────
  let risultato = catalogo.map(d => ({
    ...d,
    documenti_varianti: d.varianti ?? [],
    stato: statiMap.get(d.id) ?? { is_preferito: false, is_archiviato: false },
  }))

  if (filtro === 'preferiti') {
    risultato = risultato.filter(d => d.stato.is_preferito && !d.stato.is_archiviato)
  } else if (filtro === 'archiviati') {
    risultato = risultato.filter(d => d.stato.is_archiviato)
  } else {
    risultato = risultato.filter(d => !d.stato.is_archiviato)
  }

  return Response.json({ documenti: risultato })
}
