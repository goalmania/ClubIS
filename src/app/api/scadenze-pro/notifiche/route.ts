/**
 * POST /api/scadenze-pro/notifiche
 * Controlla le scadenze in avvicinamento per il club corrente e invia
 * notifiche interne a presidente e segretario.
 * Chiamato dal client al caricamento della pagina compliance (max 1×/giorno).
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubFromSession } from '@/lib/server-helpers'
import { NextResponse } from 'next/server'
import { notificaRuolo } from '@/lib/notifiche'
import { isPro } from '@/lib/categorie-club'

const SOGLIE = [15, 7, 2] // giorni prima

export async function POST() {
  const session = await getClubFromSession()
  if (!session) return NextResponse.json({ ok: false }, { status: 401 })

  const supabase = createAdminClient()
  const { data: club } = await supabase.from('clubs').select('categoria').eq('id', session.clubId).single()
  if (!club || !isPro(club.categoria)) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  const oggi = new Date()
  const maxGiorni = Math.max(...SOGLIE)
  const maxData = new Date(oggi.getTime() + maxGiorni * 86400000).toISOString().split('T')[0]

  const { data: scadenze } = await supabase
    .from('scadenze_federali_pro')
    .select('id, descrizione, data_scadenza, stato, categoria_scadenza')
    .eq('club_id', session.clubId)
    .neq('stato', 'completata')
    .lte('data_scadenza', maxData)
    .gte('data_scadenza', oggi.toISOString().split('T')[0])

  if (!scadenze?.length) return NextResponse.json({ ok: true, notificate: 0 })

  let notificate = 0
  for (const s of scadenze) {
    const dataScad = new Date(s.data_scadenza)
    const giorni = Math.ceil((dataScad.getTime() - oggi.getTime()) / 86400000)

    if (!SOGLIE.includes(giorni)) continue

    const urgenza = giorni <= 2 ? 'URGENTE' : giorni <= 7 ? 'ATTENZIONE' : 'PROMEMORIA'
    const titolo = `[${urgenza}] Scadenza federale tra ${giorni} giorni`
    const messaggio = `${s.descrizione} — scadenza il ${new Date(s.data_scadenza).toLocaleDateString('it-IT')}`

    await Promise.all([
      notificaRuolo(supabase as any, {
        club_id: session.clubId, ruolo: 'presidente',
        tipo: 'alert_sistema', titolo, messaggio,
        azione_url: '/dashboard/segretario/compliance-pro',
        riferimento_id: s.id,
      }),
      notificaRuolo(supabase as any, {
        club_id: session.clubId, ruolo: 'segretario',
        tipo: 'alert_sistema', titolo, messaggio,
        azione_url: '/dashboard/segretario/compliance-pro',
        riferimento_id: s.id,
      }),
    ])
    notificate++
  }

  return NextResponse.json({ ok: true, notificate })
}
