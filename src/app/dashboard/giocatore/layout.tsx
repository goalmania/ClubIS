import { getUserContext } from '@/lib/impersonation'
import { redirect } from 'next/navigation'

/**
 * Layout per /dashboard/giocatore/*.
 * Protegge l'area: solo utenti con ruolo effettivo 'giocatore' possono accedervi
 * (incluso un super admin in modalità impersonation come giocatore).
 */
export default async function GiocatoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  if (ctx.ruolo !== 'giocatore') redirect('/dashboard')

  return <>{children}</>
}
