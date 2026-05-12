// src/app/api/gruppi/[id]/membri/route.ts
// Restituisce i membri di un gruppo con dati anagrafici completi.
// Carica tutti i giocatori/utenti senza .in() per evitare limiti URL API gateway.

import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createAdminClient()
  const gruppoId = params.id

  if (!gruppoId) {
    return Response.json({ error: 'gruppo_id mancante' }, { status: 400 })
  }

  // ── 1. Righe bridge per questo gruppo ─────────────────────────────────────
  const { data: membri, error: errMembri } = await supabase
    .from('gruppi_membri')
    .select('id, gruppo_id, giocatore_id, utente_id, ruolo_nel_gruppo, data_ingresso')
    .eq('gruppo_id', gruppoId)
    .order('data_ingresso', { ascending: true })

  if (errMembri) {
    return Response.json({ error: errMembri.message }, { status: 500 })
  }
  if (!membri || membri.length === 0) {
    return Response.json([])
  }

  // ── 2. Carica TUTTI i giocatori e utenti (evita .in() con URL lungo) ───────
  const { data: tuttiGiocatori } = await supabase
    .from('giocatori')
    .select('id, nome, cognome, ruolo_principale, numero_maglia, data_nascita')

  const { data: tuttiUtenti } = await supabase
    .from('utenti')
    .select('id, nome, cognome, ruolo, email')

  // ── 3. Mappa id → oggetto ──────────────────────────────────────────────────
  const gMap: Record<string, any> = {}
  for (const g of tuttiGiocatori ?? []) gMap[g.id] = g

  const uMap: Record<string, any> = {}
  for (const u of tuttiUtenti ?? []) uMap[u.id] = u

  // ── 4. Arricchisci ogni riga ───────────────────────────────────────────────
  return Response.json(membri.map(m => ({
    ...m,
    giocatore: m.giocatore_id ? (gMap[m.giocatore_id] ?? null) : null,
    utente:    m.utente_id    ? (uMap[m.utente_id]    ?? null) : null,
  })))
}
