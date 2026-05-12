import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { readImpersonation } from '@/lib/impersonation'

export default async function DashboardRedirect() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utente } = await supabase
    .from('utenti')
    .select('ruolo, is_super_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!utente) redirect('/auth/errore')

  // Impersonation override (solo per super admin)
  const impersonation = utente.is_super_admin ? readImpersonation() : null
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
