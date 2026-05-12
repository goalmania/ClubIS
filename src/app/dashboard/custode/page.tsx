import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function CustodeDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utente } = await supabase
    .from('utenti')
    .select('club_id, nome, cognome')
    .eq('id', user.id)
    .single()
  if (!utente) redirect('/auth/errore')

  const [
    { count: checklistOggi },
    { count: ticketAperti },
  ] = await Promise.all([
    supabase.from('checklist_eseguita')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', utente.club_id)
      .gte('data_esecuzione', new Date().toISOString().split('T')[0]),
    supabase.from('ticket_impianto')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', utente.club_id)
      .in('stato', ['aperto', 'in_lavorazione']),
  ])

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
          Area Custode
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Buongiorno, {utente.nome}. Gestione impianti e segnalazioni.
        </p>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Checklist oggi</div>
          <div className="stat-value" style={{ color: (checklistOggi ?? 0) > 0 ? 'var(--accent)' : 'var(--gray)' }}>
            {checklistOggi ?? 0}
          </div>
          <div className="stat-sub">eseguite oggi</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ticket aperti</div>
          <div className="stat-value" style={{ color: (ticketAperti ?? 0) > 0 ? 'var(--accent-red)' : 'var(--accent)' }}>
            {ticketAperti ?? 0}
          </div>
          <div className="stat-sub">problemi da risolvere</div>
        </div>
      </div>

      {/* Azioni principali */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Link href="/dashboard/custode/impianti?tab=checklist" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '28px 24px', cursor: 'pointer', borderLeft: '4px solid var(--accent)', transition: 'opacity 0.15s' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase', fontSize: 16, marginBottom: 6, color: 'var(--white)' }}>
              Esegui checklist
            </div>
            <div style={{ fontSize: 13, color: 'var(--gray)' }}>
              Compila le checklist di controllo giornaliere, settimanali e pre-gara.
            </div>
          </div>
        </Link>

        <Link href="/dashboard/custode/impianti?tab=ticket" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '28px 24px', cursor: 'pointer', borderLeft: '4px solid var(--accent-red)', transition: 'opacity 0.15s' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔴</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase', fontSize: 16, marginBottom: 6, color: 'var(--white)' }}>
              Apri ticket
            </div>
            <div style={{ fontSize: 13, color: 'var(--gray)' }}>
              Segnala un problema all&apos;impianto. I ticket urgenti notificano subito il presidente.
            </div>
          </div>
        </Link>
      </div>

      <div style={{ marginTop: 16 }}>
        <Link href="/dashboard/custode/impianti" className="btn btn-secondary btn-sm">
          Vai alla gestione completa impianti →
        </Link>
      </div>
    </div>
  )
}
