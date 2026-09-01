import { createAdminClient } from '@/lib/supabase/admin'
import { getClubFromSession } from '@/lib/server-helpers'
import { NextResponse } from 'next/server'

/**
 * Scade automaticamente le squalifiche attive la cui data_fine è nel passato.
 * Chiamata dal monitor squalifiche ad ogni caricamento pagina.
 * Non sovrascrive dati: imposta solo stato='scaduta' sui record già scaduti.
 */
export async function POST() {
  const session = await getClubFromSession()
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const supabase  = createAdminClient()
  const clubId    = session.clubId
  const today     = new Date().toISOString().split('T')[0]

  // 1. Scade per data_fine nel passato
  const { data: scadutePerData, error: e1 } = await supabase
    .from('squalifiche')
    .update({
      stato:      'scaduta',
      scaduta_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('club_id', clubId)
    .eq('stato', 'attiva')
    .not('data_fine', 'is', null)
    .lt('data_fine', today)
    .select('id, giocatore_id')

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

  // 2. Scade per giornate_rimanenti <= 0 (sicurezza extra)
  const { data: scadutePerGiornate, error: e2 } = await supabase
    .from('squalifiche')
    .update({
      stato:      'scaduta',
      scaduta_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('club_id', clubId)
    .eq('stato', 'attiva')
    .not('giornate_rimanenti', 'is', null)
    .lte('giornate_rimanenti', 0)
    .select('id, giocatore_id')

  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

  const totale = (scadutePerData?.length ?? 0) + (scadutePerGiornate?.length ?? 0)

  return NextResponse.json({
    ok:      true,
    scadute: totale,
    per_data:     scadutePerData?.length ?? 0,
    per_giornate: scadutePerGiornate?.length ?? 0,
  })
}
