import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/impersonation'
import AccreditiPartita from '@/components/features/AccreditiPartita'

export default async function AccreditiUfficioStampaPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  if (ctx.ruolo !== 'ufficio_stampa' && ctx.ruolo !== 'segretario' && ctx.ruolo !== 'presidente' && !ctx.isSuperAdmin)
    redirect('/dashboard')

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
          Accrediti
        </h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          Richiedi e monitora gli accrediti stampa e media per le gare
        </p>
      </div>

      <AccreditiPartita
        ruolo={ctx.ruolo}
        titoloPagina="Accrediti Media"
        mostraFiltroPartita
      />
    </div>
  )
}
