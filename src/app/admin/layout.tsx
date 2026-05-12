import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/layout/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utente } = await supabase
    .from('utenti')
    .select('nome, cognome, ruolo, is_super_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!utente?.is_super_admin) redirect('/dashboard')

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar utente={{ nome: utente.nome, cognome: utente.cognome }} />
      <main style={{
        flex: 1,
        padding: '28px 32px',
        overflowY: 'auto',
        maxWidth: '100%',
        background: 'var(--grigio-6)',
        minHeight: '100vh',
      }}>
        {children}
      </main>
    </div>
  )
}
