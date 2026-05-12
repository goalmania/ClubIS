import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/impersonation'
import ContrattiView from '@/components/features/ContrattiView'

export default async function SegretarioContrattiPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  return <ContrattiView clubId={ctx.clubId} ruolo={ctx.ruolo} />
}
