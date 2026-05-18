import { redirect } from 'next/navigation'
import { getGiocatoriEleggibili } from '@/lib/distinta'
import { getUserContext } from '@/lib/impersonation'
import { createAdminClient } from '@/lib/supabase/admin'
import DistintaEditor from './DistintaEditor'

export default async function GeneraDistintaPage({
  params,
}: {
  params: { partita_id: string }
}) {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  const clubId = ctx.clubId

  const supabase = createAdminClient()

  const [{ data: partita }, { data: existing }, { data: allenatore }] = await Promise.all([
    supabase
      .from('partite')
      .select('id, avversario, data_ora, competizione, giornata, casa_trasferta, campo')
      .eq('id', params.partita_id)
      .eq('club_id', clubId)
      .single(),
    supabase
      .from('distinte_gara')
      .select('giocatori_snapshot, staff_snapshot')
      .eq('partita_id', params.partita_id)
      .eq('club_id', clubId)
      .order('versione', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('utenti')
      .select('nome, cognome')
      .eq('club_id', clubId)
      .eq('ruolo', 'allenatore')
      .maybeSingle(),
  ])

  if (!partita) redirect('/dashboard/segretario/distinte')

  const { eleggibili, nonEleggibili, squalificheManuale } = await getGiocatoriEleggibili(
    supabase,
    params.partita_id,
    clubId
  )

  const staffDefault = existing?.staff_snapshot ?? {
    allenatore: allenatore ? `${allenatore.nome} ${allenatore.cognome}` : '',
    vice_allenatore: '',
    medico: '',
    dirigente: '',
  }

  const preselectedIds = existing
    ? (existing.giocatori_snapshot as any[]).map((g: any) => g.id)
    : null

  return (
    <DistintaEditor
      partita={partita}
      eleggibili={eleggibili}
      nonEleggibili={nonEleggibili}
      staffDefault={staffDefault as any}
      preselectedIds={preselectedIds}
      squalificheManuale={squalificheManuale}
    />
  )
}
