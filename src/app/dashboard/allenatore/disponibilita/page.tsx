import { getUserContext } from '@/lib/impersonation'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import VistaDisponibilita from '@/components/features/VistaDisponibilita'

export default async function AllenatoreDisponibilitaPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: sq } = await admin.from('squadre').select('id')
    .eq('club_id', ctx.clubId).eq('categoria_eta', 'prima_squadra').eq('attiva', true)
  const squadraIds = (sq ?? []).map(s => s.id)

  return <VistaDisponibilita clubId={ctx.clubId} ruolo="allenatore" squadraIds={squadraIds} />
}
