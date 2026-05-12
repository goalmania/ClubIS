'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
// supabase client usato solo per Realtime subscriptions

/* ── helpers ──────────────────────────────────────────────────────────── */
const fmt = (n: number) =>
  n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })

function formatData(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function nomeMese(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
}

function giorniAllaScadenza(sc: string | null) {
  if (!sc) return null
  return Math.ceil((new Date(sc).getTime() - Date.now()) / 86_400_000)
}

const METODO_ICON: Record<string, string> = {
  contanti: '💵', bonifico: '🏦', carta: '💳', assegno: '📄', app: '📱',
}

const STATO_MENSILE: Record<string, { label: string; colore: string; bg: string }> = {
  da_pagare:  { label: 'Da pagare',       colore: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  in_ritardo: { label: 'In ritardo',      colore: '#EF4444', bg: 'rgba(239,68,68,0.08)'  },
  dichiarata: { label: 'In attesa conf.', colore: '#A78BFA', bg: 'rgba(167,139,250,0.08)'},
  pagata:     { label: 'Pagata',          colore: '#00C8A0', bg: 'rgba(0,200,160,0.08)'  },
  esonerata:  { label: 'Esonerata',       colore: '#9CA3AF', bg: 'rgba(156,163,175,0.08)'},
}

const STATO_RATA: Record<string, { label: string; colore: string; bg: string }> = {
  in_attesa:  { label: 'Da pagare',       colore: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  in_ritardo: { label: 'In ritardo',      colore: '#EF4444', bg: 'rgba(239,68,68,0.08)'  },
  dichiarato: { label: 'In attesa conf.', colore: '#A78BFA', bg: 'rgba(167,139,250,0.08)'},
  pagata:     { label: 'Pagata',          colore: '#00C8A0', bg: 'rgba(0,200,160,0.08)'  },
}

/* ── tipi ─────────────────────────────────────────────────────────────── */
interface QuotaMensile {
  id: string
  mese_competenza: string
  importo_mensile: number
  stato: string
  data_pagamento: string | null
  metodo_pagamento: string | null
  note: string | null
}

interface Rata {
  id: string
  numero_rata: number
  importo: number
  scadenza: string
  stato: string
  data_pagamento: string | null
  metodo_pagamento: string | null
  note: string | null
}

interface Piano {
  id: string
  descrizione: string
  importo_totale: number
  rate: Rata[]
}

interface ClubInfo {
  nome: string
  iban: string | null
  bic: string | null
  intestatario_conto: string | null
}

/* ── Modal pagamento ──────────────────────────────────────────────────── */
function ModalPaga({
  titolo, importo, causale, club,
  onClose, onSave,
}: {
  titolo: string
  importo: number
  causale: string
  club: ClubInfo | null
  onClose: () => void
  onSave: (metodo: string, data: string, note: string) => Promise<string | null>
}) {
  const [metodo,  setMetodo]  = useState<'bonifico' | 'contanti' | 'carta' | 'app'>('bonifico')
  const [data,    setData]    = useState(new Date().toISOString().split('T')[0])
  const [note,    setNote]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [errore,  setErrore]  = useState<string | null>(null)

  async function salva() {
    setSaving(true)
    setErrore(null)
    const noteFinale = note.trim() || (metodo === 'bonifico'
      ? 'Bonifico dichiarato dalla famiglia — in attesa conferma segreteria'
      : `Pagamento dichiarato dalla famiglia (${metodo})`)
    const err = await onSave(metodo, data, noteFinale)
    if (err) { setErrore(err); setSaving(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 4, width: '100%', maxWidth: 480 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-solid)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, textTransform: 'uppercase', color: 'var(--white)' }}>
            {titolo}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--gray)', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: 20 }}>
          {/* Importo */}
          <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-solid)', borderRadius: 4, marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 4 }}>Importo</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, color: '#EF4444' }}>{fmt(importo)}</div>
          </div>

          {/* Metodo */}
          <div style={{ marginBottom: 16 }}>
            <label className="label">Metodo di pagamento</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {(['bonifico', 'contanti', 'carta', 'app'] as const).map(m => (
                <button key={m} onClick={() => setMetodo(m)} style={{
                  padding: '10px 6px', border: `1px solid ${metodo === m ? 'var(--accent)' : 'var(--border-solid)'}`,
                  background: metodo === m ? 'rgba(200,240,0,0.08)' : 'transparent',
                  color: metodo === m ? 'var(--accent)' : 'var(--gray)',
                  borderRadius: 4, cursor: 'pointer', fontSize: 11,
                  fontFamily: 'var(--font-mono)', textAlign: 'center', textTransform: 'uppercase',
                }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{METODO_ICON[m]}</div>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* IBAN per bonifico */}
          {metodo === 'bonifico' && club?.iban && (
            <div style={{ padding: '12px 14px', background: 'rgba(200,240,0,0.04)', border: '1px solid rgba(200,240,0,0.2)', borderRadius: 4, marginBottom: 16, fontSize: 12, lineHeight: 1.7 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: 6 }}>Dati per il bonifico</div>
              {club.intestatario_conto && <div><strong style={{ color: 'var(--gray)' }}>Intestatario:</strong> <span style={{ color: 'var(--white)' }}>{club.intestatario_conto}</span></div>}
              <div><strong style={{ color: 'var(--gray)' }}>IBAN:</strong> <code style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{club.iban}</code></div>
              {club.bic && <div><strong style={{ color: 'var(--gray)' }}>BIC:</strong> <span style={{ color: 'var(--white)' }}>{club.bic}</span></div>}
              <div><strong style={{ color: 'var(--gray)' }}>Causale:</strong> <span style={{ color: 'var(--white)' }}>{causale}</span></div>
              <button onClick={() => navigator.clipboard.writeText(club.iban!)} style={{
                marginTop: 6, padding: '3px 10px', background: 'none',
                border: '1px solid rgba(200,240,0,0.3)', borderRadius: 3,
                color: 'var(--accent)', cursor: 'pointer', fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
              }}>📋 Copia IBAN</button>
            </div>
          )}
          {metodo === 'contanti' && (
            <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-solid)', borderRadius: 4, marginBottom: 16, fontSize: 13, color: 'var(--gray)' }}>
              💵 Recati in segreteria con <strong style={{ color: 'var(--white)' }}>{fmt(importo)}</strong>.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div><label className="label">Data</label><input className="input" type="date" value={data} onChange={e => setData(e.target.value)} /></div>
            <div><label className="label">Note (opz.)</label><input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="es. rif. bonifico" /></div>
          </div>

          {metodo === 'bonifico' && (
            <div style={{ fontSize: 11, color: 'var(--gray)', marginBottom: 14, lineHeight: 1.5 }}>
              ℹ️ Dopo aver effettuato il bonifico clicca &quot;Dichiara&quot;. La segreteria confermerà l&apos;accredito.
            </div>
          )}

          {errore && <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, fontSize: 12, color: '#EF4444', marginBottom: 14 }}>{errore}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-sm" onClick={onClose} disabled={saving}>Annulla</button>
            <button className="btn btn-primary btn-sm" onClick={salva} disabled={saving} style={{ minWidth: 160 }}>
              {saving ? 'Salvataggio…' : metodo === 'bonifico' ? 'Dichiara bonifico effettuato' : 'Dichiara pagamento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Pagina unificata ─────────────────────────────────────────────────── */
export default function FamigliaPagamentiPage() {
  const supabase   = createClient()
  const chanRef    = useRef<any>(null)

  const [giocatoreNome, setGiocatoreNome] = useState('')
  const [club,          setClub]          = useState<ClubInfo | null>(null)
  const [quote,         setQuote]         = useState<QuotaMensile[]>([])
  const [piani,         setPiani]         = useState<Piano[]>([])
  const [loading,       setLoading]       = useState(true)
  const [modal,         setModal]         = useState<{ tipo: 'mensile'; quota: QuotaMensile } | { tipo: 'rata'; rata: Rata; piano: Piano } | null>(null)
  const [toast,         setToast]         = useState<{ msg: string; tipo: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, tipo: 'ok' | 'err' = 'ok') {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 4000)
  }

  /* ── carica quote mensili via API ── */
  const caricaQuote = useCallback(async () => {
    const res  = await fetch('/api/settore-giovanile/quote')
    const json = await res.json()
    setQuote((json.quote ?? []).sort((a: QuotaMensile, b: QuotaMensile) =>
      new Date(b.mese_competenza).getTime() - new Date(a.mese_competenza).getTime()
    ))
  }, [])

  /* ── carica piani di pagamento + info giocatore/club via API (admin client) ── */
  const caricaPiani = useCallback(async () => {
    const res  = await fetch('/api/famiglia/piani')
    const json = await res.json()
    const data = json.piani ?? []
    setPiani(data.map((p: any) => ({
      ...p,
      rate: (p.rate_pagamento ?? []).sort((a: Rata, b: Rata) => a.numero_rata - b.numero_rata),
    })))
    // Nome giocatore
    if (json.famiglia?.giocatore) {
      const g = json.famiglia.giocatore
      setGiocatoreNome(`${g.nome} ${g.cognome}`)
    }
    // Info club (IBAN, etc.)
    if (json.club) setClub(json.club as ClubInfo)
  }, [])

  const ricaricaTutto = useCallback(async () => {
    await Promise.all([caricaQuote(), caricaPiani()])
    setLoading(false)
  }, [caricaQuote, caricaPiani])

  // Carica al mount — le API gestiscono internamente il lookup dell'utente
  useEffect(() => {
    ricaricaTutto()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── realtime — ascolta aggiornamenti alle rate (es. segretario conferma) ── */
  useEffect(() => {
    if (chanRef.current) supabase.removeChannel(chanRef.current)
    const ch = supabase
      .channel('pagamenti-fam-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rate_pagamento' }, ricaricaTutto)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'piani_pagamento' }, ricaricaTutto)
      .subscribe()
    chanRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── KPI unificati (quote mensili + piani/rate) ── */

  // Quote mensili
  const quotaMensileCorrente = quote.find(q => {
    const m = new Date(q.mese_competenza)
    const n = new Date()
    return m.getFullYear() === n.getFullYear() && m.getMonth() === n.getMonth()
  })?.importo_mensile ?? (quote[0]?.importo_mensile ?? null)

  const pagatoQuote    = quote.filter(q => q.stato === 'pagata').reduce((s, q) => s + Number(q.importo_mensile), 0)
  const daPagareQuote  = quote.filter(q => q.stato === 'da_pagare' || q.stato === 'in_ritardo').reduce((s, q) => s + Number(q.importo_mensile), 0)
  const inRitardoQuote = quote.filter(q => q.stato === 'in_ritardo').length

  // Piani / rate
  const tutteLeRate    = piani.flatMap(p => p.rate)
  const pagatoRate     = tutteLeRate.filter(r => r.stato === 'pagata').reduce((s, r) => s + Number(r.importo), 0)
  const daPagareRate   = tutteLeRate.filter(r => r.stato === 'in_attesa' || r.stato === 'in_ritardo').reduce((s, r) => s + Number(r.importo), 0)
  const inRitardoRate  = tutteLeRate.filter(r => r.stato === 'in_ritardo').length
  const totalePiani    = piani.reduce((s, p) => s + Number(p.importo_totale), 0)

  // Totali unificati
  const pagatoTot   = pagatoQuote  + pagatoRate
  const daPagareTot = daPagareQuote + daPagareRate
  const inRitardoTot = inRitardoQuote + inRitardoRate

  const haDati  = quote.length > 0 || piani.length > 0
  const haPiani = piani.length > 0

  /* ── render ── */
  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
          Pagamenti{giocatoreNome ? ` — ${giocatoreNome}` : ''}
        </div>
        <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>Quote mensili e piani di pagamento</div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Caricamento…</div>
      ) : (
        <>
          {/* ── KPI UNIFICATI (quote mensili + piani/rate) ── */}
          {haDati && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>

              {/* Card 1: quota mensile corrente (se esiste) oppure totale piani */}
              <div style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, padding: '14px 16px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: 4 }}>
                  {quotaMensileCorrente != null ? 'Quota mensile' : 'Totale piani'}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--accent)' }}>
                  {quotaMensileCorrente != null ? fmt(quotaMensileCorrente) : fmt(totalePiani)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>
                  {quotaMensileCorrente != null ? 'importo corrente' : `${piani.length} pian${piani.length === 1 ? 'o' : 'i'}`}
                </div>
              </div>

              {/* Card 2: pagato */}
              <div style={{ background: '#111', border: '1px solid #00C8A050', borderRadius: 2, padding: '14px 16px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: 4 }}>Pagato</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: '#00C8A0' }}>{fmt(pagatoTot)}</div>
                <div style={{ fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>
                  {tutteLeRate.filter(r => r.stato === 'pagata').length + quote.filter(q => q.stato === 'pagata').length} rate saldate
                </div>
              </div>

              {/* Card 3: da pagare */}
              <div style={{ background: '#111', border: `1px solid ${daPagareTot > 0 ? '#EF444450' : 'var(--border-solid)'}`, borderRadius: 2, padding: '14px 16px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: 4 }}>Da pagare</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: daPagareTot > 0 ? '#EF4444' : '#00C8A0' }}>
                  {daPagareTot > 0 ? fmt(daPagareTot) : '✓'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>ancora aperte</div>
              </div>

              {/* Card 4: in ritardo */}
              <div style={{ background: '#111', border: `1px solid ${inRitardoTot > 0 ? '#EF444450' : 'var(--border-solid)'}`, borderRadius: 2, padding: '14px 16px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: 4 }}>In ritardo</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: inRitardoTot > 0 ? '#EF4444' : 'var(--gray)' }}>{inRitardoTot}</div>
                <div style={{ fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>oltre scadenza</div>
              </div>

            </div>
          )}

          {/* ── QUOTE MENSILI ── */}
          {quote.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray)', marginBottom: 12 }}>
                Quote mensili — stagione
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {quote.map(q => {
                  const sc  = STATO_MENSILE[q.stato] ?? STATO_MENSILE.da_pagare
                  const puoPagare = q.stato === 'da_pagare' || q.stato === 'in_ritardo'

                  return (
                    <div key={q.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 16px',
                      background: sc.bg,
                      border: `1px solid ${sc.colore}30`,
                      borderRadius: 3,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ minWidth: 110 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--white)', textTransform: 'capitalize' }}>
                            {nomeMese(q.mese_competenza)}
                          </div>
                          {q.stato === 'pagata' && q.data_pagamento && (
                            <div style={{ fontSize: 10, color: '#00C8A0', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                              ✓ {formatData(q.data_pagamento)} {q.metodo_pagamento ? `· ${q.metodo_pagamento}` : ''}
                            </div>
                          )}
                          {q.stato === 'dichiarata' && (
                            <div style={{ fontSize: 10, color: '#A78BFA', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                              ⏳ Dichiarato — in attesa conferma
                            </div>
                          )}
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--white)' }}>
                          {fmt(Number(q.importo_mensile))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          padding: '3px 9px', borderRadius: 2, fontSize: 10, fontWeight: 700,
                          fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                          background: sc.bg, color: sc.colore, border: `1px solid ${sc.colore}50`,
                        }}>{sc.label}</span>
                        {puoPagare && (
                          <button className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: '4px 12px' }}
                            onClick={() => setModal({ tipo: 'mensile', quota: q })}>
                            Paga →
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Totale stagione */}
              <div style={{ marginTop: 10, padding: '10px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-solid)', borderRadius: 3, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--gray)' }}>Totale stagione ({quote.length} mesi)</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--white)' }}>{fmt(quote.reduce((s, q) => s + Number(q.importo_mensile), 0))}</span>
              </div>
            </div>
          )}

          {/* ── PIANI DI PAGAMENTO ── */}
          {haPiani && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray)', marginBottom: 12 }}>
                Piani di pagamento
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {piani.map(piano => {
                  const importoPagato = piano.rate.filter(r => r.stato === 'pagata').reduce((s, r) => s + Number(r.importo), 0)
                  const perc = piano.importo_totale > 0 ? Math.min(Math.round((importoPagato / piano.importo_totale) * 100), 100) : 0

                  return (
                    <div key={piano.id} style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-solid)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', color: 'var(--white)' }}>{piano.descrizione}</div>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--white)' }}>{fmt(piano.importo_totale)}</div>
                        </div>
                        <div style={{ height: 5, background: 'var(--border-solid)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${perc}%`, background: perc === 100 ? '#00C8A0' : '#F59E0B', transition: 'width 0.4s', borderRadius: 3 }} />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--gray)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>{perc}% saldato</div>
                      </div>
                      <div style={{ padding: '10px 18px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {piano.rate.map(rata => {
                          const sc  = STATO_RATA[rata.stato] ?? STATO_RATA.in_attesa
                          const gg  = giorniAllaScadenza(rata.scadenza)
                          const urg = gg !== null && gg <= 7 && rata.stato !== 'pagata'
                          const puoPagare = rata.stato === 'in_attesa' || rata.stato === 'in_ritardo'

                          return (
                            <div key={rata.id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '8px 12px',
                              background: rata.stato === 'dichiarato' ? 'rgba(167,139,250,0.05)' : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${urg ? '#EF444430' : rata.stato === 'dichiarato' ? 'rgba(167,139,250,0.25)' : 'var(--border-solid)'}`,
                              borderRadius: 3,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', minWidth: 40 }}>Rata {rata.numero_rata}</div>
                                <div>
                                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--white)' }}>{fmt(Number(rata.importo))}</div>
                                  <div style={{ fontSize: 10, color: urg ? '#EF4444' : 'var(--gray)', fontFamily: 'var(--font-mono)' }}>
                                    {urg ? '⚠ ' : ''}Scad. {formatData(rata.scadenza)}
                                    {gg !== null && rata.stato !== 'pagata' && <span> · {gg > 0 ? `fra ${gg}gg` : gg === 0 ? 'oggi' : 'scaduta'}</span>}
                                  </div>
                                  {rata.stato === 'dichiarato' && <div style={{ fontSize: 10, color: '#A78BFA', fontFamily: 'var(--font-mono)', marginTop: 1 }}>⏳ In attesa conferma</div>}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ padding: '3px 8px', borderRadius: 2, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', background: sc.bg, color: sc.colore, border: `1px solid ${sc.colore}40` }}>{sc.label}</span>
                                {puoPagare && (
                                  <button className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: '4px 12px' }}
                                    onClick={() => setModal({ tipo: 'rata', rata, piano })}>
                                    Paga →
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Nessun dato */}
          {quote.length === 0 && !haPiani && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray)', fontSize: 13, background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2 }}>
              Nessuna quota o piano di pagamento assegnato. La segreteria creerà le quote per questo giocatore.
            </div>
          )}

          {/* Info IBAN */}
          {club?.iban && (
            <div style={{ marginTop: 12, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(200,240,0,0.03)', border: '1px solid rgba(200,240,0,0.15)', borderRadius: 2 }}>
              <span style={{ fontSize: 22 }}>🏦</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>Bonifico — {club.nome}</div>
                {club.intestatario_conto && <div style={{ fontSize: 12, color: 'var(--gray)' }}>Intestatario: <strong style={{ color: 'var(--white)' }}>{club.intestatario_conto}</strong></div>}
                <div style={{ fontSize: 12, color: 'var(--gray)' }}>IBAN: <code style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{club.iban}</code></div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal pagamento */}
      {modal && (
        <ModalPaga
          titolo={modal.tipo === 'mensile'
            ? `Dichiara pagamento — ${nomeMese(modal.quota.mese_competenza)}`
            : `Dichiara pagamento — Rata ${modal.rata.numero_rata}`}
          importo={modal.tipo === 'mensile' ? Number(modal.quota.importo_mensile) : Number(modal.rata.importo)}
          causale={modal.tipo === 'mensile'
            ? `Quota mensile ${nomeMese(modal.quota.mese_competenza)} — ${giocatoreNome}`
            : `${modal.piano.descrizione} Rata ${modal.rata.numero_rata} — ${giocatoreNome}`}
          club={club}
          onClose={() => setModal(null)}
          onSave={async (metodo, dataPag, note) => {
            if (modal.tipo === 'mensile') {
              const res  = await fetch(`/api/settore-giovanile/quote?id=${modal.quota.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ metodo_pagamento: metodo, data_pagamento: dataPag, note }),
              })
              const json = await res.json()
              if (!res.ok) return json.error ?? 'Errore'
            } else {
              // Usa l'API dedicata che bypassa RLS con createAdminClient
              const res  = await fetch(`/api/famiglia/piani?rata_id=${modal.rata.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ metodo_pagamento: metodo, data_pagamento: dataPag, note }),
              })
              const json = await res.json()
              if (!res.ok) return json.error ?? 'Errore'
            }
            setModal(null)
            showToast('Pagamento dichiarato! La segreteria lo verificherà a breve.')
            await ricaricaTutto()
            return null
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
          background: toast.tipo === 'ok' ? '#1a2e1a' : '#2e1a1a',
          border: `1px solid ${toast.tipo === 'ok' ? 'rgba(0,200,160,0.4)' : 'rgba(239,68,68,0.4)'}`,
          borderRadius: 4, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          <span>{toast.tipo === 'ok' ? '✓' : '⚠'}</span>
          <span style={{ fontSize: 13, color: toast.tipo === 'ok' ? '#00C8A0' : '#EF4444', fontWeight: 500 }}>{toast.msg}</span>
        </div>
      )}
    </div>
  )
}
