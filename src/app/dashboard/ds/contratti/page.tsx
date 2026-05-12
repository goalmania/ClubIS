import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/impersonation'
import ContrattiView from '@/components/features/ContrattiView'
import ServerFeatureGate from '@/components/ServerFeatureGate'

export default async function DsContrattiPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  if (ctx.ruolo === 'presidente') redirect('/dashboard/presidente')
  return (
    <ServerFeatureGate feature="contratti_tesserati" featureLabel="Contratti Tesserati">
      <ContrattiView clubId={ctx.clubId} ruolo={ctx.ruolo} />
    </ServerFeatureGate>
  )
}
