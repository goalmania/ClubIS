import { getUserContext } from '@/lib/impersonation'
import { redirect } from 'next/navigation'
import CalendarioClientOnly from '../../team-manager/calendario/CalendarioClientOnly'

export default async function SegretarioCalendarioPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  return <CalendarioClientOnly />
}
