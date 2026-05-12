import { getUserContext } from '@/lib/impersonation'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getFamigliaCollegamenti } from '@/lib/famiglia'

/**
 * Layout per /dashboard/famiglia/*.
 * Usa getUserContext() per rispettare l'eventuale impersonation attiva.
 * Un super admin che impersona 'famiglia' passa direttamente (no DB check).
 * Un utente famiglia reale viene reindirizzato al setup se non ha collegamento.
 */
export default async function FamigliaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')

  // Ruolo effettivo diverso da famiglia → fuori area
  if (ctx.ruolo !== 'famiglia') redirect('/dashboard')

  // Super admin in impersonation: non serve verificare il collegamento famiglie
  if (ctx.isImpersonating) return <>{children}</>

  // Utente famiglia reale: verifica che abbia almeno un collegamento
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const collegamenti = await getFamigliaCollegamenti(supabase as any, user)
  if (collegamenti.length === 0) {
    redirect('/auth/famiglia-setup')
  }

  return <>{children}</>
}
