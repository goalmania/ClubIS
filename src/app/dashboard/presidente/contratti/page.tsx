import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/impersonation'
import ContrattiView from '@/components/features/ContrattiView'

export default async function PresidenteContrattiPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  redirect('/dashboard/presidente')
}
