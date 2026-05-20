'use client'
import FeatureGate from '@/components/FeatureGate'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const STAGIONI = ['2024/25', '2025/26', '2026/27', '2027/28']

function stagioneCorrente(): string {
  const now = new Date()
  const anno = now.getFullYear()
  const mese = now.getMonth() + 1
  const inizio = mese >= 7 ? anno : anno - 1
  return `${inizio}/${String(inizio + 1).slice(2)}`
}

interface Trattativa {
  id: string
  nome_giocatore: string | null
  giocatore_nome: string | null
  tipo: string | null
  tipo_operazione: string | null
  stato: string
  importo_accordo: number | null
  valore_stimato: number | null
  club_provenienza: string | null
  club_destinazione: string | null
  ruolo: string | null
}

const getTipo  = (t: Trattativa) => t.tipo ?? t.tipo_operazione ?? ''
const getValore = (t: Trattativa) => t.importo_accordo ?? t.valore_stimato ?? 0
const getNome  = (t: Trattativa) => t.nome_giocatore ?? t.giocatore_nome ?? '—'

function fmt(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

const TIPO_BADGE: Record<string, string> = {
  acquisto:    'badge-rosso',
  cessione:    'badge-verde',
  prestito_in: 'badge-blu',
  prestito_out:'badge-ambra',
  svincolo:    'badge-viola',
  prestito:    'badge-blu',
}

const TIPO_LABEL: Record<string, string> = {
  acquisto: 'Acquisto', cessione: 'Cessione', prestito_in: 'Prestito in',
  prestito_out: 'Prestito out', svincolo: 'Svincolo', prestito: 'Prestito',
}

const STATO_BADGE: Record<string, string> = {
  esplorazione: 'badge-grigio', scouting: 'badge-grigio', contatto: 'badge-grigio',
  proposta: 'badge-ambra', trattativa: 'badge-ambra', accordo: 'badge-blu',
  conclusa: 'badge-verde', chiuso: 'badge-verde', saltata: 'badge-rosso',
}

const STATO_LABEL: Record<string, string> = {
  esplorazione: 'Esplorazione', scouting: 'Scouting', contatto: 'Contatto',
  proposta: 'Proposta', trattativa: 'Trattativa', accordo: 'Accordo',
  conclusa: 'Conclusa', chiuso: 'Chiuso', saltata: 'Saltata',
}

function BarraBudget({ usato, totale }: { usato: number; totale: number }) {
  if (totale <= 0) return null
  const pct = Math.min((usato / totale) * 100, 100)
  const colore = pct < 70 ? 'var(--accent)' : pct < 90 ? 'var(--ambra)' : 'var(--rosso)'
  return (
    <div style={{ background: 'var(--gray-mid)', borderRadius: 2, height: 6, overflow: 'hidden', marginTop: 8 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: colore, transition: 'width .4s' }} />
    </div>
  )
}

export default function BudgetMercatoDS() {
  const supabase = createClient()
  const [stagione, setStagione] = useState(stagioneCorrente)
  const [budgetMercato, setBudgetMercato] = useState<number>(0)
  const [trattative, setTrattative] = useState<Trattativa[]>([])
  const [loading, setLoading] = useState(true)
  const [clubId, setClubId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      if (!data.user) return
      supabase.from('utenti').select('club_id').eq('id', data.user.id).single()
        .then(({ data: u }: { data: { club_id: string } | null }) => {
          if (u?.club_id) setClubId(u.club_id)
        })
    })
  }, [])

  useEffect(() => {
    if (!clubId) return
    setLoading(true)
    const annoInizio = parseInt(stagione.slice(0, 4))

    Promise.all([
      supabase.from('budget_stagionale').select('budget_mercato')
        .eq('club_id', clubId).eq('stagione_riferimento', stagione).single(),
      supabase.from('trattative')
        .select('id, nome_giocatore, giocatore_nome, tipo, tipo_operazione, stato, importo_accordo, valore_stimato, club_provenienza, club_destinazione, ruolo')
        .eq('club_id', clubId)
        .gte('created_at', `${annoInizio}-07-01`)
        .lte('created_at', `${annoInizio + 1}-06-30`),
    ]).then(([b, t]) => {
      setBudgetMercato(b.data?.budget_mercato ?? 0)
      setTrattative(t.data ?? [])
      setLoading(false)
    })
  }, [clubId, stagione])

  const chiuse = trattative.filter(t => t.stato === 'conclusa' || t.stato === 'chiuso')
  const totaleAcquisti = chiuse.filter(t => getTipo(t) === 'acquisto' || getTipo(t) === 'prestito_in').reduce((s, t) => s + getValore(t), 0)
  const totaleUscite   = chiuse.filter(t => getTipo(t) === 'cessione' || getTipo(t) === 'prestito_out').reduce((s, t) => s + getValore(t), 0)
  const saldo = budgetMercato - totaleAcquisti + totaleUscite

  return (
    <FeatureGate feature="budget_mercato_ds" featureLabel="Budget Mercato DS">
        <div style={{ padding: '28px 32px', maxWidth: 1000, animation: 'fadeIn .3s ease' }}>

          {/* header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ display: 'block', width: 20, height: 1, background: 'var(--accent)' }} />
              Budget di Mercato
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)', lineHeight: 1 }}>
              Mercato
            </h1>
            <p style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>Budget assegnato dal Presidente per le operazioni di mercato</p>
          </div>

          {/* stagione */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
            {STAGIONI.map(s => (
              <button key={s} onClick={() => setStagione(s)}
                className={`btn btn-sm ${stagione === s ? 'btn-primary' : 'btn-secondary'}`}>
                {s}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ color: 'var(--gray)', padding: 48, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: 2 }}>CARICAMENTO...</div>
          ) : (
            <>
              {budgetMercato === 0 && (
                <div className="alert alert-warning" style={{ marginBottom: 20 }}>
                  ⚠ Il Presidente non ha ancora impostato il budget di mercato per questa stagione
                </div>
              )}

              {/* KPI */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 20 }}>
                {[
                  { label: 'Budget mercato', value: fmt(budgetMercato), sub: 'Assegnato dal Presidente' },
                  { label: 'Totale acquisti', value: fmt(totaleAcquisti), sub: 'Operazioni chiuse in entrata', accent: 'var(--rosso)' },
                  { label: 'Totale cessioni', value: fmt(totaleUscite), sub: 'Operazioni chiuse in uscita', accent: 'var(--accent)' },
                  { label: 'Saldo disponibile', value: fmt(saldo), sub: 'Budget residuo', accent: saldo >= 0 ? 'var(--accent)' : 'var(--rosso)' },
                ].map(k => (
                  <div key={k.label} className="stat-card" style={{ borderRadius: 0, border: 'none' }}>
                    <div className="stat-label">{k.label}</div>
                    <div className="stat-value" style={{ fontSize: '1.6rem', color: k.accent ?? 'var(--accent)' }}>{k.value}</div>
                    <div className="stat-sub">{k.sub}</div>
                  </div>
                ))}
              </div>

              {/* barra utilizzo */}
              {budgetMercato > 0 && (
                <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#444', marginBottom: 6 }}>
                    <span>Utilizzo budget mercato</span>
                    <span style={{ color: 'var(--white)' }}>{budgetMercato > 0 ? Math.round(Math.min((totaleAcquisti / budgetMercato) * 100, 100)) : 0}%</span>
                  </div>
                  <BarraBudget usato={totaleAcquisti} totale={budgetMercato} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--gray)', marginTop: 6 }}>
                    <span>{fmt(totaleAcquisti)} spesi</span>
                    <span>{fmt(budgetMercato)} totale</span>
                  </div>
                </div>
              )}

              {/* tabella */}
              <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-solid)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--white)' }}>Tutte le trattative</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#444', letterSpacing: 2 }}>{trattative.length} OPERAZIONI</span>
                </div>
                {trattative.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: 2 }}>
                    NESSUNA TRATTATIVA REGISTRATA
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Giocatore</th><th>Ruolo</th><th>Tipo</th><th>Stato</th><th>Club</th><th>Valore</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trattative.map(t => (
                          <tr key={t.id}>
                            <td style={{ fontWeight: 600, color: 'var(--white)', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>{getNome(t)}</td>
                            <td style={{ color: 'var(--gray)', fontSize: 12 }}>{t.ruolo ?? '—'}</td>
                            <td><span className={`badge ${TIPO_BADGE[getTipo(t)] ?? 'badge-grigio'}`}>{TIPO_LABEL[getTipo(t)] ?? getTipo(t)}</span></td>
                            <td><span className={`badge ${STATO_BADGE[t.stato] ?? 'badge-grigio'}`}>{STATO_LABEL[t.stato] ?? t.stato}</span></td>
                            <td style={{ color: 'var(--gray)', fontSize: 12 }}>
                              {getTipo(t) === 'acquisto' || getTipo(t) === 'prestito_in' ? (t.club_provenienza ?? '—') : (t.club_destinazione ?? '—')}
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: getValore(t) > 0 ? 'var(--accent)' : '#444', fontWeight: 700 }}>
                              {getValore(t) > 0 ? fmt(getValore(t)) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* riepilogo */}
              {chiuse.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', marginTop: 1 }}>
                  {[
                    {
                      label: 'Acquisti / Prestiti in',
                      count: chiuse.filter(t => getTipo(t) === 'acquisto' || getTipo(t) === 'prestito_in').length,
                      val: totaleAcquisti, color: 'var(--rosso)',
                    },
                    {
                      label: 'Cessioni / Prestiti out',
                      count: chiuse.filter(t => getTipo(t) === 'cessione' || getTipo(t) === 'prestito_out').length,
                      val: totaleUscite, color: 'var(--accent)',
                    },
                    {
                      label: 'Saldo netto operazioni',
                      count: null,
                      val: totaleUscite - totaleAcquisti,
                      color: totaleUscite >= totaleAcquisti ? 'var(--accent)' : 'var(--rosso)',
                      prefix: totaleUscite >= totaleAcquisti ? '+' : '',
                    },
                  ].map(r => (
                    <div key={r.label} className="stat-card" style={{ borderRadius: 0, border: 'none' }}>
                      <div className="stat-label">{r.label}</div>
                      <div className="stat-value" style={{ fontSize: '1.4rem', color: r.color }}>
                        {r.prefix ?? ''}{fmt(r.val)}
                      </div>
                      {r.count !== null && <div className="stat-sub">{r.count} operazioni concluse</div>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
    </FeatureGate>
  )
}
