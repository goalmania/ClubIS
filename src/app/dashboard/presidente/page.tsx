import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AzioniRapide from '@/components/ui/AzioniRapide'
import ImpiantiDashboardWidget from '@/components/features/ImpiantiDashboardWidget'
import ScadenzeFIGCWidget from '@/components/features/ScadenzeFIGCWidget'

export default async function PresidenteDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utente, error: utenteError } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (utenteError || !utente) redirect('/auth/errore')
  const clubId = utente.club_id

  const oggi = new Date()
  const meseCorrente = oggi.toISOString().slice(0, 7)
  const inizioMese = `${meseCorrente}-01`

  const [
    { count: totTesserati },
    { count: quotePagate },
    { count: quoteArretrate },
    { data: entrateMese },
    { data: usciteMese },
    { data: ultimiRisultati },
    { count: certInScadenza },
    { count: contrInScadenza },
    { data: squadre },
    { data: sponsors },
  ] = await Promise.all([
    supabase.from('tesseramenti').select('*', { count: 'exact', head: true }).eq('club_id', clubId).eq('stato', 'attivo'),
    supabase.from('quote_iscrizione').select('*', { count: 'exact', head: true }).eq('club_id', clubId).eq('stato', 'pagato'),
    supabase.from('quote_iscrizione').select('*', { count: 'exact', head: true }).eq('club_id', clubId).in('stato', ['non_pagato', 'parziale']),
    supabase.from('prima_nota').select('importo').eq('club_id', clubId).eq('tipo', 'entrata').gte('data', inizioMese),
    supabase.from('prima_nota').select('importo').eq('club_id', clubId).eq('tipo', 'uscita').gte('data', inizioMese),
    supabase.from('partite').select('avversario, gol_fatti, gol_subiti, data_ora, casa_trasferta').eq('stato', 'giocata').order('data_ora', { ascending: false }).limit(5),
    supabase.from('certificati_medici').select('*', { count: 'exact', head: true }).eq('club_id', clubId).lte('data_scadenza', new Date(oggi.getTime() + 30 * 86400000).toISOString().split('T')[0]).gte('data_scadenza', oggi.toISOString().split('T')[0]),
    supabase.from('contratti').select('*', { count: 'exact', head: true }).eq('club_id', clubId).lte('data_scadenza', new Date(oggi.getTime() + 90 * 86400000).toISOString().split('T')[0]).gte('data_scadenza', oggi.toISOString().split('T')[0]),
    supabase.from('squadre').select('id, nome, categoria_eta').eq('club_id', clubId).eq('attiva', true),
    supabase.from('sponsors').select('id, nome, tipo, importo_annuo, attivo').eq('club_id', clubId).eq('attivo', true).limit(5),
  ])

  const totEntrate = entrateMese?.reduce((s, r) => s + Number(r.importo), 0) ?? 0
  const totUscite  = usciteMese?.reduce((s, r) => s + Number(r.importo), 0) ?? 0
  const saldo      = totEntrate - totUscite

  const fmtEuro = (v: number) => v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  const alertTotale = (certInScadenza ?? 0) + (contrInScadenza ?? 0) + (quoteArretrate ?? 0)

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Presidenza</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Riepilogo esecutivo — {oggi.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <ScadenzeFIGCWidget compact={true} />

      <AzioniRapide ruolo="presidente" />

      <ImpiantiDashboardWidget ruolo="presidente" />

      {alertTotale > 0 && (
      <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>
            {certInScadenza! > 0 && <><strong>{certInScadenza} certificati</strong> in scadenza. </>}
            {contrInScadenza! > 0 && <><strong>{contrInScadenza} contratti</strong> in scadenza (90gg). </>}
            {quoteArretrate! > 0 && <><strong>{quoteArretrate} quote</strong> non pagate.</>}
          </span>
        </div>
      )}

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Tesserati</div>
          <div className="stat-value">{totTesserati ?? 0}</div>
          <div className="stat-sub">{squadre?.length ?? 0} squadre attive</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Entrate mese</div>
          <div className="stat-value" style={{ fontSize: 22, color: 'var(--accent-green)' }}>{fmtEuro(totEntrate)}</div>
          <div className="stat-sub" style={{ color: saldo >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            Saldo: {fmtEuro(saldo)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Uscite mese</div>
          <div className="stat-value" style={{ fontSize: 22, color: 'var(--accent-red)' }}>{fmtEuro(totUscite)}</div>
          <div className="stat-sub">{usciteMese?.length ?? 0} movimenti</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Quote pagate</div>
          <div className="stat-value">{quotePagate ?? 0}</div>
          <div className="stat-sub" style={{ color: 'var(--accent-red)' }}>{quoteArretrate ?? 0} arretrate</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Ultime partite */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Ultimi risultati</span>
            <Link href="/dashboard/presidente/risultati" style={{ fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>Vedi tutti →</Link>
          </div>
          {ultimiRisultati && ultimiRisultati.length > 0 ? (
            <div>
              {ultimiRisultati.map((p, i) => {
                const vinto    = (p.gol_fatti ?? 0) > (p.gol_subiti ?? 0)
                const pareggio = (p.gol_fatti ?? 0) === (p.gol_subiti ?? 0)
                return (
                  <div key={i} style={{
                    padding: '11px 18px',
                    borderBottom: '1px solid var(--border-light)',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: vinto ? 'var(--accent-green-lt)' : pareggio ? 'var(--accent-orange-lt)' : 'var(--accent-red-lt)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      color: vinto ? 'var(--accent-green)' : pareggio ? 'var(--accent-orange)' : 'var(--accent-red)',
                    }}>
                      {vinto ? 'V' : pareggio ? 'P' : 'S'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {p.casa_trasferta === 'casa' ? 'vs' : '@'} {p.avversario}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(p.data_ora).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {p.gol_fatti} - {p.gol_subiti}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nessun risultato registrato
            </div>
          )}
        </div>

        {/* Squadre + Sponsor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Squadre attive</span>
              <Link href="/dashboard/presidente/club" style={{ fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>Dettaglio →</Link>
            </div>
            {squadre && squadre.length > 0 ? (
              <div>
                {squadre.map(s => (
                  <div key={s.id} style={{
                    padding: '10px 18px',
                    borderBottom: '1px solid var(--border-light)',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: 'var(--accent-green)', flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{s.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {s.categoria_eta.toUpperCase().replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Nessuna squadra attiva
              </div>
            )}
          </div>

          {/* Sponsor preview */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Sponsor</span>
              <Link href="/dashboard/presidente/sponsor" style={{ fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>Gestisci →</Link>
            </div>
            {sponsors && sponsors.length > 0 ? (
              <div>
                {sponsors.map(s => (
                  <div key={s.id} style={{
                    padding: '10px 18px',
                    borderBottom: '1px solid var(--border-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={`badge ${s.tipo === 'gold' ? 'badge-ambra' : s.tipo === 'silver' ? 'badge-grigio' : 'badge-viola'}`}>
                        {s.tipo}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{s.nome}</span>
                    </div>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {s.importo_annuo ? Number(s.importo_annuo).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Nessuno sponsor configurato
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Link rapidi */}
      <div className="card" style={{ padding: 18, marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link href="/dashboard/presidente/finanze" className="btn btn-secondary btn-sm">Entrate & Uscite</Link>
        <Link href="/dashboard/presidente/ffp" className="btn btn-secondary btn-sm">FFP / Budget</Link>
        <Link href="/dashboard/presidente/sponsor" className="btn btn-secondary btn-sm">Sponsor</Link>
        <Link href="/dashboard/presidente/staff" className="btn btn-secondary btn-sm">Gestione staff</Link>
        <Link href="/dashboard/presidente/obiettivi" className="btn btn-secondary btn-sm">Obiettivi stagionali</Link>
        <Link href="/dashboard/presidente/comunicazioni" className="btn btn-secondary btn-sm">Comunicazioni</Link>
        <Link href="/dashboard/presidente/report" className="btn btn-primary btn-sm">Report mensile</Link>
      </div>
    </div>
  )
}
