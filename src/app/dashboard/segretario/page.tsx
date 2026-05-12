import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ObiettiviWidget from '@/components/ui/ObiettiviWidget'
import PortafoglioFIGC from '@/components/ui/PortafoglioFIGC'
import AzioniRapide from '@/components/ui/AzioniRapide'
import ScadenzeFIGCWidget from '@/components/features/ScadenzeFIGCWidget'

export default async function SegretarioDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utente, error: utenteError } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (utenteError || !utente) redirect('/auth/errore')
  const clubId = utente.club_id

  const oggi = new Date()
  const tra30 = new Date(oggi); tra30.setDate(oggi.getDate() + 30)
  const tra7  = new Date(oggi); tra7.setDate(oggi.getDate() + 7)

  // Query parallele
  const [
    { count: totTesserati },
    { data: certInScadenza },
    { count: quoteArretrate },
    { data: prossimePartite },
    { data: ultimiMessaggi },
  ] = await Promise.all([
    supabase.from('tesseramenti').select('*', { count: 'exact', head: true })
      .eq('club_id', clubId).eq('stato', 'attivo'),
    supabase.from('certificati_medici')
      .select('id, giocatore_id, data_scadenza, tipo')
      .eq('club_id', clubId)
      .lte('data_scadenza', tra30.toISOString().split('T')[0])
      .gte('data_scadenza', oggi.toISOString().split('T')[0])
      .order('data_scadenza'),
    supabase.from('quote_iscrizione')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .in('stato', ['non_pagato', 'parziale']),
    supabase.from('partite')
      .select('id, avversario, data_ora, casa_trasferta, competizione, stato, squadra_id')
      .gte('data_ora', oggi.toISOString())
      .eq('stato', 'programmata')
      .order('data_ora')
      .limit(5),
    supabase.from('messaggi')
      .select('id, titolo, tipo, inviato_at')
      .eq('club_id', clubId)
      .order('inviato_at', { ascending: false })
      .limit(4),
  ])

  const certUrgenti = certInScadenza?.filter(c => new Date(c.data_scadenza) <= tra7) ?? []
  const certProssimi = certInScadenza?.filter(c => new Date(c.data_scadenza) > tra7) ?? []

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
          Panoramica segreteria
        </h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          {oggi.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <ScadenzeFIGCWidget compact={true} />

      <AzioniRapide ruolo="segretario" />

      <ObiettiviWidget clubId={clubId} ruolo="segretario" />

      {/* Alert urgenti */}
      {certUrgenti.length > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: 20 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
          <span>
            <strong>{certUrgenti.length} certificat{certUrgenti.length === 1 ? 'o' : 'i'} medic{certUrgenti.length === 1 ? 'o' : 'i'}</strong> in scadenza entro 7 giorni — verificare prima della prossima gara.
          </span>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard label="Giocatori tesserati" value={totTesserati ?? 0} sub="stagione corrente" />
        <StatCard label="Certificati in scadenza" value={(certInScadenza?.length ?? 0)} sub="nei prossimi 30 giorni" colore={certUrgenti.length > 0 ? 'rosso' : 'ambra'} />
        <StatCard label="Quote arretrate" value={quoteArretrate ?? 0} sub="da riscuotere" colore={quoteArretrate && quoteArretrate > 0 ? 'rosso' : undefined} />
        <StatCard label="Prossime partite" value={prossimePartite?.length ?? 0} sub="programmate" />
      </div>

      {/* Corpo principale: 2 colonne */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Colonna sinistra */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Certificati in scadenza */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <SectionHeader title="Certificati medici in scadenza" href="/dashboard/segretario/certificati" count={certInScadenza?.length} />
            {certInScadenza && certInScadenza.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Giocatore</th>
                      <th>Tipo</th>
                      <th>Scadenza</th>
                      <th>Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certInScadenza.map((c) => {
                      const gg = Math.ceil((new Date(c.data_scadenza).getTime() - oggi.getTime()) / 86400000)
                      const urgente = gg <= 7
                      return (
                        <tr key={c.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>G</div>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>Giocatore #{c.giocatore_id.slice(-4)}</span>
                            </div>
                          </td>
                          <td><span className="badge badge-grigio">{c.tipo}</span></td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                            {new Date(c.data_scadenza).toLocaleDateString('it-IT')}
                          </td>
                          <td>
                            <span className={`badge ${urgente ? 'badge-rosso' : 'badge-ambra'}`}>
                              {urgente ? `Scade in ${gg}gg` : `${gg} giorni`}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon="✓" msg="Nessun certificato in scadenza nei prossimi 30 giorni" />
            )}
          </div>

          {/* Prossime partite */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <SectionHeader title="Prossime partite" href="/dashboard/segretario/partite" count={prossimePartite?.length} />
            {prossimePartite && prossimePartite.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Avversario</th>
                      <th>Data</th>
                      <th>Campo</th>
                      <th>Competizione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prossimePartite.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.avversario}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                          {new Date(p.data_ora).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                          {' '}
                          <span style={{ color: 'var(--grigio-4)' }}>
                            {new Date(p.data_ora).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${p.casa_trasferta === 'casa' ? 'badge-verde' : 'badge-grigio'}`}>
                            {p.casa_trasferta === 'casa' ? 'Casa' : 'Trasferta'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{p.competizione ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon="🏟" msg="Nessuna partita programmata" />
            )}
          </div>
        </div>

        {/* Colonna destra */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Portafoglio FIGC */}
          <PortafoglioFIGC clubId={clubId} />

          {/* Azioni rapide */}
          <div className="card" style={{ padding: '18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--grigio)', marginBottom: 12 }}>
              Azioni rapide
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <QuickAction href="/dashboard/segretario/giocatori/nuovo" label="+ Aggiungi giocatore" />
              <QuickAction href="/dashboard/segretario/rimborsi" label="Genera bonifici SEPA" />
              <QuickAction href="/dashboard/segretario/partite/nuova" label="+ Crea partita" />
              <QuickAction href="/dashboard/segretario/distinte" label="Genera distinta gara" />
              <QuickAction href="/dashboard/segretario/quote" label="Gestisci quote" />
              <QuickAction href="/dashboard/segretario/messaggi/nuovo" label="Invia comunicazione" />
            </div>
          </div>

          {/* Ultimi messaggi */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <SectionHeader title="Comunicazioni recenti" href="/dashboard/segretario/messaggi" />
            {ultimiMessaggi && ultimiMessaggi.length > 0 ? (
              <div style={{ padding: '8px 0' }}>
                {ultimiMessaggi.map((m) => (
                  <div key={m.id} style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--grigio-6)',
                    cursor: 'pointer',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--grigio)', marginBottom: 2 }}>
                      {m.titolo}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge badge-grigio">{m.tipo}</span>
                      <span style={{ fontSize: 11, color: 'var(--grigio-4)' }}>
                        {new Date(m.inviato_at).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="✉" msg="Nessun messaggio" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Sub-componenti
function StatCard({ label, value, sub, colore }: {
  label: string; value: number; sub?: string; colore?: 'rosso' | 'ambra' | 'verde'
}) {
  const c = colore === 'rosso' ? 'var(--rosso)' : colore === 'ambra' ? 'var(--ambra)' : 'var(--grigio)'
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: c }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function SectionHeader({ title, href, count }: { title: string; href: string; count?: number | null }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--grigio)' }}>{title}</span>
        {count !== undefined && count !== null && count > 0 && (
          <span className="badge badge-grigio">{count}</span>
        )}
      </div>
      <a href={href} style={{ fontSize: 12, color: 'var(--verde)', textDecoration: 'none', fontWeight: 500 }}>
        Vedi tutti →
      </a>
    </div>
  )
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="quick-action-link">
      {label}
    </a>
  )
}

function EmptyState({ icon, msg }: { icon: string; msg: string }) {
  return (
    <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      {msg}
    </div>
  )
}
