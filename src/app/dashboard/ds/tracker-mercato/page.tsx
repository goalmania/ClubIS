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
  note: string | null
  created_at: string
}

const getTipo   = (t: Trattativa) => t.tipo ?? t.tipo_operazione ?? ''
const getValore = (t: Trattativa) => t.importo_accordo ?? t.valore_stimato ?? 0
const getNome   = (t: Trattativa) => t.nome_giocatore ?? t.giocatore_nome ?? '—'

function fmt(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

const TIPO_BADGE: Record<string, string> = {
  acquisto: 'badge-rosso', cessione: 'badge-verde',
  prestito_in: 'badge-blu', prestito_out: 'badge-ambra',
  svincolo: 'badge-viola', prestito: 'badge-blu',
}
const TIPO_LABEL: Record<string, string> = {
  acquisto: 'Acquisto', cessione: 'Cessione', prestito_in: 'Prestito in',
  prestito_out: 'Prestito out', svincolo: 'Svincolo', prestito: 'Prestito',
}
const TIPO_SEGNO: Record<string, 1 | -1> = {
  acquisto: -1, prestito_in: -1, svincolo: -1,
  cessione: 1, prestito_out: 1, prestito: -1,
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

const TIPO_CONFIG = [
  { key: 'acquisto',     label: 'Acquisti',     badge: 'badge-rosso' },
  { key: 'cessione',     label: 'Cessioni',     badge: 'badge-verde' },
  { key: 'prestito_in',  label: 'Prestiti in',  badge: 'badge-blu' },
  { key: 'prestito_out', label: 'Prestiti out', badge: 'badge-ambra' },
]

const FILTRI_STATO = [
  { key: 'tutti', label: 'Tutte' },
  { key: 'attive', label: 'In corso' },
  { key: 'conclusa', label: 'Concluse' },
  { key: 'saltata', label: 'Saltate' },
]

function BarraFlusso({ label, valore, totale, color }: { label: string; valore: number; totale: number; color: string }) {
  const pct = totale > 0 ? Math.min((valore / totale) * 100, 100) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#444', marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color: 'var(--white)' }}>{fmt(valore)}</span>
      </div>
      <div style={{ background: 'var(--gray-mid)', height: 4, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width .4s' }} />
      </div>
    </div>
  )
}

export default function TrackerMercatoDS() {
  const supabase = createClient()
  const [stagione, setStagione] = useState(stagioneCorrente)
  const [trattative, setTrattative] = useState<Trattativa[]>([])
  const [budgetMercato, setBudgetMercato] = useState(0)
  const [loading, setLoading] = useState(true)
  const [clubId, setClubId] = useState<string | null>(null)
  const [filtroStato, setFiltroStato] = useState('tutti')
  const [filtroTipo, setFiltroTipo] = useState('tutti')

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
        .select('id, nome_giocatore, giocatore_nome, tipo, tipo_operazione, stato, importo_accordo, valore_stimato, club_provenienza, club_destinazione, ruolo, note, created_at')
        .eq('club_id', clubId)
        .gte('created_at', `${annoInizio}-07-01`)
        .lte('created_at', `${annoInizio + 1}-06-30`)
        .order('created_at', { ascending: false }),
    ]).then(([b, t]) => {
      setBudgetMercato(b.data?.budget_mercato ?? 0)
      setTrattative(t.data ?? [])
      setLoading(false)
    })
  }, [clubId, stagione])

  const filtrate = trattative.filter(t => {
    const ms = filtroStato === 'tutti' ? true
      : filtroStato === 'attive' ? !['conclusa','chiuso','saltata'].includes(t.stato)
      : t.stato === filtroStato || (filtroStato === 'conclusa' && t.stato === 'chiuso')
    const mt = filtroTipo === 'tutti' || getTipo(t) === filtroTipo
    return ms && mt
  })

  const chiuse = trattative.filter(t => t.stato === 'conclusa' || t.stato === 'chiuso')
  const totaleAcquisti = chiuse.filter(t => getTipo(t) === 'acquisto' || getTipo(t) === 'prestito_in').reduce((s, t) => s + getValore(t), 0)
  const totaleUscite   = chiuse.filter(t => getTipo(t) === 'cessione' || getTipo(t) === 'prestito_out').reduce((s, t) => s + getValore(t), 0)
  const riferimento    = Math.max(budgetMercato, totaleAcquisti, 1)

  return (
    <FeatureGate feature="trattative_mercato" featureLabel="Tracker Movimenti Mercato">
        <div data-onboarding="section-tracker-mercato" style={{ padding: '28px 32px', maxWidth: 1100, animation: 'fadeIn .3s ease' }}>

          {/* header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ display: 'block', width: 20, height: 1, background: 'var(--accent)' }} />
              Mercato — Tracker
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)', lineHeight: 1 }}>
              Movimenti
            </h1>
            <p style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>Monitoraggio completo delle operazioni di mercato per stagione</p>
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
              {/* contatori per tipo */}
              {trattative.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 20 }}>
                  {TIPO_CONFIG.map(cfg => {
                    const all    = trattative.filter(t => getTipo(t) === cfg.key)
                    const closed = chiuse.filter(t => getTipo(t) === cfg.key)
                    const tot    = closed.reduce((s, t) => s + getValore(t), 0)
                    return (
                      <div key={cfg.key} className="stat-card" style={{ borderRadius: 0, border: 'none' }}>
                        <div style={{ marginBottom: 8 }}>
                          <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                        </div>
                        <div className="stat-value" style={{ fontSize: '2.2rem' }}>{all.length}</div>
                        <div className="stat-sub">
                          {closed.length} concluse{tot > 0 ? ` · ${fmt(tot)}` : ''}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* flusso finanziario */}
              <div className="card" style={{ padding: '18px 22px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--white)' }}>
                    Flusso finanziario mercato
                  </span>
                  {budgetMercato > 0 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: (budgetMercato - totaleAcquisti + totaleUscite) >= 0 ? 'var(--accent)' : 'var(--rosso)', fontWeight: 700 }}>
                      Residuo: {fmt(budgetMercato - totaleAcquisti + totaleUscite)}
                    </span>
                  )}
                </div>
                <BarraFlusso label="Acquisti (uscite)" valore={totaleAcquisti} totale={riferimento} color="var(--rosso)" />
                <BarraFlusso label="Cessioni (entrate)" valore={totaleUscite} totale={riferimento} color="var(--accent)" />
                {budgetMercato > 0 && (
                  <BarraFlusso
                    label={`Budget utilizzato · ${Math.round(Math.min(((totaleAcquisti - totaleUscite) / budgetMercato) * 100, 100))}% di ${fmt(budgetMercato)}`}
                    valore={Math.max(0, totaleAcquisti - totaleUscite)}
                    totale={budgetMercato}
                    color={
                      (totaleAcquisti - totaleUscite) / budgetMercato < 0.7 ? 'var(--accent)'
                      : (totaleAcquisti - totaleUscite) / budgetMercato < 0.9 ? 'var(--ambra)'
                      : 'var(--rosso)'
                    }
                  />
                )}
              </div>

              {/* filtri */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {FILTRI_STATO.map(f => (
                    <button key={f.key} onClick={() => setFiltroStato(f.key)}
                      className={`btn btn-sm ${filtroStato === f.key ? 'btn-secondary' : 'btn-ghost'}`}
                      style={{ borderColor: filtroStato === f.key ? 'var(--accent)' : undefined, color: filtroStato === f.key ? 'var(--accent)' : undefined }}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <div style={{ width: 1, height: 20, background: 'var(--border-solid)' }} />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <button onClick={() => setFiltroTipo('tutti')}
                    className={`btn btn-sm ${filtroTipo === 'tutti' ? 'btn-secondary' : 'btn-ghost'}`}
                    style={{ borderColor: filtroTipo === 'tutti' ? 'var(--accent)' : undefined, color: filtroTipo === 'tutti' ? 'var(--accent)' : undefined }}>
                    Tutti
                  </button>
                  {TIPO_CONFIG.map(f => (
                    <button key={f.key} onClick={() => setFiltroTipo(f.key)}
                      className={`btn btn-sm ${filtroTipo === f.key ? 'btn-secondary' : 'btn-ghost'}`}
                      style={{ borderColor: filtroTipo === f.key ? 'var(--accent)' : undefined, color: filtroTipo === f.key ? 'var(--accent)' : undefined }}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#444', letterSpacing: 2 }}>
                  {filtrate.length} / {trattative.length}
                </span>
              </div>

              {/* tabella */}
              <div className="card" style={{ overflow: 'hidden' }}>
                {filtrate.length === 0 ? (
                  <div style={{ padding: 48, textAlign: 'center', color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: 2 }}>
                    {trattative.length === 0 ? 'NESSUNA TRATTATIVA REGISTRATA' : 'NESSUNA CORRISPONDENZA CON I FILTRI'}
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Giocatore</th><th>Ruolo</th><th>Tipo</th><th>Club</th><th>Stato</th><th>Impatto</th><th>Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtrate.map(t => {
                          const tipo    = getTipo(t)
                          const valore  = getValore(t)
                          const isChiusa = t.stato === 'conclusa' || t.stato === 'chiuso'
                          const segno   = TIPO_SEGNO[tipo] ?? -1
                          const impattoColor = segno === 1 ? 'var(--accent)' : 'var(--rosso)'
                          return (
                            <tr key={t.id}>
                              <td>
                                <div style={{ fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 13 }}>{getNome(t)}</div>
                                {t.note && <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note}</div>}
                              </td>
                              <td style={{ color: 'var(--gray)', fontSize: 12 }}>{t.ruolo ?? '—'}</td>
                              <td><span className={`badge ${TIPO_BADGE[tipo] ?? 'badge-grigio'}`}>{TIPO_LABEL[tipo] ?? tipo}</span></td>
                              <td style={{ color: 'var(--gray)', fontSize: 12 }}>
                                {tipo === 'acquisto' || tipo === 'prestito_in' ? (t.club_provenienza ?? '—') : (t.club_destinazione ?? '—')}
                              </td>
                              <td><span className={`badge ${STATO_BADGE[t.stato] ?? 'badge-grigio'}`}>{STATO_LABEL[t.stato] ?? t.stato}</span></td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>
                                {isChiusa && valore > 0
                                  ? <span style={{ color: impattoColor }}>{segno === 1 ? '+' : '−'} {fmt(valore)}</span>
                                  : <span style={{ color: '#444' }}>—</span>}
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#444', whiteSpace: 'nowrap' }}>
                                {new Date(t.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' })}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* saldo netto footer */}
              {chiuse.length > 0 && (
                <div style={{ marginTop: 1, padding: '14px 18px', background: 'var(--gray-light)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#444' }}>
                    Saldo netto operazioni concluse
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '0.05em', color: totaleUscite >= totaleAcquisti ? 'var(--accent)' : 'var(--rosso)' }}>
                    {totaleUscite >= totaleAcquisti ? '+' : ''}{fmt(totaleUscite - totaleAcquisti)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
    </FeatureGate>
  )
}
