// src/app/api/gruppi/membri/route.ts
// Restituisce TUTTI i giocatori e staff del club per la gestione gruppi.
// Usato dal modal "Aggiungi membri" e "Modifica card".
// Carica direttamente senza .in() per evitare il limite URL dell'API gateway.

import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase   = createAdminClient()
  const { clubId } = ctx

  // Giocatori: tutti (senza .in() che causa URL troppo lunghi sull'API gateway)
  const { data: giocatori } = await supabase
    .from('giocatori')
    .select('id, nome, cognome, ruolo_principale, numero_maglia, data_nascita')
    .order('cognome')

  // Staff: utenti attivi del club
  const { data: staff } = await supabase
    .from('utenti')
    .select('id, nome, cognome, ruolo, email')
    .eq('club_id', clubId)
    .eq('attivo', true)
    .order('cognome')

  return Response.json({ giocatori: giocatori ?? [], staff: staff ?? [] })
}
