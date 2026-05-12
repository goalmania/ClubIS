import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ObiettiviWidget from '@/components/ui/ObiettiviWidget'
import AzioniRapide from '@/components/ui/AzioniRapide'
import DMScoutWidget from '@/components/ui/DMScoutWidget'

export default async function AllenatoreDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utente, error: utenteError } = await supabase
    .from('utenti')
    .select('club_id, nome, squadre_ids')
    .eq('id', user.id)
    .single()
  if (utenteError || !utente) redirect('/auth/errore')

  const { data: clubData } = await supabase
    .from('clubs')
    .select('dmscout_abbonamento_attivo, dmscout_abbonamento_scadenza')
    .eq('id', utente.club_id)
    .maybeSingle()

  const oggi = new Date()
  const oggiStr = oggi.toISOString().split('T')[0]
  const tra7 = new Date(oggi); tra7.setDate(oggi.getDate() + 7)

  // Squadre dell'allenatore
  const { data: squadre } = await supabase
    .from('squadre')
    .select('id, nome, categoria_eta')
    .eq('club_id', utente.club_id)
    .eq('allenatore_id', user.id)
    .eq('attiva', true)

  const squadraIds = squadre?.map(s => s.id) ?? []

  const [
    { data: prossimaSessione },
    { data: prossimaPartita },
    { data: convocazioniPendenti },
    { data: ultimiAllenamenti },
  ] = await Promise.all([
    supabase.from('sessioni_allenamento')
      .select('id, data_ora, tipologia, campo, durata_minuti, squadra_id')
      .in('squadra_id', squadraIds.length ? squadraIds : ['none'])
      .gte('data_ora', oggi.toISOString())
      .eq('stato', 'programmato')
      .order('data_ora')
      .limit(1),
    supabase.from('partite')
      .select('id, avversario, data_ora, casa_trasferta, competizione, squadra_id')
      .in('squadra_id', squadraIds.length ? squadraIds : ['none'])
      .gte('data_ora', oggi.toISOString())
      .eq('stato', 'programmata')
      .order('data_ora')
      .limit(1),
    supabase.from('convocazioni')
      .select('id, stato_risposta, partita_id')
      .eq('stato_risposta', 'in_attesa')
      .limit(100),
    supabase.from('sessioni_allenamento')
      .select('id, data_ora, tipologia, stato, squadra_id')
      .in('squadra_id', squadraIds.length ? squadraIds : ['none'])
      .lte('data_ora', oggi.toISOString())
      .order('data_ora', { ascending: false })
      .limit(5),
  ])

  // Calcola % presenze ultima settimana
  const settimanaFa = new Date(oggi); settimanaFa.setDate(oggi.getDate() - 7)
  const { data: presenzeSettimana } = await supabase
    .from('presenze')
    .select('presente')
    .in('sessione_id',
      ultimiAllenamenti?.map(a => a.id) ?? []
    )

  const totPresenze = presenzeSettimana?.length ?? 0
  const presenti = presenzeSettimana?.filter(p => p.presente).length ?? 0
  const percPresenze = totPresenze > 0 ? Math.round((presenti / totPresenze) * 100) : null

  const sqNome = (id: string) => squadre?.find(s => s.id === id)?.nome ?? '—'

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Ciao, {utente.nome}</h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          {oggi.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          {squadre && squadre.length > 0 && ` · ${squadre.map(s => s.nome).join(', ')}`}
        </p>
      </div>

      <AzioniRapide ruolo="allenatore" />

      <DMScoutWidget
        attivo={clubData?.dmscout_abbonamento_attivo ?? false}
        scadenza={clubData?.dmscout_abbonamento_scadenza ?? null}
        clubId={utente.club_id}
      />

      <ObiettiviWidget clubId={utente.club_id} ruolo="allenatore" />

      {/* Prossimo allenamento — card prominente */}
      {prossimaSessione?.[0] && (
        <div style={{
          background: 'var(--verde)', borderRadius: 12, padding: '20px 24px',
          marginBottom: 24, color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Prossimo allenamento
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)', marginBottom: 4 }}>
              {new Date(prossimaSessione[0].data_ora).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}
              {new Date(prossimaSessione[0].data_ora).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>
              {prossimaSessione[0].tipologia.charAt(0).toUpperCase() + prossimaSessione[0].tipologia.slice(1)}
              {prossimaSessione[0].campo && ` · ${prossimaSessione[0].campo}`}
              {' · '}{prossimaSessione[0].durata_minuti} min
              {' · '}{sqNome(prossimaSessione[0].squadra_id)}
            </div>
          </div>
          <Link
            href={`/dashboard/allenatore/presenze/${prossimaSessione[0].id}`}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white', border: '1px solid rgba(255,255,255,0.3)',
              padding: '10px 20px', borderRadius: 8, fontSize: 13,
              fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap',
            }}
          >
            Gestisci presenze →
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Squadre</div>
          <div className="stat-value">{squadre?.length ?? 0}</div>
          <div className="stat-sub">assegnate</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Presenze settimana</div>
          <div className="stat-value" style={{ color: percPresenze !== null && percPresenze < 70 ? 'var(--ambra)' : 'var(--grigio)' }}>
            {percPresenze !== null ? `${percPresenze}%` : '—'}
          </div>
          <div className="stat-sub">{presenti}/{totPresenze} rilevazioni</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Conv. in attesa</div>
          <div className="stat-value" style={{ color: convocazioniPendenti && convocazioniPendenti.length > 0 ? 'var(--ambra)' : 'var(--grigio)' }}>
            {convocazioniPendenti?.length ?? 0}
          </div>
          <div className="stat-sub">risposte mancanti</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Prossima partita</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {prossimaPartita?.[0]
              ? new Date(prossimaPartita[0].data_ora).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
              : '—'
            }
          </div>
          <div className="stat-sub">{prossimaPartita?.[0]?.avversario ?? 'nessuna in programma'}</div>
        </div>
      </div>

      {/* 2 colonne */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Ultimi allenamenti */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Sessioni recenti</span>
            <Link href="/dashboard/allenatore/allenamenti" style={{ fontSize: 12, color: 'var(--verde)', textDecoration: 'none', fontWeight: 500 }}>
              Vedi calendario →
            </Link>
          </div>
          {ultimiAllenamenti && ultimiAllenamenti.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Squadra</th>
                    <th>Stato</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ultimiAllenamenti.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                        {new Date(a.data_ora).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                        {' '}
                        <span style={{ color: 'var(--grigio-4)' }}>
                          {new Date(a.data_ora).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td style={{ textTransform: 'capitalize', fontSize: 13 }}>{a.tipologia}</td>
                      <td style={{ fontSize: 13, color: 'var(--grigio-3)' }}>{sqNome(a.squadra_id)}</td>
                      <td>
                        <span className={`badge ${a.stato === 'effettuato' ? 'badge-verde' : a.stato === 'annullato' ? 'badge-rosso' : 'badge-ambra'}`}>
                          {a.stato}
                        </span>
                      </td>
                      <td>
                        <Link href={`/dashboard/allenatore/presenze/${a.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
                          Presenze →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
              Nessuna sessione registrata
            </div>
          )}
        </div>

        {/* Azioni rapide */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Azioni rapide</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { href: '/dashboard/allenatore/allenamenti/nuovo', label: '+ Nuovo allenamento' },
                { href: '/dashboard/allenatore/presenze', label: 'Registra presenze' },
                { href: '/dashboard/allenatore/convocazioni', label: 'Gestisci convocazioni' },
                { href: '/dashboard/allenatore/valutazioni/nuova', label: '+ Valuta giocatore' },
                { href: '/dashboard/allenatore/messaggi/nuovo', label: 'Invia messaggio squadra' },
              ].map(a => (
                <Link key={a.href} href={a.href} style={{
                  display: 'block', padding: '9px 12px',
                  border: '1px solid var(--grigio-5)', borderRadius: 8,
                  fontSize: 13, color: 'var(--grigio)', textDecoration: 'none',
                  fontWeight: 500, transition: 'border-color 0.12s',
                }}>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Prossima partita card */}
          {prossimaPartita?.[0] && (
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--grigio-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Prossima partita
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                vs {prossimaPartita[0].avversario}
              </div>
              <div style={{ fontSize: 13, color: 'var(--grigio-3)', marginBottom: 12 }}>
                {new Date(prossimaPartita[0].data_ora).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' · '}
                {new Date(prossimaPartita[0].data_ora).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <span className={`badge ${prossimaPartita[0].casa_trasferta === 'casa' ? 'badge-verde' : 'badge-grigio'}`}>
                {prossimaPartita[0].casa_trasferta === 'casa' ? 'In casa' : 'In trasferta'}
              </span>
              <div style={{ marginTop: 12 }}>
                <Link href={`/dashboard/allenatore/convocazioni?partita=${prossimaPartita[0].id}`} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                  Gestisci convocazioni
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
