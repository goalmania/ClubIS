import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/impersonation'
import MessaggiView from '@/components/features/MessaggiView'

export default async function TeamManagerMessaggiPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  return <MessaggiView clubId={ctx.clubId} ruolo={ctx.ruolo} />
}
