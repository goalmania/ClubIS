import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/impersonation'
import MessaggiView from '@/components/features/MessaggiView'

export default async function PresidenteMessaggiPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  return <MessaggiView clubId={ctx.clubId} ruolo={ctx.ruolo} />
}
