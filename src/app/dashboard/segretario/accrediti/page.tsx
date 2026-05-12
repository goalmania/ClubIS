import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/impersonation'
import AccreditiPartita from '@/components/features/AccreditiPartita'

const RUOLI_CONSENTITI = ['segretario', 'presidente', 'ds', 'team_manager', 'ufficio_stampa']

export default async function AccreditiPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  if (!RUOLI_CONSENTITI.includes(ctx.ruolo) && !ctx.isSuperAdmin) redirect('/dashboard')

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
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
