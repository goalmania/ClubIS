import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AzioniRapide from '@/components/ui/AzioniRapide'
import ImpiantiDashboardWidget from '@/components/features/ImpiantiDashboardWidget'
import ScadenzeFIGCWidget from '@/components/features/ScadenzeFIGCWidget'
import RischioCovisocWidget from '@/components/features/RischioCovisocWidget'
import { categoriaFederaleDaEta, CATEGORIE_FEDERALI } from '@/lib/settore-giovanile'

export default async function PresidenteDashboard() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  const { clubId } = ctx

  const supabase = createAdminClient()

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
    { data: clubInfo },
  ] = await Promise.all([
    supabase.from('tesseramenti').select('*', { count: 'exact', head: true }).eq('club_id', clubId).eq('stato', 'attivo'),
    supabase.from('quote_iscrizione').select('*', { count: 'exact', head: true }).eq('club_id', clubId).eq('stato', 'pagato'),
    supabase.from('quote_iscrizione').select('*', { count: 'exact', head: true }).eq('club_id', clubId).in('stato', ['non_pagato', 'parziale']),
    supabase.from('prima_nota').select('importo').eq('club_id', clubId).eq('tipo', 'entrata').gte('data', inizioMese),
    supabase.from('prima_nota').select('importo').eq('club_id', clubId).eq('tipo', 'uscita').gte('data', inizioMese),
    supabase.from('partite').select('avversario, gol_fatti, gol_subiti, data_ora, casa_trasferta').eq('club_id', clubId).eq('stato', 'giocata').order('data_ora', { ascending: false }).limit(5),
    supabase.from('certificati_medici').select('*', { count: 'exact', head: true }).eq('club_id', clubId).lte('data_scadenza', new Date(oggi.getTime() + 30 * 86400000).toISOString().split('T')[0]).gte('data_scadenza', oggi.toISOString().split('T')[0]),
    supabase.from('contratti').select('*', { count: 'exact', head: true }).eq('club_id', clubId).lte('data_scadenza', new Date(oggi.getTime() + 90 * 86400000).toISOString().split('T')[0]).gte('data_scadenza', oggi.toISOString().split('T')[0]),
    supabase.from('squadre').select('id, nome, categoria_eta').eq('club_id', clubId).eq('attiva', true),
    supabase.from('sponsors').select('id, nome, tipo, importo_annuo, attivo').eq('club_id', clubId).eq('attivo', true).limit(5),
    supabase.from('clubs').select('tipo_prodotto').eq('id', clubId).maybeSingle(),
  ])

  const isScuolaCalcio = clubInfo?.tipo_prodotto === 'scuola_calcio_standalone'

  const totEntrate = entrateMese?.reduce((s, r) => s + Number(r.importo), 0) ?? 0
  const totUscite  = usciteMese?.reduce((s, r) => s + Number(r.importo), 0) ?? 0
  const saldo      = totEntrate - totUscite

  const fmtEuro = (v: number) => v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  const alertTotale = (certInScadenza ?? 0) + (contrInScadenza ?? 0) + (quoteArretrate ?? 0)

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="pagina-testa">
        <h1>Presidenza</h1>
        <p>Riepilogo esecutivo · {oggi.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Statistiche: la prima in lime */}
      <div className="kpi-riga">
        <Link href="/dashboard/presidente/club" className="stat-card">
          <div className="stat-label">{isScuolaCalcio ? 'Iscritti' : 'Tesserati'}</div>
          <div className="stat-value">{totTesserati ?? 0}</div>
          <div className="stat-sub">{squadre?.length ?? 0} {isScuolaCalcio ? 'categorie attive' : 'squadre attive'}</div>
        </Link>
        <Link href="/dashboard/presidente/finanze" className="stat-card">
          <div className="stat-label">Entrate mese</div>
          <div className="stat-value">{fmtEuro(totEntrate)}</div>
          <div className="stat-sub" style={{ color: saldo >= 0 ? 'var(--accent)' : 'var(--accent-red)' }}>Saldo: {fmtEuro(saldo)}</div>
        </Link>
        <Link href="/dashboard/presidente/finanze" className="stat-card">
          <div className="stat-label">Uscite mese</div>
          <div className="stat-value">{fmtEuro(totUscite)}</div>
          <div className="stat-sub">{usciteMese?.length ?? 0} movimenti</div>
        </Link>
        <Link href="/dashboard/segretario/pagamenti" className="stat-card">
          <div className="stat-label">Quote pagate</div>
          <div className="stat-value">{quotePagate ?? 0}</div>
          <div className="stat-sub" style={{ color: (quoteArretrate ?? 0) > 0 ? 'var(--accent-red)' : undefined }}>{quoteArretrate ?? 0} arretrate</div>
        </Link>
      </div>

      <div className="dash-griglia">
        {/* Colonna principale: cosa fare adesso */}
        <div className="dash-colonna">
          {(!isScuolaCalcio || alertTotale > 0) && (
            <section className="da-fare">
              <div className="sezione-testa"><h2>Da fare</h2>{!isScuolaCalcio && <Link href="/dashboard/segretario/scadenze-figc">Scadenziario FIGC</Link>}</div>
              {!isScuolaCalcio && (
                <>
                  <ScadenzeFIGCWidget compact={true} />
                  <RischioCovisocWidget />
                </>
              )}
              {alertTotale > 0 && (
                <div className="alert alert-warning" style={{ marginBottom: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span>
                    {certInScadenza! > 0 && <><strong>{certInScadenza} certificati</strong> in scadenza. </>}
                    {contrInScadenza! > 0 && <><strong>{contrInScadenza} contratti</strong> in scadenza (90gg). </>}
                    {quoteArretrate! > 0 && <><strong>{quoteArretrate} quote</strong> non pagate.</>}
                  </span>
                </div>
              )}
            </section>
          )}

          <AzioniRapide ruolo="presidente" variante={isScuolaCalcio ? 'scuola_calcio' : 'agonistico'} />

          <section className="card pannello">
            <div className="pannello-testa"><h2>Ultimi risultati</h2><Link href="/dashboard/presidente/risultati">Vedi tutti</Link></div>
            {ultimiRisultati && ultimiRisultati.length > 0 ? (
              ultimiRisultati.map((p, i) => {
                const vinto    = (p.gol_fatti ?? 0) > (p.gol_subiti ?? 0)
                const pareggio = (p.gol_fatti ?? 0) === (p.gol_subiti ?? 0)
                return (
                  <div key={i} className="riga">
                    <span className="riga-icona" style={{
                      background: vinto ? '#c8f000' : pareggio ? 'rgba(255,181,71,0.16)' : 'rgba(255,107,94,0.16)',
                      color: vinto ? '#0b0c0a' : pareggio ? '#ffb547' : '#ff8a7d', fontSize: 12, fontWeight: 700,
                    }}>{vinto ? 'V' : pareggio ? 'P' : 'S'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{p.casa_trasferta === 'casa' ? 'vs' : '@'} {p.avversario}</div>
                      <div className="riga-sub">{new Date(p.data_ora).toLocaleDateString('it-IT')}</div>
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 650, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{p.gol_fatti} - {p.gol_subiti}</div>
                  </div>
                )
              })
            ) : (
              <div className="riga riga-vuota">
                <span className="riga-icona neutra"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg></span>
                Nessun risultato registrato
              </div>
            )}
          </section>
        </div>

        {/* Colonna di stato */}
        <div className="dash-colonna">
          {!isScuolaCalcio && <ImpiantiDashboardWidget ruolo="presidente" />}

          <section className="card pannello">
            <div className="pannello-testa"><h2>{isScuolaCalcio ? 'Categorie attive' : 'Squadre attive'} <span className="conta">· {squadre?.length ?? 0}</span></h2><Link href="/dashboard/presidente/club">Dettaglio</Link></div>
            {squadre && squadre.length > 0 ? (
              <div className="squadre-griglia">
                {squadre.map(s => (
                  <div key={s.id} className="squadra-voce">
                    <span className="pallino-lime" />
                    <span className="squadra-nome">{s.nome}</span>
                    {(() => {
                      const cat = isScuolaCalcio && categoriaFederaleDaEta(s.categoria_eta)
                        ? CATEGORIE_FEDERALI[categoriaFederaleDaEta(s.categoria_eta)!].label
                        : s.categoria_eta.replace(/_/g, ' ')
                      // La categoria si mostra solo se aggiunge qualcosa al nome
                      return cat.toLowerCase() !== s.nome.toLowerCase() ? <span className="squadra-cat">{cat}</span> : null
                    })()}
                  </div>
                ))}
              </div>
            ) : (
              <div className="riga riga-vuota">Nessuna squadra attiva</div>
            )}
          </section>

          <section className="card pannello">
            <div className="pannello-testa"><h2>Sponsor</h2><Link href="/dashboard/presidente/sponsor">Gestisci</Link></div>
            {sponsors && sponsors.length > 0 ? (
              sponsors.map(s => (
                <div key={s.id} className="riga">
                  <span className="riga-icona"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h18v13H3zM8 7V4h8v3M3 13h18"/></svg></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{s.nome}</div>
                    <div className="riga-sub" style={{ textTransform: 'capitalize' }}>{s.tipo}</div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>
                    {s.importo_annuo ? Number(s.importo_annuo).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : '—'}
                  </span>
                </div>
              ))
            ) : (
              <div className="riga riga-vuota">Nessuno sponsor configurato</div>
            )}
          </section>
        </div>
      </div>

      {/* Vai a: collegamenti rapidi */}
      <div className="card vai-a">
        <span className="vai-a-titolo">Vai a</span>
        {isScuolaCalcio ? (
          <>
            <Link href="/dashboard/presidente/finanze" className="btn btn-secondary btn-sm">Entrate & Uscite</Link>
            <Link href="/dashboard/presidente/staff" className="btn btn-secondary btn-sm">Gestione staff</Link>
            <Link href="/dashboard/presidente/abbonamento" className="btn btn-secondary btn-sm">Abbonamento</Link>
            <Link href="/dashboard/presidente/comunicazioni" className="btn btn-primary btn-sm">Comunicazioni</Link>
          </>
        ) : (
          <>
            <Link href="/dashboard/presidente/finanze" className="btn btn-secondary btn-sm">Entrate & Uscite</Link>
            <Link href="/dashboard/presidente/ffp" className="btn btn-secondary btn-sm">FFP / Budget</Link>
            <Link href="/dashboard/presidente/sponsor" className="btn btn-secondary btn-sm">Sponsor</Link>
            <Link href="/dashboard/presidente/staff" className="btn btn-secondary btn-sm">Gestione staff</Link>
            <Link href="/dashboard/presidente/obiettivi" className="btn btn-secondary btn-sm">Obiettivi stagionali</Link>
            <Link href="/dashboard/presidente/comunicazioni" className="btn btn-secondary btn-sm">Comunicazioni</Link>
            <Link href="/dashboard/presidente/report" className="btn btn-primary btn-sm">Report mensile</Link>
          </>
        )}
      </div>
    </div>
  )
}
