import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/cis/calendario/eventi-giocatore
 * Prossimi eventi del Calendario (eventi_calendario) in cui il giocatore
 * loggato è partecipante selezionato (direttamente o tramite la sua squadra).
 * I giocatori non hanno una riga in "utenti", quindi my_club_id()/RLS non li
 * copre: si risolve l'identità qui e si legge con l'admin client, come già
 * fatto per la stessa esigenza in dashboard/famiglia/calendario.
 */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()

  const { data: giocatore } = await admin
    .from('giocatori')
    .select('id, club_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!giocatore) return NextResponse.json({ events: [] })

  const { data: tess } = await admin
    .from('tesseramenti')
    .select('squadra_id, club_id')
    .eq('giocatore_id', giocatore.id)
    .eq('stato', 'attivo')
    .maybeSingle()

  const clubId = tess?.club_id ?? giocatore.club_id
  const squadraId = tess?.squadra_id ?? null

  const orFilter = squadraId
    ? `giocatore_id.eq.${giocatore.id},squadra_id.eq.${squadraId}`
    : `giocatore_id.eq.${giocatore.id}`

  const { data: partecipazioni } = await admin
    .from('eventi_partecipanti')
    .select('evento_id')
    .eq('club_id', clubId)
    .or(orFilter)

  const eventoIds = [...new Set((partecipazioni ?? []).map(p => p.evento_id))]
  if (eventoIds.length === 0) return NextResponse.json({ events: [] })

  const oggi = new Date()
  const tra14 = new Date(oggi); tra14.setDate(oggi.getDate() + 14)

  const { data: eventi } = await admin
    .from('eventi_calendario')
    .select('id, tipologia, data_ora_inizio, luogo_testo, note')
    .in('id', eventoIds)
    .gte('data_ora_inizio', oggi.toISOString())
    .lte('data_ora_inizio', tra14.toISOString())
    .order('data_ora_inizio')
    .limit(10)

  return NextResponse.json({ events: eventi ?? [] })
}
