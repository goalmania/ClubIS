import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AzioniRapide from '@/components/ui/AzioniRapide'
import ServerFeatureGate from '@/components/ServerFeatureGate'

export default async function MedicoDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: utente, error: utenteError } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (utenteError || !utente) redirect('/auth/errore')
  const clubId = utente.club_id

  const oggi = new Date()
  const oggiStr = oggi.toISOString().split('T')[0]
  const in30g = new Date(oggi.getTime() + 30 * 86400000).toISOString().split('T')[0]

  const [
    { count: totGiocatori },
    { count: certValidi },
    { count: certScadenza },
    { count: certScaduti },
    { data: infortuniAttivi },
    { data: visiteProssime },
    { data: ultimiInfortuni },
  ] = await Promise.all([
    supabase.from('giocatori').select('*', { count: 'exact', head: true }).eq('club_id', clubId).eq('attivo', true),
    supabase.from('certificati_medici').select('*', { count: 'exact', head: true }).eq('club_id', clubId).gt('data_scadenza', in30g),
    supabase.from('certificati_medici').select('*', { count: 'exact', head: true }).eq('club_id', clubId).gte('data_scadenza', oggiStr).lte('data_scadenza', in30g),
    supabase.from('certificati_medici').select('*', { count: 'exact', head: true }).eq('club_id', clubId).lt('data_scadenza', oggiStr),
    supabase.from('infortuni').select('id, tipo, gravita, data_infortunio, data_rientro_prevista, giocatori(nome, cognome, ruolo_principale)')
      .eq('club_id', clubId).is('data_rientro_effettiva', null).order('data_infortunio', { ascending: false }),
    supabase.from('visite_mediche').select('id, tipo, data, giocatori(nome, cognome)')
      .eq('club_id', clubId).gte('data', oggiStr).order('data').limit(5),
    supabase.from('infortuni').select('id, tipo, gravita, data_infortunio, giocatori(nome, cognome)')
      .eq('club_id', clubId).order('data_infortunio', { ascending: false }).limit(5),
  ])

  const gravitaColore: Record<string, string> = {
    lieve: 'badge-verde', moderato: 'badge-ambra', grave: 'badge-rosso',
  }

  return (
    <ServerFeatureGate feature="dashboard_medico_completa" featureLabel="Dashboard Medico Completa">
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Area Medica</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Salute, infortuni e idoneità sanitaria
        </p>
      </div>

      <AzioniRapide ruolo="medico" />

      {(certScadenza! > 0 || certScaduti! > 0) && (
      <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>
            {certScaduti! > 0 && <><strong>{certScaduti} certificati scaduti</strong>. </>}
            {certScadenza! > 0 && <><strong>{certScadenza}</strong> in scadenza nei prossimi 30 giorni.</>}
          </span>
        </div>
      )}

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Giocatori in cura</div>
          <div className="stat-value">{totGiocatori ?? 0}</div>
          <div className="stat-sub">cartelle attive</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Certificati validi</div>
          <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{certValidi ?? 0}</div>
          <div className="stat-sub">{certScadenza ?? 0} in scadenza</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Infortuni attivi</div>
          <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{infortuniAttivi?.length ?? 0}</div>
          <div className="stat-sub">in corso</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Visite prossime</div>
          <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>{visiteProssime?.length ?? 0}</div>
          <div className="stat-sub">da effettuare</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Infortuni attivi */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Infortuni attivi</span>
            <Link href="/dashboard/medico/infortuni" style={{ fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>Gestisci →</Link>
          </div>
          {(!infortuniAttivi || infortuniAttivi.length === 0) ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nessun infortunio in corso
            </div>
          ) : (
            infortuniAttivi.slice(0, 5).map(i => {
              const g: any = i.giocatori
              return (
                <div key={i.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {g?.cognome} {g?.nome}
                    </span>
                    <span className={`badge ${gravitaColore[i.gravita] ?? 'badge-grigio'}`}>{i.gravita}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{i.tipo}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Dal {new Date(i.data_infortunio).toLocaleDateString('it-IT')}
                    {i.data_rientro_prevista && <> · rientro previsto {new Date(i.data_rientro_prevista).toLocaleDateString('it-IT')}</>}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Visite prossime */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Visite in calendario</span>
            <Link href="/dashboard/medico/visite" style={{ fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>Agenda →</Link>
          </div>
          {(!visiteProssime || visiteProssime.length === 0) ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nessuna visita programmata
            </div>
          ) : (
            visiteProssime.map(v => {
              const g: any = v.giocatori
              return (
                <div key={v.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 44, textAlign: 'center', padding: '4px 0', borderRadius: 6, background: 'var(--accent-blue-lt)', color: 'var(--accent-blue)' }}>
                    <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase' }}>
                      {new Date(v.data).toLocaleDateString('it-IT', { month: 'short' })}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{new Date(v.data).getDate()}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{g?.cognome} {g?.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.tipo}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Ultimi infortuni cronologia */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Cronologia recente infortuni</span>
        </div>
        {(!ultimiInfortuni || ultimiInfortuni.length === 0) ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nessun infortunio registrato</div>
        ) : (
          ultimiInfortuni.map(i => {
            const g: any = i.giocatori
            return (
              <div key={i.id} style={{ padding: '11px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <span className={`badge ${gravitaColore[i.gravita] ?? 'badge-grigio'}`}>{i.gravita}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{g?.cognome} {g?.nome} — {i.tipo}</div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(i.data_infortunio).toLocaleDateString('it-IT')}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Quick actions */}
      <div className="card" style={{ padding: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link href="/dashboard/medico/cartelle" className="btn btn-secondary btn-sm">Cartelle cliniche</Link>
        <Link href="/dashboard/medico/infortuni" className="btn btn-secondary btn-sm">Infortuni</Link>
        <Link href="/dashboard/medico/visite" className="btn btn-secondary btn-sm">Visite mediche</Link>
        <Link href="/dashboard/medico/prevenzione" className="btn btn-primary btn-sm">Prevenzione</Link>
      </div>
    </div>
    </ServerFeatureGate>
  )
}
