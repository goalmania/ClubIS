'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal, Toast } from '@/components/ui'
import Link from 'next/link'

/* ─── Costanti ───────────────────────────────────────────────── */

const TIPI_PAGAMENTO = [
  // USCITE
  { categoria: 'uscita',  label: 'Rimborso giocatore',       icon: '⚽', soggetto: 'giocatore' },
  { categoria: 'uscita',  label: 'Compenso allenatore',      icon: '👔', soggetto: 'staff'     },
  { categoria: 'uscita',  label: 'Rimborso trasferta',       icon: '🚌', soggetto: 'squadra'   },
  { categoria: 'uscita',  label: 'Quota affiliazione FIGC',  icon: '🏛', soggetto: 'ente'      },
  { categoria: 'uscita',  label: 'Arbitraggi',               icon: '🟥', soggetto: 'ente'      },
  { categoria: 'uscita',  label: 'Manutenzione campo',       icon: '⚙️', soggetto: 'fornitore' },
  { categoria: 'uscita',  label: 'Materiale sportivo',       icon: '👟', soggetto: 'fornitore' },
  { categoria: 'uscita',  label: 'Iscrizione campionato',    icon: '📋', soggetto: 'ente'      },
  // ENTRATE
  { categoria: 'entrata', label: 'Quota iscrizione famiglia',icon: '👨‍👩‍👧', soggetto: 'famiglia'  },
  { categoria: 'entrata', label: 'Sponsorizzazione',         icon: '💼', soggetto: 'sponsor'   },
  { categoria: 'entrata', label: 'Contributo comune/regione',icon: '🏛', soggetto: 'ente'      },
  { categoria: 'entrata', label: 'Botteghino partita',       icon: '🎟', soggetto: 'evento'    },
  { categoria: 'entrata', label: 'Cessione giocatore',       icon: '↗️', soggetto: 'club'      },
] as const

type TipoPag = typeof TIPI_PAGAMENTO[number]
type CatOp   = 'entrata' | 'uscita'

// Soggetti che si selezionano da una lista (entità DB)
const SOGGETTI_LISTA = new Set(['famiglia', 'giocatore', 'staff', 'squadra'])
// Soggetti che si inseriscono come testo libero
const SOGGETTI_TESTO = new Set(['ente', 'fornitore', 'sponsor', 'evento', 'club'])

/* ─── Tipi ───────────────────────────────────────────────────── */
interface KpiData {
  totRitardo: number
  totScadenzaMese: number
  totPagatoMese: number
  numPiani: number
}

interface PianoRecente {
  id: string
  descrizione: string
  importo_totale: number
  categoria: string | null
  tipo_pagamento: string | null
  soggetto_nome: string | null
  created_at: string
  rate: { stato: string }[]
}

interface OpzioneSelect { id: string; label: string }

type Fase = 'tipo' | 'categoria' | 'soggetto' | 'importo'

interface FormState {
  fase: Fase
  tipoOp: CatOp | null
  categoriaSel: TipoPag | null
  soggettoId: string
  soggettoNome: string
  importoTot: string
  nRate: number
  primaScadenza: string
  note: string
}

const FORM_INIT: FormState = {
  fase: 'tipo',
  tipoOp: null,
  categoriaSel: null,
  soggettoId: '',
  soggettoNome: '',
  importoTot: '',
  nRate: 1,
  primaScadenza: new Date().toISOString().split('T')[0],
  note: '',
}

/* ─── Helpers ────────────────────────────────────────────────── */
const fmt = (n: number) =>
  n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

function addMesi(base: string, n: number): string {
  const d = new Date(base)
  d.setMonth(d.getMonth() + n)
  return d.toISOString().split('T')[0]
}

function generaRate(importoTot: number, nRate: number, primaScadenza: string) {
  const imp = Math.round((importoTot / nRate) * 100) / 100
  const rate = Array.from({ length: nRate }, (_, i) => ({
    numero: i + 1,
    importo: imp,
    scadenza: addMesi(primaScadenza, i),
  }))
  // Aggiusta l'ultima rata per eventuali arrotondamenti
  const somma = rate.slice(0, -1).reduce((s, r) => s + r.importo, 0)
  rate[rate.length - 1].importo = Math.round((importoTot - somma) * 100) / 100
  return rate
}

function statoColor(stati: string[]): string {
  if (!stati.length) return 'var(--text-muted)'
  if (stati.every(s => s === 'pagata')) return 'var(--accent-green)'
  if (stati.some(s => s === 'in_ritardo' || (s === 'in_attesa' && false))) return 'var(--accent-orange)'
  return 'var(--text-secondary)'
}

/* ─── Componente principale ───────────────────────────────────── */
export default function PresidentePagamentiPage() {
  const supabase = createClient()

  const [clubId, setClubId]       = useState<string | null>(null)
  const [kpi, setKpi]             = useState<KpiData | null>(null)
  const [piani, setPiani]         = useState<PianoRecente[]>([])
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast]         = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  // Form wizard state
  const [form, setForm]   = useState<FormState>(FORM_INIT)
  const [saving, setSaving] = useState(false)

  // Opzioni soggetto (caricate dinamicamente)
  const [opzioni, setOpzioni]       = useState<OpzioneSelect[]>([])
  const [loadingOp, setLoadingOp]   = useState(false)

  /* Load KPI + piani recenti */
  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
    if (!utente) return
    const cid = utente.club_id
    setClubId(cid)

    const oggi       = new Date()
    const oggiStr    = oggi.toISOString().split('T')[0]
    const inizioMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1).toISOString().split('T')[0]
    const fineMese   = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0).toISOString().split('T')[0]

    const [
      { data: ritardo },
      { data: scadMese },
      { data: pagMese },
      { count: numPiani },
      { data: pianiData },
    ] = await Promise.all([
      supabase.from('rate_pagamento').select('importo').eq('club_id', cid).eq('stato', 'in_attesa').lt('scadenza', oggiStr),
      supabase.from('rate_pagamento').select('importo').eq('club_id', cid).eq('stato', 'in_attesa').gte('scadenza', inizioMese).lte('scadenza', fineMese),
      supabase.from('rate_pagamento').select('importo').eq('club_id', cid).eq('stato', 'pagata').gte('data_pagamento', inizioMese).lte('data_pagamento', fineMese),
      supabase.from('piani_pagamento').select('*', { count: 'exact', head: true }).eq('club_id', cid),
      supabase.from('piani_pagamento')
        .select('id, descrizione, importo_totale, categoria, tipo_pagamento, soggetto_nome, created_at, rate_pagamento(stato)')
        .eq('club_id', cid)
        .order('created_at', { ascending: false })
        .limit(12),
    ])

    setKpi({
      totRitardo:     (ritardo ?? []).reduce((s, r) => s + Number(r.importo), 0),
      totScadenzaMese:(scadMese ?? []).reduce((s, r) => s + Number(r.importo), 0),
      totPagatoMese:  (pagMese ?? []).reduce((s, r) => s + Number(r.importo), 0),
      numPiani:       numPiani ?? 0,
    })
    setPiani((pianiData ?? []).map((p: any) => ({
      ...p,
      rate: p.rate_pagamento ?? [],
    })))
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Sottoscrizione realtime: ricarica quando rate o piani cambiano nel club
  useEffect(() => {
    if (!clubId) return
    const channel = supabase
      .channel(`presidente_pagamenti:${clubId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'rate_pagamento',
        filter: `club_id=eq.${clubId}`,
      }, () => loadData())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'piani_pagamento',
        filter: `club_id=eq.${clubId}`,
      }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clubId, loadData])

  /* Carica opzioni soggetto quando si arriva allo step soggetto */
  useEffect(() => {
    if (form.fase !== 'soggetto' || !form.categoriaSel || !clubId) return
    const tipo = form.categoriaSel.soggetto
    if (!SOGGETTI_LISTA.has(tipo)) { setOpzioni([]); return }
    loadOpzioni(tipo)
  }, [form.fase, form.categoriaSel, clubId])

  async function loadOpzioni(tipo: string) {
    if (!clubId) return
    setLoadingOp(true)
    let result: OpzioneSelect[] = []

    if (tipo === 'famiglia') {
      const { data: tess } = await supabase
        .from('tesseramenti').select('giocatore_id').eq('club_id', clubId).eq('stato', 'attivo')
      const gIds = (tess ?? []).map((t: any) => t.giocatore_id).filter(Boolean)
      if (gIds.length) {
        const { data } = await supabase
          .from('famiglie').select('id, nome, cognome').in('giocatore_id', gIds).order('cognome')
        result = (data ?? []).map((f: any) => ({ id: f.id, label: `${f.cognome} ${f.nome}` }))
      }
    } else if (tipo === 'giocatore') {
      const { data } = await supabase
        .from('tesseramenti')
        .select('giocatori(id, nome, cognome)')
        .eq('club_id', clubId).eq('stato', 'attivo')
      result = (data ?? [])
        .map((t: any) => t.giocatori)
        .filter(Boolean)
        .map((g: any) => ({ id: g.id, label: `${g.cognome} ${g.nome}` }))
        .sort((a: OpzioneSelect, b: OpzioneSelect) => a.label.localeCompare(b.label))
    } else if (tipo === 'staff') {
      const { data } = await supabase
        .from('utenti').select('id, nome, cognome, ruolo').eq('club_id', clubId).eq('attivo', true)
        .in('ruolo', ['allenatore', 'ds', 'medico', 'osservatore', 'team_manager', 'segretario'])
      result = (data ?? []).map((u: any) => ({
        id: u.id,
        label: `${u.cognome} ${u.nome} (${u.ruolo.replace(/_/g, ' ')})`,
      }))
    } else if (tipo === 'squadra') {
      const { data } = await supabase
        .from('squadre').select('id, nome').eq('club_id', clubId).eq('attiva', true)
      result = (data ?? []).map((s: any) => ({ id: s.id, label: s.nome }))
    }

    setOpzioni(result)
    setLoadingOp(false)
  }

  /* Navigazione steps */
  function scegli(updates: Partial<FormState>) {
    setForm(prev => ({ ...prev, ...updates }))
  }

  function goBack() {
    setForm(prev => ({
      ...prev,
      fase: prev.fase === 'categoria' ? 'tipo'
          : prev.fase === 'soggetto'  ? 'categoria'
          : prev.fase === 'importo'   ? 'soggetto'
          : 'tipo',
    }))
  }

  function onModalClose() {
    setModalOpen(false)
    setTimeout(() => setForm(FORM_INIT), 300)
    setOpzioni([])
  }

  /* Salvataggio */
  async function salva() {
    if (!clubId || !form.categoriaSel) return
    const importoNum = parseFloat(form.importoTot)
    if (!importoNum || importoNum <= 0) {
      setToast({ msg: 'Inserisci un importo valido', tipo: 'error' }); return
    }
    const nomeSogg = form.soggettoNome.trim() ||
      opzioni.find(o => o.id === form.soggettoId)?.label || '—'

    setSaving(true)

    // Crea soggetto_pagamento per soggetti a testo libero (non già in tabella)
    let soggettoIdDb: string | null = null
    if (SOGGETTI_TESTO.has(form.categoriaSel.soggetto) && nomeSogg !== '—') {
      const { data: sogg } = await supabase.from('soggetti_pagamento').insert({
        club_id: clubId,
        tipo: form.categoriaSel.soggetto,
        nome: nomeSogg,
      }).select('id').single()
      soggettoIdDb = sogg?.id ?? null
    }

    const isFamiglia  = form.categoriaSel.soggetto === 'famiglia'
    const isGiocatore = form.categoriaSel.soggetto === 'giocatore'

    const { data: piano, error: errPiano } = await supabase
      .from('piani_pagamento')
      .insert({
        club_id:       clubId,
        famiglia_id:   isFamiglia  ? form.soggettoId || null : null,
        giocatore_id:  isGiocatore ? form.soggettoId || null : null,
        descrizione:   `${form.categoriaSel.label}${nomeSogg !== '—' ? ' — ' + nomeSogg : ''}`,
        importo_totale: importoNum,
        tipo_pagamento: form.categoriaSel.label,
        categoria:      form.categoriaSel.categoria,
        soggetto_id:    soggettoIdDb,
        soggetto_nome:  nomeSogg !== '—' ? nomeSogg : null,
        note:           form.note || null,
      })
      .select('id')
      .single()

    if (errPiano || !piano) {
      setSaving(false)
      setToast({ msg: errPiano?.message ?? 'Errore creazione piano', tipo: 'error' })
      return
    }

    const rateList = generaRate(importoNum, form.nRate, form.primaScadenza)
    const { error: errRate } = await supabase.from('rate_pagamento').insert(
      rateList.map(r => ({
        piano_id:   piano.id,
        club_id:    clubId,
        numero_rata: r.numero,
        importo:    r.importo,
        scadenza:   r.scadenza,
        stato:      'in_attesa',
      }))
    )

    setSaving(false)
    if (errRate) {
      setToast({ msg: errRate.message, tipo: 'error' }); return
    }

    setToast({ msg: `Piano creato: ${fmt(importoNum)} in ${form.nRate} rata${form.nRate > 1 ? 'e' : ''}`, tipo: 'success' })
    onModalClose()
    loadData()
  }

  /* ─── Render ──────────────────────────────────────────────── */
  const titoli: Record<Fase, string> = {
    tipo:      'Che tipo di operazione?',
    categoria: 'Che tipo di pagamento?',
    soggetto:  'Chi è il soggetto?',
    importo:   'Importo e rate',
  }

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Caricamento…</div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Pagamenti</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            Entrate e uscite societarie
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/dashboard/segretario/pagamenti" className="btn btn-secondary btn-sm">
            Gestione rate →
          </Link>
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
            + Nuovo movimento
          </button>
        </div>
      </div>

      {/* Alert ritardo */}
      {(kpi?.totRitardo ?? 0) > 0 && (
        <div style={{
          background: 'rgba(248,81,73,0.1)', border: '1px solid var(--accent-red)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          fontSize: 14, color: 'var(--accent-red)', fontWeight: 600,
        }}>
          ⚠️ {fmt(kpi!.totRitardo)} di rate in ritardo
        </div>
      )}

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Piani attivi</div>
          <div className="stat-value">{kpi?.numPiani ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Incassato questo mese</div>
          <div className="stat-value" style={{ color: 'var(--accent-green)' }}>
            {fmt(kpi?.totPagatoMese ?? 0)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In scadenza questo mese</div>
          <div className="stat-value" style={{ color: 'var(--accent-orange)' }}>
            {fmt(kpi?.totScadenzaMese ?? 0)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In ritardo</div>
          <div className="stat-value" style={{ color: (kpi?.totRitardo ?? 0) > 0 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
            {fmt(kpi?.totRitardo ?? 0)}
          </div>
        </div>
      </div>

      {/* Piani recenti */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Movimenti recenti</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>ultimi 12</span>
        </div>
        {piani.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nessun piano registrato.{' '}
            <button onClick={() => setModalOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13 }}>
              Crea il primo →
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)' }}>
                {(['Descrizione', 'Tipo', 'Importo', 'Rate', ''] as const).map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: h === 'Importo' ? 'right' : 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {piani.map(p => {
                const stati = p.rate.map((r: any) => r.stato)
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '11px 16px', fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>{p.descrizione}</div>
                      {p.soggetto_nome && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{p.soggetto_nome}</div>
                      )}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 12 }}>
                      {p.categoria ? (
                        <span className={`badge ${p.categoria === 'entrata' ? 'badge-verde' : 'badge-rosso'}`}>
                          {p.categoria}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, textAlign: 'right' }}>
                      {fmt(Number(p.importo_totale))}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: statoColor(stati) }}>
                      {stati.length} {stati.length === 1 ? 'rata' : 'rate'}
                      {stati.every((s: string) => s === 'pagata') ? ' ✓' : ''}
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                      <Link href="/dashboard/segretario/pagamenti" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
                        Dettaglio →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── Modal wizard ─────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        title={titoli[form.fase]}
        onClose={onModalClose}
      >
        <div style={{ minHeight: 260 }}>
          {/* Breadcrumb step */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            {(['tipo', 'categoria', 'soggetto', 'importo'] as Fase[]).map((f, i) => (
              <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span>›</span>}
                <span style={{
                  padding: '2px 8px', borderRadius: 4,
                  background: form.fase === f ? 'var(--accent)' : 'var(--bg-input)',
                  color: form.fase === f ? '#000' : 'var(--text-muted)',
                  fontWeight: form.fase === f ? 700 : 400,
                  fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {f === 'tipo' ? 'Tipo' : f === 'categoria' ? 'Categoria' : f === 'soggetto' ? 'Soggetto' : 'Importo'}
                </span>
              </span>
            ))}
          </div>

          {/* STEP 1 — Tipo */}
          {form.fase === 'tipo' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {(['entrata', 'uscita'] as CatOp[]).map(tipo => (
                <button
                  key={tipo}
                  onClick={() => { scegli({ tipoOp: tipo, fase: 'categoria', categoriaSel: null }); setOpzioni([]) }}
                  style={{
                    padding: '28px 20px',
                    border: `2px solid ${tipo === 'entrata' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                    borderRadius: 12,
                    background: tipo === 'entrata' ? 'rgba(34,197,94,0.06)' : 'rgba(248,81,73,0.06)',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>
                    {tipo === 'entrata' ? '💰' : '💸'}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.04em', color: tipo === 'entrata' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {tipo === 'entrata' ? 'Entrata' : 'Uscita'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {tipo === 'entrata' ? 'Il club riceve denaro' : 'Il club paga qualcuno'}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* STEP 2 — Categoria */}
          {form.fase === 'categoria' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {TIPI_PAGAMENTO
                  .filter(t => t.categoria === form.tipoOp)
                  .map(t => (
                    <button
                      key={t.label}
                      onClick={() => {
                        scegli({ categoriaSel: t, fase: 'soggetto', soggettoId: '', soggettoNome: '' })
                        loadOpzioni(t.soggetto)
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 16px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                        textAlign: 'left',
                        transition: 'border-color 0.15s',
                      }}
                    >
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{t.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{t.label}</span>
                    </button>
                  ))}
              </div>
              <BackBtn onClick={goBack} />
            </div>
          )}

          {/* STEP 3 — Soggetto */}
          {form.fase === 'soggetto' && form.categoriaSel && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {form.categoriaSel.icon} <strong>{form.categoriaSel.label}</strong> —{' '}
                {form.tipoOp === 'entrata' ? 'Chi paga al club?' : 'Chi riceve dal club?'}
              </div>

              {SOGGETTI_LISTA.has(form.categoriaSel.soggetto) ? (
                <div>
                  <label className="label">
                    {form.categoriaSel.soggetto === 'famiglia'  ? 'Famiglia'  :
                     form.categoriaSel.soggetto === 'giocatore' ? 'Giocatore' :
                     form.categoriaSel.soggetto === 'staff'     ? 'Membro staff' : 'Squadra'}
                  </label>
                  <select
                    className="input"
                    style={{ width: '100%', marginTop: 4 }}
                    value={form.soggettoId}
                    onChange={e => scegli({ soggettoId: e.target.value })}
                    disabled={loadingOp}
                  >
                    <option value="">
                      {loadingOp ? 'Caricamento…' : opzioni.length === 0 ? 'Nessun risultato' : 'Seleziona…'}
                    </option>
                    {opzioni.map(o => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                  {!loadingOp && opzioni.length === 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {form.categoriaSel.soggetto === 'famiglia'
                        ? 'Nessuna famiglia registrata. Vai ai giocatori per aggiungere i dati famiglia.'
                        : 'Nessun elemento trovato.'}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="label">Nome {form.categoriaSel.soggetto}</label>
                  <input
                    className="input"
                    style={{ width: '100%', marginTop: 4 }}
                    placeholder={
                      form.categoriaSel.soggetto === 'ente'      ? 'es. FIGC, Comune di...' :
                      form.categoriaSel.soggetto === 'fornitore' ? 'es. Decathlon, SportGear srl' :
                      form.categoriaSel.soggetto === 'sponsor'   ? 'es. Azienda Sponsor Srl' :
                      form.categoriaSel.soggetto === 'club'      ? 'es. FC Bari' :
                      'Nome / descrizione'
                    }
                    value={form.soggettoNome}
                    onChange={e => scegli({ soggettoNome: e.target.value })}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                <BackBtn onClick={goBack} inline />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => scegli({ fase: 'importo' })}
                  disabled={SOGGETTI_LISTA.has(form.categoriaSel.soggetto) ? !form.soggettoId : !form.soggettoNome.trim()}
                >
                  Avanti →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 — Importo + rate */}
          {form.fase === 'importo' && form.categoriaSel && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Riepilogo */}
              <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '10px 14px', fontSize: 13, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>{form.categoriaSel.icon} <strong>{form.categoriaSel.label}</strong></span>
                <span style={{ color: 'var(--text-muted)' }}>→</span>
                <span style={{ color: form.tipoOp === 'entrata' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {form.tipoOp === 'entrata' ? '▲ Entrata' : '▼ Uscita'}
                </span>
              </div>

              {/* Importo */}
              <div>
                <label className="label">Importo totale (€) *</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step={0.01}
                  style={{ width: '100%', marginTop: 4 }}
                  value={form.importoTot}
                  onChange={e => scegli({ importoTot: e.target.value })}
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              {/* Rate */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Numero rate</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={60}
                    style={{ width: '100%', marginTop: 4 }}
                    value={form.nRate}
                    onChange={e => scegli({ nRate: Math.max(1, parseInt(e.target.value) || 1) })}
                  />
                </div>
                <div>
                  <label className="label">Prima scadenza</label>
                  <input
                    className="input"
                    type="date"
                    style={{ width: '100%', marginTop: 4 }}
                    value={form.primaScadenza}
                    onChange={e => scegli({ primaScadenza: e.target.value })}
                  />
                </div>
              </div>

              {/* Preview rate */}
              {form.importoTot && parseFloat(form.importoTot) > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-input)', borderRadius: 6, padding: '10px 12px' }}>
                  {generaRate(parseFloat(form.importoTot), form.nRate, form.primaScadenza).map(r => (
                    <div key={r.numero} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span>Rata {r.numero} — {new Date(r.scadenza).toLocaleDateString('it-IT')}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {r.importo.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Note */}
              <div>
                <label className="label">Note (opzionale)</label>
                <input
                  className="input"
                  style={{ width: '100%', marginTop: 4 }}
                  value={form.note}
                  onChange={e => scegli({ note: e.target.value })}
                  placeholder="Riferimento, descrizione aggiuntiva…"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <BackBtn onClick={goBack} inline />
                <button
                  className="btn btn-primary"
                  onClick={salva}
                  disabled={saving || !form.importoTot || parseFloat(form.importoTot) <= 0}
                >
                  {saving ? 'Salvataggio…' : 'Crea piano di pagamento'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

function BackBtn({ onClick, inline = false }: { onClick: () => void; inline?: boolean }) {
  return (
    <button
      className="btn btn-secondary btn-sm"
      onClick={onClick}
      style={inline ? undefined : { marginTop: 16 }}
    >
      ← Indietro
    </button>
  )
}
