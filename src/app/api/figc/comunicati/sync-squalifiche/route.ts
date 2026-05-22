import { createAdminClient } from '@/lib/supabase/admin'
import { getClubFromSession } from '@/lib/server-helpers'
import { NextResponse } from 'next/server'

/**
 * Ripara squalifiche salvate con club_id errato (bug impersonation).
 * Legge le squalifiche_comunicato confermate per questo club e,
 * per ogni giocatore, aggiorna il club_id delle righe nella tabella squalifiche
 * che abbiano giocatore_id corretto ma club_id diverso.
 */
export async function POST() {
  const session = await getClubFromSession()
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const supabase = createAdminClient()
  const clubId = session.clubId

  // 1. Tutte le squalifiche_comunicato confermate di tipo non-ammenda per questo club
  const { data: confermate, error: e1 } = await supabase
    .from('squalifiche_comunicato')
    .select('giocatore_id, comunicato_id, tipo_sanzione')
    .eq('club_id', clubId)
    .eq('confermato', true)
    .neq('tipo_sanzione', 'ammenda')
    .not('giocatore_id', 'is', null)

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })
  if (!confermate || confermate.length === 0) return NextResponse.json({ fixed: 0 })

  const giocatoreIds = [...new Set(confermate.map((c: any) => c.giocatore_id as string))]

  // 2. Trova squalifiche per questi giocatori con club_id sbagliato
  const { data: orphans, error: e2 } = await supabase
    .from('squalifiche')
    .select('id, giocatore_id, club_id')
    .in('giocatore_id', giocatoreIds)
    .neq('club_id', clubId)

  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
  if (!orphans || orphans.length === 0) return NextResponse.json({ fixed: 0 })

  const orphanIds = orphans.map((o: any) => o.id as string)

  // 3. Aggiorna club_id al valore corretto
  const { error: e3 } = await supabase
    .from('squalifiche')
    .update({ club_id: clubId })
    .in('id', orphanIds)

  if (e3) return NextResponse.json({ error: e3.message }, { status: 500 })

  return NextResponse.json({ fixed: orphanIds.length })
}
