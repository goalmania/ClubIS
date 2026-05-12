import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/impersonation'

export default async function FamigliaProfiloPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  // Per ora redirect alla home famiglia
  redirect('/dashboard/famiglia')
}
