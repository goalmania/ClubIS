import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ObiettiviWidget from '@/components/ui/ObiettiviWidget'
import AzioniRapide from '@/components/ui/AzioniRapide'
import DMScoutWidget from '@/components/ui/DMScoutWidget'
import ImpiantiDashboardWidget from '@/components/features/ImpiantiDashboardWidget'
import ServerFeatureGate from '@/components/ServerFeatureGate'

export default async function DSDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utente, error: utenteError } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (utenteError || !utente) redirect('/auth/errore')
  const clubId = utente.club_id

  const { data: club } = await supabase
    .from('clubs')
    .select('dmscout_abbonamento_attivo, dmscout_abbonamento_scadenza')
    .eq('id', clubId)
    .maybeSingle()

  const oggi = new Date()
  const tra90 = new Date(oggi); tra90.setDate(oggi.getDate() + 90)

  const [
    { data: contratti },
    { count: totGiocatori },
    { data: reportRecenti },
    { data: svincolantiPresto },
  ] = await Promise.all([
    supabase.from('contratti')
      .select('id, data_scadenza, ingaggio_mensile, giocatore_id, giocatori(nome, cognome)')
      .eq('club_id', clubId)
      .lte('data_scadenza', tra90.toISOString().split('T')[0])
      .gte('data_scadenza', oggi.toISOString().split('T')[0])
      .order('data_scadenza')
      .limit(8),
    supabase.from('tesseramenti')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId).eq('stato', 'attivo'),
    supabase.from('report_scouting')
      .select('id, nome_giocatore_ext, voto_globale, potenziale, esito, data_osservazione, partita_osservata')
      .eq('club_richiedente_id', clubId)
      .order('data_osservazione', { ascending: false })
      .limit(6),
    supabase.from('contratti')
      .select('id, data_scadenza, giocatori(nome, cognome)')
      .eq('club_id', clubId)
      .lte('data_scadenza', tra90.toISOString().split('T')[0])
      .gte('data_scadenza', oggi.toISOString().split('T')[0])
      .limit(5),
  ])

  const potenzialeColore: Record<string, string> = {
    basso: 'badge-grigio', medio: 'badge-blu', alto: 'badge-verde', eccezionale: 'badge-viola'
  }
  const esitoColore: Record<string, string> = {
    in_valutazione: 'badge-ambra', ingaggiato: 'badge-verde',
    rifiutato: 'badge-rosso', archiviato: 'badge-grigio', lista_attesa: 'badge-blu'
  }

  return (
    <ServerFeatureGate feature="dashboard_ds" featureLabel="Dashboard Direttore Sportivo">
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Area Direttore Sportivo</h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          Controllo rosa, contratti e scouting
        </p>
      </div>

      <AzioniRapide ruolo="ds" />

      <DMScoutWidget
        attivo={club?.dmscout_abbonamento_attivo ?? false}
        scadenza={club?.dmscout_abbonamento_scadenza ?? null}
        clubId={clubId}
      />

      <ObiettiviWidget clubId={clubId} ruolo="ds" />

      <ImpiantiDashboardWidget ruolo="ds" />

      {/* Alert contratti in scadenza */}
      {contratti && contratti.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span><strong>{contratti.length} contratt{contratti.length === 1 ? 'o' : 'i'}</strong> in scadenza nei prossimi 90 giorni — programma i rinnovi.</span>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Rosa attiva</div>
          <div className="stat-value">{totGiocatori ?? 0}</div>
          <div className="stat-sub">tesserati</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Contr. in scadenza</div>
          <div className="stat-value" style={{ color: contratti && contratti.length > 0 ? 'var(--ambra)' : 'var(--grigio)' }}>
            {contratti?.length ?? 0}
          </div>
          <div className="stat-sub">entro 90 giorni</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Report scouting</div>
          <div className="stat-value">{reportRecenti?.length ?? 0}</div>
          <div className="stat-sub">recenti</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In valutazione</div>
          <div className="stat-value">
            {reportRecenti?.filter(r => r.esito === 'in_valutazione').length ?? 0}
          </div>
          <div className="stat-sub">giocatori osservati</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Contratti in scadenza */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Contratti in scadenza</span>
            <Link href="/dashboard/ds/contratti" style={{ fontSize: 12, color: 'var(--verde)', textDecoration: 'none', fontWeight: 500 }}>Vedi tutti →</Link>
          </div>
          {contratti && contratti.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Giocatore</th><th>Scadenza</th><th>Gg rimanenti</th></tr></thead>
                <tbody>
                  {contratti.map(c => {
                    const g = c.giocatori as any
                    const gg = Math.ceil((new Date(c.data_scadenza).getTime() - oggi.getTime()) / 86400000)
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 500, fontSize: 13 }}>{g?.cognome} {g?.nome}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          {new Date(c.data_scadenza).toLocaleDateString('it-IT')}
                        </td>
                        <td>
                          <span className={`badge ${gg <= 30 ? 'badge-rosso' : 'badge-ambra'}`}>
                            {gg}gg
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
              ✓ Nessun contratto in scadenza entro 90 giorni
            </div>
          )}
        </div>

        {/* Report scouting recenti */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Report scouting recenti</span>
            <Link href="/dashboard/ds/scouting" style={{ fontSize: 12, color: 'var(--verde)', textDecoration: 'none', fontWeight: 500 }}>Vedi tutti →</Link>
          </div>
          {reportRecenti && reportRecenti.length > 0 ? (
            <div>
              {reportRecenti.map(r => (
                <div key={r.id} style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid var(--grigio-6)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'var(--grigio-6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 700, color: 'var(--grigio-3)', flexShrink: 0,
                  }}>
                    {r.voto_globale ?? '—'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.nome_giocatore_ext ?? 'Giocatore sconosciuto'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--grigio-4)', marginTop: 2 }}>
                      {r.data_osservazione}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <span className={`badge ${potenzialeColore[r.potenziale] ?? 'badge-grigio'}`} style={{ fontSize: 10 }}>
                      {r.potenziale}
                    </span>
                    <span className={`badge ${esitoColore[r.esito] ?? 'badge-grigio'}`} style={{ fontSize: 10 }}>
                      {r.esito?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
              Nessun report scouting ancora
            </div>
          )}
        </div>
      </div>

      {/* Azioni rapide DS */}
      <div className="card" style={{ padding: 18, marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link href="/dashboard/ds/scouting/nuovo" className="btn btn-primary btn-sm">+ Nuovo report scouting</Link>
        <Link href="/dashboard/ds/rosa" className="btn btn-secondary btn-sm">Gestisci rosa</Link>
        <Link href="/dashboard/ds/contratti" className="btn btn-secondary btn-sm">Contratti</Link>
        <Link href="/dashboard/ds/database" className="btn btn-secondary btn-sm">Database giocatori</Link>
      </div>
    </div>
    </ServerFeatureGate>
  )
}
