import { getUserContext } from '@/lib/impersonation'
import { redirect } from 'next/navigation'
import VistaDisponibilita from '@/components/features/VistaDisponibilita'

export default async function SegretarioDisponibilitaPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  return <VistaDisponibilita clubId={ctx.clubId} ruolo="segretario" />
}
