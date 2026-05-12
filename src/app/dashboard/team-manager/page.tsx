import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CostiTrasferteStagioneCard from './CostiTrasferteStagioneCard'
import AzioniRapide from '@/components/ui/AzioniRapide'

export default async function TeamManagerDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: utente, error: utenteError } = await supabase
    .from('utenti')
    .select('club_id, nome')
    .eq('id', user.id)
    .single()
  if (utenteError || !utente) redirect('/auth/errore')
  const clubId = utente.club_id

  const oggi = new Date().toISOString()

  // Recupera squadre del club per filtrare partite e sessioni
  const { data: sqData } = await supabase.from('squadre').select('id').eq('club_id', clubId)
  const sqIds = sqData?.map(s => s.id) ?? []
  const sqFilter = sqIds.length ? sqIds : ['00000000-0000-0000-0000-000000000000']

  const [
    { data: prossimaPartitaRaw },
    { data: allenamentiRaw },
    { count: totGiocatori },
    { data: materialeAperto },
  ] = await Promise.all([
    supabase.from('partite').select('id, avversario, data_ora, casa_trasferta, indirizzo, squadra_id')
      .in('squadra_id', sqFilter).gte('data_ora', oggi).order('data_ora').limit(1),
    supabase.from('sessioni_allenamento').select('id, data_ora, campo, squadra_id')
      .in('squadra_id', sqFilter).gte('data_ora', oggi).order('data_ora').limit(5),
    supabase.from('tesseramenti').select('*', { count: 'exact', head: true })
      .eq('club_id', clubId).eq('stato', 'attivo'),
    supabase.from('materiale_sportivo').select('id, tipo, descrizione, quantita, stato')
      .eq('club_id', clubId).in('stato', ['in_attesa', 'approvata']).limit(5),
  ])

  const prossimaPartita = prossimaPartitaRaw
  const prossimiAllenamenti = (allenamentiRaw ?? []).map(a => ({
    id: a.id,
    squadra_id: a.squadra_id,
    data: a.data_ora?.split('T')[0],
    ora: a.data_ora?.split('T')[1]?.slice(0, 5),
    luogo: a.campo,
  }))
  const trasferteProssime: { id: string; destinazione: string; data_partenza: string; mezzo: string | null; costo_stimato: number | null }[] = []
  const convocatiSett = 0

  const partita = prossimaPartita?.[0]
  const fmtEuro = (v: number) => v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Team Manager</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Organizzazione squadra, trasferte e logistica
        </p>
      </div>

            <AzioniRapide ruolo="team_manager" />
      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Giocatori gestiti</div>
          <div className="stat-value">{totGiocatori ?? 0}</div>
          <div className="stat-sub">rosa attiva</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Convocazioni (7gg)</div>
          <div className="stat-value">{convocatiSett ?? 0}</div>
          <div className="stat-sub">ultima settimana</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Trasferte prossime</div>
          <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>{trasferteProssime?.length ?? 0}</div>
          <div className="stat-sub">in programma</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Materiale da preparare</div>
          <div className="stat-value" style={{ color: 'var(--accent-orange)' }}>{materialeAperto?.length ?? 0}</div>
          <div className="stat-sub">richieste aperte</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Prossima partita */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Prossima partita</span>
            <Link href="/dashboard/team-manager/distinte" style={{ fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>Distinta →</Link>
          </div>
          {partita ? (
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                {partita.casa_trasferta === 'casa' ? 'vs' : '@'} {partita.avversario}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                {new Date(partita.data_ora).toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </div>
              {partita.indirizzo && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>📍 {partita.indirizzo}</div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <Link href="/dashboard/team-manager/convocazioni" className="btn btn-primary btn-sm">Convoca rosa</Link>
                <Link href="/dashboard/team-manager/trasferte" className="btn btn-secondary btn-sm">Organizza trasferta</Link>
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nessuna partita in programma
            </div>
          )}
        </div>

        {/* Prossimi allenamenti */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Prossimi allenamenti</span>
            <Link href="/dashboard/team-manager/calendario" style={{ fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>Calendario →</Link>
          </div>
          {prossimiAllenamenti && prossimiAllenamenti.length > 0 ? (
            prossimiAllenamenti.map(a => (
              <div key={a.id} style={{ padding: '11px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 40, textAlign: 'center', flexShrink: 0,
                  padding: '4px 0', borderRadius: 6, background: 'var(--accent-blue-lt)', color: 'var(--accent-blue)',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600 }}>
                    {new Date(a.data).toLocaleDateString('it-IT', { weekday: 'short' }).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {new Date(a.data).getDate()}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{a.luogo ?? 'Campo principale'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.ora?.slice(0, 5) ?? '—'}</div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nessun allenamento programmato
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Trasferte */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Trasferte</span>
            <Link href="/dashboard/team-manager/trasferte" style={{ fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>Gestisci →</Link>
          </div>
          {trasferteProssime && trasferteProssime.length > 0 ? (
            trasferteProssime.map(t => (
              <div key={t.id} style={{ padding: '11px 18px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{t.destinazione}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent-orange)' }}>
                    {t.costo_stimato ? fmtEuro(Number(t.costo_stimato)) : '—'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(t.data_partenza).toLocaleDateString('it-IT')} · {t.mezzo ?? 'mezzo da definire'}
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nessuna trasferta programmata
            </div>
          )}
        </div>

        {/* Materiale */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Materiale sportivo</span>
            <Link href="/dashboard/team-manager/materiale" style={{ fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>Inventario →</Link>
          </div>
          {materialeAperto && materialeAperto.length > 0 ? (
            materialeAperto.map(m => (
              <div key={m.id} style={{ padding: '11px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className={`badge ${m.stato === 'richiesto' ? 'badge-ambra' : 'badge-blu'}`}>
                  {m.stato?.replace('_', ' ')}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{m.descrizione ?? m.tipo}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Qty: {m.quantita ?? 1}</div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nessuna richiesta aperta
            </div>
          )}
        </div>
      </div>

      {/* Costi trasferte stagione */}
      <div style={{ marginBottom: 20 }}>
        <CostiTrasferteStagioneCard />
      </div>

      {/* Quick actions */}
      <div className="card" style={{ padding: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link href="/dashboard/team-manager/calendario" className="btn btn-secondary btn-sm">Calendario</Link>
        <Link href="/dashboard/team-manager/convocazioni" className="btn btn-secondary btn-sm">Convocazioni</Link>
        <Link href="/dashboard/team-manager/presenze" className="btn btn-secondary btn-sm">Presenze</Link>
        <Link href="/dashboard/team-manager/trasferte" className="btn btn-secondary btn-sm">Trasferte</Link>
        <Link href="/dashboard/team-manager/materiale" className="btn btn-secondary btn-sm">Materiale</Link>
        <Link href="/dashboard/team-manager/distinte" className="btn btn-secondary btn-sm">Distinte</Link>
        <Link href="/dashboard/team-manager/comunicazioni" className="btn btn-primary btn-sm">Comunicazioni</Link>
      </div>
    </div>
  )
}
