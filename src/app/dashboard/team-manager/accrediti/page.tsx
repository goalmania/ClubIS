import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/impersonation'
import AccreditiPartita from '@/components/features/AccreditiPartita'

export default async function TeamManagerAccreditiPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  if (ctx.ruolo !== 'team_manager' && !ctx.isSuperAdmin) redirect('/dashboard')

  return (
    <div data-onboarding="section-accrediti-tm">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)',
        }}>
          Accrediti
        </h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          Gestisci gli accrediti per le gare: media, ospiti VIP, sponsor e collaboratori
        </p>
      </div>

      <AccreditiPartita
        ruolo={ctx.ruolo}
        titoloPagina="Lista Accrediti"
        mostraFiltroPartita
      />
    </div>
  )
}
