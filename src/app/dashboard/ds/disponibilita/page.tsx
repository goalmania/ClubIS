import { getUserContext } from '@/lib/impersonation'
import { redirect } from 'next/navigation'
import VistaDisponibilita from '@/components/features/VistaDisponibilita'

export default async function DsDisponibilitaPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  return (
    <div data-onboarding="section-disponibilita-ds">
      <VistaDisponibilita clubId={ctx.clubId} ruolo="ds" />
    </div>
  )
}
