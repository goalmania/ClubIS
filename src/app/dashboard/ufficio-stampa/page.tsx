import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AzioniRapide from '@/components/ui/AzioniRapide'
import { formatData, formatOra } from '@/lib/helpers'
import ServerFeatureGate from '@/components/ServerFeatureGate'

const STATO_EVENTO_LABEL: Record<string, { label: string; colore: string }> = {
  da_confermare: { label: 'Da confermare', colore: 'var(--ambra)' },
  confermato:    { label: 'Confermato',    colore: 'var(--verde)' },
  annullato:     { label: 'Annullato',     colore: 'var(--rosso)' },
  completato:    { label: 'Completato',    colore: 'var(--grigio-3)' },
}

const TIPO_EVENTO_LABEL: Record<string, string> = {
  intervista_tv:      'Intervista TV',
  conferenza_stampa:  'Conferenza stampa',
  intervista_radio:   'Intervista radio',
  podcast:            'Podcast',
  photoshoot:         'Photoshoot',
  altro:              'Altro',
}

const STATO_BRIEF_LABEL: Record<string, { label: string; colore: string }> = {
  bozza:           { label: 'Bozza',          colore: 'var(--grigio-3)' },
  inviato_grafico: { label: 'Al grafico',      colore: 'var(--blu)' },
  in_lavorazione:  { label: 'In lavorazione',  colore: 'var(--ambra)' },
  completato:      { label: 'Completato',      colore: 'var(--verde)' },
}

export default async function UfficioStampaDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utente } = await supabase.from('utenti').select('club_id, nome').eq('id', user.id).single()
  if (!utente) redirect('/auth/errore')

  const oggi = new Date()
  const seiGiorniFa = new Date(oggi)
  seiGiorniFa.setDate(oggi.getDate() - 6)
  const setteFuturi = new Date(oggi)
  setteFuturi.setDate(oggi.getDate() + 30)

  const [
    { data: eventiProssimi },
    { data: briefAperti },
    { data: partiteProssime },
    { count: totEventi },
    { count: briefDaInviare },
  ] = await Promise.all([
    supabase
      .from('eventi_media')
      .select('*')
      .eq('club_id', utente.club_id)
      .gte('data_ora', oggi.toISOString())
      .lte('data_ora', setteFuturi.toISOString())
      .in('stato', ['da_confermare', 'confermato'])
      .order('data_ora', { ascending: true })
      .limit(5),
    supabase
      .from('brief_locandine')
      .select('*')
      .eq('club_id', utente.club_id)
      .not('stato', 'eq', 'completato')
      .order('data_evento', { ascending: true })
      .limit(5),
    supabase
      .from('partite')
      .select('id, avversario, data_ora, tipo, competizione, casa_trasferta, stato, squadre(nome)')
      .gte('data_ora', oggi.toISOString())
      .order('data_ora', { ascending: true })
      .limit(3),
    supabase.from('eventi_media').select('*', { count: 'exact', head: true }).eq('club_id', utente.club_id),
    supabase.from('brief_locandine').select('*', { count: 'exact', head: true }).eq('club_id', utente.club_id).eq('stato', 'bozza'),
  ])

  return (
    <ServerFeatureGate feature="dashboard_addetto_stampa" featureLabel="Dashboard Addetto Stampa">
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
          Ufficio Stampa
        </h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          Gestione media, interviste, locandine e contenuti
        </p>
      </div>

      <AzioniRapide ruolo="ufficio_stampa" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Prossimi eventi media</div>
          <div className="stat-value">{eventiProssimi?.length ?? 0}</div>
          <div className="stat-sub">nei prossimi 30 giorni</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Da confermare</div>
          <div className="stat-value" style={{ color: 'var(--ambra)' }}>
            {eventiProssimi?.filter(e => e.stato === 'da_confermare').length ?? 0}
          </div>
          <div className="stat-sub">eventi in attesa</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Brief aperti</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{briefAperti?.length ?? 0}</div>
          <div className="stat-sub">locandine da completare</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Brief in bozza</div>
          <div className="stat-value" style={{ color: 'var(--grigio-3)' }}>{briefDaInviare ?? 0}</div>
          <div className="stat-sub">da inviare al grafico</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Prossimi eventi media */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Prossimi eventi media</span>
            <Link href="/dashboard/ufficio-stampa/calendario-media" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Calendario →</Link>
          </div>
          {eventiProssimi && eventiProssimi.length > 0 ? (
            <div style={{ padding: '10px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {eventiProssimi.map(ev => {
                const info = STATO_EVENTO_LABEL[ev.stato] ?? { label: ev.stato, colore: 'var(--grigio-3)' }
                return (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--grigio-6)' }}>
                    <div style={{ textAlign: 'center', minWidth: 44 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>
                        {new Date(ev.data_ora).getDate()}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grigio-4)', textTransform: 'uppercase' }}>
                        {new Date(ev.data_ora).toLocaleDateString('it-IT', { month: 'short' })}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', marginBottom: 2 }}>
                        {TIPO_EVENTO_LABEL[ev.tipo] ?? ev.tipo}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--grigio-4)' }}>
                        {formatOra(ev.data_ora)}{ev.emittente_testata ? ` · ${ev.emittente_testata}` : ''}{ev.luogo ? ` · ${ev.luogo}` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: info.colore, background: `${info.colore}18`, padding: '3px 8px', borderRadius: 2, whiteSpace: 'nowrap' }}>
                      {info.label}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
              Nessun evento programmato nei prossimi 30 giorni
            </div>
          )}
          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--grigio-5)' }}>
            <Link href="/dashboard/ufficio-stampa/interviste/nuova" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
              + Nuova intervista / evento
            </Link>
          </div>
        </div>

        {/* Brief locandine aperti */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Brief locandine</span>
            <Link href="/dashboard/ufficio-stampa/locandine" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Tutti →</Link>
          </div>
          {briefAperti && briefAperti.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Evento</th><th>Data</th><th>Stato</th></tr>
                </thead>
                <tbody>
                  {briefAperti.map(b => {
                    const info = STATO_BRIEF_LABEL[b.stato] ?? { label: b.stato, colore: 'var(--grigio-3)' }
                    return (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 500, fontSize: 13 }}>{b.titolo_evento}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatData(b.data_evento)}</td>
                        <td>
                          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: info.colore, background: `${info.colore}18`, padding: '3px 8px', borderRadius: 2 }}>
                            {info.label}
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
              Nessun brief aperto
            </div>
          )}
          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--grigio-5)' }}>
            <Link href="/dashboard/ufficio-stampa/locandine/nuova" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
              + Nuovo brief locandina
            </Link>
          </div>
        </div>
      </div>

      {/* Prossime partite → template articolo */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Prossime gare — template articoli</span>
          <Link href="/dashboard/ufficio-stampa/articoli" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Tutti →</Link>
        </div>
        {partiteProssime && partiteProssime.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Gara</th><th>Data</th><th>Competizione</th><th>Campo</th><th></th></tr>
              </thead>
              <tbody>
                {partiteProssime.map((p: any) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>
                      {p.casa_trasferta === 'casa' ? `${(p.squadre as any)?.nome ?? '—'} vs ${p.avversario}` : `${p.avversario} vs ${(p.squadre as any)?.nome ?? '—'}`}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatData(p.data_ora)} {formatOra(p.data_ora)}</td>
                    <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{p.competizione ?? '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--grigio-4)' }}>{p.casa_trasferta === 'casa' ? 'Casa' : 'Trasferta'}</td>
                    <td>
                      <Link
                        href={`/dashboard/ufficio-stampa/articoli?partita_id=${p.id}`}
                        style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        Genera →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
            Nessuna partita programmata
          </div>
        )}
      </div>
    </div>
    </ServerFeatureGate>
  )
}
