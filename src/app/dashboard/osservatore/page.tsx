import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ObiettiviWidget from '@/components/ui/ObiettiviWidget'
import AzioniRapide from '@/components/ui/AzioniRapide'
import DMScoutWidget from '@/components/ui/DMScoutWidget'

export default async function OsservatoreDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utente, error: utenteError } = await supabase.from('utenti').select('club_id, nome').eq('id', user.id).single()
  if (utenteError || !utente) redirect('/auth/errore')

  const { data: club } = await supabase
    .from('clubs')
    .select('dmscout_abbonamento_attivo, dmscout_abbonamento_scadenza')
    .eq('id', utente.club_id)
    .maybeSingle()

  const [
    { data: mieiReport },
    { count: totReport },
    { count: ingaggiati },
  ] = await Promise.all([
    supabase.from('report_scouting')
      .select('id, nome_giocatore_ext, voto_globale, potenziale, esito, data_osservazione, partita_osservata, club_attuale_ext')
      .eq('osservatore_id', user.id)
      .order('data_osservazione', { ascending: false })
      .limit(10),
    supabase.from('report_scouting').select('*', { count: 'exact', head: true }).eq('osservatore_id', user.id),
    supabase.from('report_scouting').select('*', { count: 'exact', head: true }).eq('osservatore_id', user.id).eq('esito', 'ingaggiato'),
  ])

  const tassoConversione = totReport && totReport > 0 ? Math.round(((ingaggiati ?? 0) / totReport) * 100) : 0

  const potenzialeColore: Record<string, string> = {
    basso: 'badge-grigio', medio: 'badge-blu', alto: 'badge-verde', eccezionale: 'badge-viola'
  }
  const esitoColore: Record<string, string> = {
    in_valutazione: 'badge-ambra', ingaggiato: 'badge-verde',
    rifiutato: 'badge-rosso', archiviato: 'badge-grigio', lista_attesa: 'badge-blu'
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Area Osservatore</h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          I tuoi report di scouting e statistiche personali
        </p>
      </div>

      <AzioniRapide ruolo="osservatore" />

      <DMScoutWidget
        attivo={club?.dmscout_abbonamento_attivo ?? false}
        scadenza={club?.dmscout_abbonamento_scadenza ?? null}
        clubId={utente.club_id}
      />

      <ObiettiviWidget clubId={utente.club_id} ruolo="osservatore" />

      {/* Stat personali */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Report totali</div>
          <div className="stat-value">{totReport ?? 0}</div>
          <div className="stat-sub">da sempre</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ingaggiati</div>
          <div className="stat-value" style={{ color: 'var(--verde)' }}>{ingaggiati ?? 0}</div>
          <div className="stat-sub">giocatori presi</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tasso conversione</div>
          <div className="stat-value">{tassoConversione}%</div>
          <div className="stat-sub">report → ingaggio</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In valutazione</div>
          <div className="stat-value" style={{ color: 'var(--ambra)' }}>
            {mieiReport?.filter(r => r.esito === 'in_valutazione').length ?? 0}
          </div>
          <div className="stat-sub">aperti</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20 }}>

        {/* Lista report */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>I miei report recenti</span>
            <Link href="/dashboard/osservatore/report" style={{ fontSize: 12, color: 'var(--verde)', textDecoration: 'none', fontWeight: 500 }}>Vedi tutti →</Link>
          </div>
          {mieiReport && mieiReport.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Giocatore</th><th>Club</th><th>Data</th><th>Voto</th><th>Potenziale</th><th>Esito</th></tr>
                </thead>
                <tbody>
                  {mieiReport.map(r => (
                    <tr key={r.id} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{r.nome_giocatore_ext ?? '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{r.club_attuale_ext ?? '—'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {new Date(r.data_osservazione).toLocaleDateString('it-IT')}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 28, height: 28, borderRadius: 6,
                          background: (r.voto_globale ?? 0) >= 7 ? 'var(--verde-lt)' : (r.voto_globale ?? 0) >= 5 ? 'var(--ambra-lt)' : 'var(--rosso-lt)',
                          color: (r.voto_globale ?? 0) >= 7 ? 'var(--verde)' : (r.voto_globale ?? 0) >= 5 ? 'var(--ambra)' : 'var(--rosso)',
                          fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-mono)',
                        }}>
                          {r.voto_globale ?? '—'}
                        </span>
                      </td>
                      <td><span className={`badge ${potenzialeColore[r.potenziale] ?? 'badge-grigio'}`} style={{ fontSize: 10 }}>{r.potenziale}</span></td>
                      <td><span className={`badge ${esitoColore[r.esito] ?? 'badge-grigio'}`} style={{ fontSize: 10 }}>{r.esito?.replace('_', ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
              Nessun report ancora. Crea il tuo primo!
            </div>
          )}
        </div>

        {/* Azioni rapide */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Azioni rapide</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { href: '/dashboard/osservatore/nuovo-report', label: '+ Nuovo report scouting' },
                { href: '/dashboard/osservatore/report', label: 'I miei report' },
                { href: '/dashboard/osservatore/giocatori', label: 'Giocatori seguiti' },
                { href: '/dashboard/osservatore/statistiche', label: 'Le mie statistiche' },
                { href: '/dashboard/osservatore/messaggi', label: 'Messaggi' },
              ].map(a => (
                <Link key={a.href} href={a.href} style={{
                  display: 'block', padding: '9px 12px',
                  border: '1px solid var(--grigio-5)', borderRadius: 8,
                  fontSize: 13, color: 'var(--grigio)', textDecoration: 'none', fontWeight: 500,
                }}>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Suggerimento */}
          <div className="card" style={{ padding: 16, background: 'var(--verde-lt)', border: '1px solid var(--verde-bd)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--verde)', marginBottom: 8 }}>
              Come funziona
            </div>
            <div style={{ fontSize: 12, color: 'var(--verde)', lineHeight: 1.6, opacity: 0.85 }}>
              Ogni report che crei viene inviato automaticamente al DS. Puoi tracciare l&apos;esito di ogni segnalazione e vedere il tuo tasso di conversione nel tempo.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
