import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { readVerifiedImpersonation } from '@/lib/impersonation'

export default async function DashboardRedirect() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utente } = await supabase
    .from('utenti')
    .select('ruolo, is_super_admin, is_demo_account')
    .eq('id', user.id)
    .maybeSingle()

  if (!utente) redirect('/auth/errore')

  // Impersonation override (super admin, o account demo verificato sul proprio club)
  const impersonation = await readVerifiedImpersonation(user.id, !!utente.is_super_admin, !!utente.is_demo_account)
  const effectiveRuolo = impersonation?.ruolo ?? utente.ruolo

  // Super admin senza impersonation → pannello admin
  if (utente.is_super_admin && !impersonation) {
    redirect('/admin')
  }

  const path = effectiveRuolo === 'team_manager'
    ? '/dashboard/team-manager'
    : effectiveRuolo === 'ufficio_stampa'
    ? '/dashboard/ufficio-stampa'
    : `/dashboard/${effectiveRuolo}`   // copre presidente, ds, segretario, allenatore,
                                       // medico, osservatore, famiglia, giocatore

  redirect(path)
}
