import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamManagerCalendario from './TeamManagerCalendario'

export default async function TMCalendarioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return <TeamManagerCalendario />
}
