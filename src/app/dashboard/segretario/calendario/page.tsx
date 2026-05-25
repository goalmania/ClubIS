import { getUserContext } from '@/lib/impersonation'
import { redirect } from 'next/navigation'
import TeamManagerCalendario from '../../team-manager/calendario/TeamManagerCalendario'

export default async function SegretarioCalendarioPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  return <TeamManagerCalendario />
}
