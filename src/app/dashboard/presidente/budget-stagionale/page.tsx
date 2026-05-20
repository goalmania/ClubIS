'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Tipi ─────────────────────────────────────────────────────────────────────
interface BudgetStagionale {
  id: string
  stagione_riferimento: string
  budget_totale_stagione: number
  budget_mercato: number
  note_budget: string | null
}

interface VocePrevista {
  id: string
  descrizione: string
  importo_previsto: number
  categoria: string
  mese_riferimento: number | null
  note: string | null
}

interface MovPrimaNota {
  tipo: 'entrata' | 'uscita'
  importo: number
  data: string
}

// ── Costanti ─────────────────────────────────────────────────────────────────
const STAGIONI = ['2024/25', '2025/26', '2026/27', '2027/28']

const CAT_ENTRATE = [
  { value: 'quote_iscrizioni',   label: 'Quote iscrizioni' },
  { value: 'sponsor',            label: 'Sponsor' },
  { value: 'contributi_federali',label: 'Contributi federali' },
  { value: 'botteghino',         label: 'Botteghino' },
  { value: 'altro',              label: 'Altro' },
]
const CAT_USCITE = [
  { value: 'stipendi',       label: 'Stipendi / ingaggi' },
  { value: 'rimborsi',       label: 'Rimborsi' },
  { value: 'attrezzatura',   label: 'Attrezzatura' },
  { value: 'trasferte',      label: 'Trasferte' },
  { value: 'utenze_impianto',label: 'Utenze impianto' },
  { value: 'altro',          label: 'Altro' },
]
const MESI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']

const fmt = (n: number) =>
  n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

// ── Gauge (barra circolare) ───────────────────────────────────────────────────
function GaugeBudget({ speso, totale }: { speso: number; totale: number }) {
  const perc   = totale > 0 ? Math.min(100, Math.round((speso / totale) * 100)) : 0
  const colore = perc >= 90 ? '#ef4444' : perc >= 70 ? '#f59e0b' : '#c8f000'
  const r = 70, cx = 90, cy = 90
  const circ = 2 * Math.PI * r
  const dash  = (perc / 100) * circ

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={180} height={180} viewBox="0 0 180 180">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--grigio-5)" strokeWidth={18} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke={colore} strokeWidth={18}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 1s ease, stroke 0.5s ease' }}
        />
        <text x={cx} y={cy - 6} textAnchor="middle"
          style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, fill: colore }}>
          {perc}%
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#666' }}>
          UTILIZZATO
        </text>
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grigio-4)' }}>
          {fmt(speso)} / {totale > 0 ? fmt(totale) : '— non impostato'}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grigio-4)', marginTop: 2 }}>
          Residuo: <span style={{ color: totale > 0 && speso > totale ? '#ef4444' : '#c8f000', fontWeight: 700 }}>
            {totale > 0 ? fmt(totale - speso) : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Semaforo ─────────────────────────────────────────────────────────────────
function Semaforo({ perc }: { perc: number }) {
  const stato = perc >= 90 ? 'rosso' : perc >= 70 ? 'giallo' : 'verde'
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      background: 'var(--grigio-6)', padding: '16px 20px', borderRadius: 8,
      border: '1px solid var(--grigio-5)',
    }}>
      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grigio-4)', letterSpacing: '0.1em', marginBottom: 8 }}>
        STATO BUDGET
      </div>
      {(['verde','giallo','rosso'] as const).map(s => (
        <div key={s} style={{
          width: 40, height: 40, borderRadius: '50%',
          background: stato === s
            ? (s === 'verde' ? '#22c55e' : s === 'giallo' ? '#f59e0b' : '#ef4444')
            : 'var(--grigio-5)',
          boxShadow: stato === s
            ? `0 0 16px ${s === 'verde' ? '#22c55e' : s === 'giallo' ? '#f59e0b' : '#ef4444'}88`
            : 'none',
          transition: 'background 0.5s, box-shadow 0.5s',
        }} />
      ))}
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--grigio-3)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
        {stato === 'verde'  && '< 70% — OK'}
        {stato === 'giallo' && '70–90% — Attenzione'}
        {stato === 'rosso'  && '> 90% — Critico'}
      </div>
    </div>
  )
}

// ── BarraMensile ─────────────────────────────────────────────────────────────
function BarraMensile({ label, previsto, effettivo, tipo }: {
  label: string; previsto: number; effettivo: number; tipo: 'entrata' | 'uscita'
}) {
  const max       = Math.max(previsto, effettivo, 1)
  const wPrev     = (previsto  / max) * 100
  const wEff      = (effettivo / max) * 100
  const colPrev   = tipo === 'entrata' ? 'rgba(200,240,0,0.3)' : 'rgba(239,68,68,0.3)'
  const colEff    = tipo === 'entrata' ? '#c8f000' : '#ef4444'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 28, fontSize: 10, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)', textAlign: 'right', flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ flex: 1, position: 'relative', height: 20 }}>
        {/* Previsto */}
        <div style={{
          position: 'absolute', top: 2, left: 0, height: 8,
          width: `${wPrev}%`, background: colPrev, borderRadius: 2,
          transition: 'width 0.8s ease',
        }} />
        {/* Effettivo */}
        <div style={{
          position: 'absolute', top: 10, left: 0, height: 8,
          width: `${wEff}%`, background: colEff, borderRadius: 2,
          transition: 'width 0.8s ease',
        }} />
      </div>
      <div style={{ width: 80, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--grigio-4)', flexShrink: 0, textAlign: 'right' }}>
        {effettivo > 0 ? fmt(effettivo) : '—'}
      </div>
    </div>
  )
}

// ── FormVoce — definito a livello modulo ──────────────────────────────────────
interface FormVoceProps {
  tipo: 'entrata' | 'uscita'
  initial?: Partial<VocePrevista>
  onSave: (v: Omit<VocePrevista, 'id'>) => Promise<void>
  onCancel: () => void
  saving: boolean
}

function FormVoce({ tipo, initial, onSave, onCancel, saving }: FormVoceProps) {
  const categorie = tipo === 'entrata' ? CAT_ENTRATE : CAT_USCITE
  const [desc,  setDesc]  = useState(initial?.descrizione     ?? '')
  const [imp,   setImp]   = useState(initial?.importo_previsto ?? 0)
  const [cat,   setCat]   = useState(initial?.categoria        ?? categorie[0].value)
  const [mese,  setMese]  = useState<number | ''>(initial?.mese_riferimento ?? '')
  const [note,  setNote]  = useState(initial?.note             ?? '')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!desc.trim() || imp <= 0) return
    await onSave({
      descrizione: desc.trim(),
      importo_previsto: imp,
      categoria: cat,
      mese_riferimento: mese === '' ? null : Number(mese),
      note: note.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <div>
          <label className="label">Descrizione *</label>
          <input ref={ref} className="input" value={desc} onChange={e => setDesc(e.target.value)}
            placeholder={tipo === 'entrata' ? 'es. Sponsor principale 2026/27' : 'es. Ingaggi portieri'} required />
        </div>
        <div>
          <label className="label">Importo previsto *</label>
          <input className="input" type="number" min={0} step={1} value={imp || ''}
            onChange={e => setImp(parseFloat(e.target.value) || 0)} required />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="label">Categoria *</label>
          <select className="input" value={cat} onChange={e => setCat(e.target.value)}>
            {categorie.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Mese riferimento <span style={{ color: 'var(--grigio-3)', fontWeight: 400 }}>(facoltativo)</span></label>
          <select className="input" value={mese} onChange={e => setMese(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">— Nessun mese —</option>
            {MESI.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Note <span style={{ color: 'var(--grigio-3)', fontWeight: 400 }}>(facoltativo)</span></label>
        <input className="input" value={note} onChange={e => setNote(e.target.value)}
          placeholder="Eventuali annotazioni..." />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>Annulla</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !desc.trim() || imp <= 0}>
          {saving ? 'Salvataggio…' : initial?.id ? 'Aggiorna' : `Aggiungi ${tipo === 'entrata' ? 'entrata' : 'uscita'}`}
        </button>
      </div>
    </form>
  )
}

// ── VoceRow — definito a livello modulo ───────────────────────────────────────
interface VoceRowProps {
  v: VocePrevista
  tipo: 'entrata' | 'uscita'
  canEdit: boolean
  editingId: string | null
  confirmId: string | null
  onEdit: (id: string) => void
  onDeleteReq: (id: string) => void
  onDeleteOk: (id: string) => void
  onDeleteCancel: () => void
}

function VoceRow({ v, tipo, canEdit, editingId, confirmId, onEdit, onDeleteReq, onDeleteOk, onDeleteCancel }: VoceRowProps) {
  const cat = tipo === 'entrata'
    ? CAT_ENTRATE.find(c => c.value === v.categoria)?.label
    : CAT_USCITE.find(c => c.value === v.categoria)?.label
  const colore = tipo === 'entrata' ? 'var(--verde)' : 'var(--rosso)'

  return (
    <tr style={{ borderBottom: '1px solid var(--grigio-6)', background: editingId === v.id ? 'rgba(200,240,0,0.03)' : undefined }}>
      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>{v.descrizione}</td>
      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grigio-3)' }}>{cat ?? v.categoria}</td>
      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 13, color: colore, fontWeight: 700 }}>
        {fmt(v.importo_previsto)}
      </td>
      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--grigio-4)' }}>
        {v.mese_riferimento ? MESI[v.mese_riferimento - 1] : '—'}
      </td>
      <td style={{ padding: '10px 14px' }}>
        {canEdit && confirmId !== v.id && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => onEdit(v.id)} style={{ background: 'transparent', border: '1px solid var(--grigio-5)', borderRadius: 3, padding: '3px 9px', cursor: 'pointer', fontSize: 11, color: 'var(--grigio-3)' }}>
              Modifica
            </button>
            <button onClick={() => onDeleteReq(v.id)} style={{ background: 'transparent', border: '1px solid var(--grigio-5)', borderRadius: 3, padding: '3px 9px', cursor: 'pointer', fontSize: 11, color: 'var(--rosso)' }}>
              Elimina
            </button>
          </div>
        )}
        {canEdit && confirmId === v.id && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--rosso)' }}>Conferma?</span>
            <button onClick={() => onDeleteOk(v.id)} style={{ background: 'var(--rosso)', border: 'none', borderRadius: 3, padding: '3px 9px', cursor: 'pointer', fontSize: 11, color: '#fff', fontWeight: 700 }}>
              Sì
            </button>
            <button onClick={onDeleteCancel} style={{ background: 'transparent', border: '1px solid var(--grigio-5)', borderRadius: 3, padding: '3px 9px', cursor: 'pointer', fontSize: 11, color: 'var(--grigio-3)' }}>
              No
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

// ── Pagina principale ─────────────────────────────────────────────────────────
export default function BudgetStagionalePage() {
  const supabase = createClient()

  const [clubId,     setClubId]     = useState<string | null>(null)
  const [ruolo,      setRuolo]      = useState<string>('')
  const [stagione,   setStagione]   = useState('2026/27')
  const [budget,     setBudget]     = useState<BudgetStagionale | null>(null)
  const [entratePrev, setEntratePrev] = useState<VocePrevista[]>([])
  const [uscitePrev,  setUscitePrev]  = useState<VocePrevista[]>([])
  const [primaNota,  setPrimaNota]  = useState<MovPrimaNota[]>([])
  const [loading,    setLoading]    = useState(true)

  // Form tetto
  const [editTetto,  setEditTetto]  = useState(false)
  const [tBudget,    setTBudget]    = useState(0)
  const [tMercato,   setTMercato]   = useState(0)
  const [tNote,      setTNote]      = useState('')
  const [savingTetto,setSavingTetto]= useState(false)

  // Tab
  const [tab, setTab] = useState<'dashboard' | 'entrate' | 'uscite' | 'configura'>('dashboard')

  // CRUD entrate/uscite
  const [addingE,    setAddingE]    = useState(false)
  const [addingU,    setAddingU]    = useState(false)
  const [editIdE,    setEditIdE]    = useState<string | null>(null)
  const [editIdU,    setEditIdU]    = useState<string | null>(null)
  const [confirmE,   setConfirmE]   = useState<string | null>(null)
  const [confirmU,   setConfirmU]   = useState<string | null>(null)
  const [savingVoce, setSavingVoce] = useState(false)
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const canEdit = ruolo === 'presidente' || ruolo === ''

  // ── Anno di riferimento dalla stagione ──────────────────────────────────────
  const annoInizio = parseInt(stagione.slice(0, 4))

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: utente } = await supabase.from('utenti').select('club_id, ruolo').eq('id', user.id).single()
    if (!utente) return
    setClubId(utente.club_id)
    setRuolo(utente.ruolo)

    const [bs, ep, up, pn] = await Promise.all([
      supabase.from('budget_stagionale').select('*').eq('club_id', utente.club_id).eq('stagione_riferimento', stagione).maybeSingle(),
      supabase.from('entrate_previste').select('*').eq('club_id', utente.club_id).eq('stagione_riferimento', stagione).order('mese_riferimento').order('categoria'),
      supabase.from('uscite_previste').select('*').eq('club_id', utente.club_id).eq('stagione_riferimento', stagione).order('mese_riferimento').order('categoria'),
      supabase.from('prima_nota').select('tipo, importo, data').eq('club_id', utente.club_id)
        .gte('data', `${annoInizio}-07-01`).lte('data', `${annoInizio + 1}-06-30`),
    ])

    setBudget(bs.data ?? null)
    setTBudget(bs.data?.budget_totale_stagione ?? 0)
    setTMercato(bs.data?.budget_mercato ?? 0)
    setTNote(bs.data?.note_budget ?? '')
    setEntratePrev(ep.data ?? [])
    setUscitePrev(up.data ?? [])
    setPrimaNota(pn.data ?? [])
    setLoading(false)
  }, [supabase, stagione, annoInizio])

  useEffect(() => { load() }, [load])

  // ── Calcoli ──────────────────────────────────────────────────────────────────
  const usciteEffettive  = primaNota.filter(m => m.tipo === 'uscita').reduce((s, m) => s + Number(m.importo), 0)
  const entrateEffettive = primaNota.filter(m => m.tipo === 'entrata').reduce((s, m) => s + Number(m.importo), 0)
  const totEntratePrev   = entratePrev.reduce((s, v) => s + Number(v.importo_previsto), 0)
  const totUscitePrev    = uscitePrev.reduce((s, v) => s + Number(v.importo_previsto), 0)
  const saldoPrevisto    = totEntratePrev - totUscitePrev
  const percBudget       = budget?.budget_totale_stagione ? Math.round((usciteEffettive / budget.budget_totale_stagione) * 100) : 0

  // Per il grafico mensile (solo mesi con dati)
  const datiMensili = MESI.map((lbl, i) => {
    const m    = String(i + 1).padStart(2, '0')
    const anno = i < 6 ? annoInizio + 1 : annoInizio   // lug-dic anno X, gen-giu anno X+1
    const key  = `${anno}-${m}`
    const effE = primaNota.filter(p => p.tipo === 'entrata' && p.data.startsWith(key)).reduce((s, p) => s + Number(p.importo), 0)
    const effU = primaNota.filter(p => p.tipo === 'uscita'  && p.data.startsWith(key)).reduce((s, p) => s + Number(p.importo), 0)
    const prevE = entratePrev.filter(v => v.mese_riferimento === i + 1).reduce((s, v) => s + Number(v.importo_previsto), 0)
    const prevU = uscitePrev.filter(v => v.mese_riferimento === i + 1).reduce((s, v) => s + Number(v.importo_previsto), 0)
    return { lbl, effE, effU, prevE, prevU }
  })

  // ── Salva tetto ──────────────────────────────────────────────────────────────
  const salvaTetto = async () => {
    if (!clubId) return
    setSavingTetto(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        club_id: clubId, stagione_riferimento: stagione,
        budget_totale_stagione: tBudget, budget_mercato: tMercato,
        note_budget: tNote || null, created_by: user?.id,
      }
      if (budget) {
        const { error } = await supabase.from('budget_stagionale').update({ budget_totale_stagione: tBudget, budget_mercato: tMercato, note_budget: tNote || null, updated_at: new Date().toISOString() }).eq('id', budget.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('budget_stagionale').insert(payload)
        if (error) throw error
      }
      setEditTetto(false)
      showToast('Budget aggiornato')
      await load()
    } catch (e: any) { showToast(e.message ?? 'Errore', false) }
    finally { setSavingTetto(false) }
  }

  // ── CRUD voci ────────────────────────────────────────────────────────────────
  const saveVoce = async (tipo: 'entrata' | 'uscita', editId: string | null, vals: Omit<VocePrevista, 'id'>) => {
    if (!clubId) return
    setSavingVoce(true)
    const { data: { user } } = await supabase.auth.getUser()
    const table = tipo === 'entrata' ? 'entrate_previste' : 'uscite_previste'
    try {
      if (editId) {
        const { error } = await supabase.from(table).update({ ...vals, updated_at: new Date().toISOString() }).eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from(table).insert({ ...vals, club_id: clubId, stagione_riferimento: stagione, created_by: user?.id })
        if (error) throw error
      }
      if (tipo === 'entrata') { setAddingE(false); setEditIdE(null) }
      else { setAddingU(false); setEditIdU(null) }
      showToast(editId ? 'Voce aggiornata' : 'Voce aggiunta')
      await load()
    } catch (e: any) { showToast(e.message ?? 'Errore', false) }
    finally { setSavingVoce(false) }
  }

  const deleteVoce = async (tipo: 'entrata' | 'uscita', id: string) => {
    const table = tipo === 'entrata' ? 'entrate_previste' : 'uscite_previste'
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) { showToast(error.message, false); return }
    if (tipo === 'entrata') { setConfirmE(null); setEntratePrev(p => p.filter(v => v.id !== id)) }
    else { setConfirmU(null); setUscitePrev(p => p.filter(v => v.id !== id)) }
    showToast('Voce eliminata')
  }

  // ── TAB UI ───────────────────────────────────────────────────────────────────
  const TABS: { id: typeof tab; label: string }[] = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'entrate',   label: '📈 Entrate previste' },
    { id: 'uscite',    label: '📉 Uscite previste' },
    ...(canEdit ? [{ id: 'configura' as typeof tab, label: '⚙ Configura tetto' }] : []),
  ]

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)' }}>
      Caricamento…
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
            Budget Stagionale
          </h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
            Pianificazione finanziaria — entrate e uscite previste vs effettive
          </p>
        </div>
        {/* Selettore stagione */}
        <div style={{ display: 'flex', gap: 6 }}>
          {STAGIONI.map(s => (
            <button key={s} onClick={() => setStagione(s)} style={{
              padding: '6px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer',
              background: stagione === s ? 'var(--accent)' : 'var(--grigio-5)',
              color: stagione === s ? 'var(--black)' : 'var(--grigio-2)',
              border: 'none', fontWeight: stagione === s ? 700 : 400, letterSpacing: '0.05em', borderRadius: 3,
            }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* KPI rapide */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Tetto budget</div>
          <div className="stat-value" style={{ color: budget ? 'var(--white)' : 'var(--grigio-4)' }}>
            {budget ? fmt(budget.budget_totale_stagione) : '—'}
          </div>
          <div className="stat-sub">limite stagionale</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Uscite effettive</div>
          <div className="stat-value" style={{ color: 'var(--rosso)' }}>{fmt(usciteEffettive)}</div>
          <div className="stat-sub">da prima nota</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Saldo previsto</div>
          <div className="stat-value" style={{ color: saldoPrevisto >= 0 ? 'var(--verde)' : 'var(--rosso)' }}>
            {saldoPrevisto >= 0 ? '+' : ''}{fmt(saldoPrevisto)}
          </div>
          <div className="stat-sub">entrate − uscite previste</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Budget consumato</div>
          <div className="stat-value" style={{ color: percBudget >= 90 ? 'var(--rosso)' : percBudget >= 70 ? 'var(--ambra)' : 'var(--accent)' }}>
            {budget ? `${percBudget}%` : '—'}
          </div>
          <div className="stat-sub">uscite vs tetto</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--grigio-5)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 18px', background: 'transparent', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.08em', border: 'none',
            borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            color: tab === t.id ? 'var(--accent)' : 'var(--grigio-3)',
            marginBottom: -1, transition: 'color 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB DASHBOARD ─────────────────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div>
          {/* Gauge + Semaforo */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 160px 1fr', gap: 20, marginBottom: 24, alignItems: 'start' }}>
            <div className="card" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grigio-4)', letterSpacing: '0.1em' }}>BUDGET CONSUMATO</div>
              <GaugeBudget speso={usciteEffettive} totale={budget?.budget_totale_stagione ?? 0} />
            </div>
            <div className="card" style={{ padding: '20px 16px' }}>
              <Semaforo perc={percBudget} />
            </div>
            {/* Riepilogo numeri */}
            <div className="card" style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grigio-4)', letterSpacing: '0.1em', marginBottom: 14 }}>RIEPILOGO FINANZIARIO</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { lbl: 'Entrate previste', val: totEntratePrev, colore: 'rgba(200,240,0,0.5)' },
                  { lbl: 'Entrate effettive', val: entrateEffettive, colore: 'var(--verde)' },
                  { lbl: 'Uscite previste', val: totUscitePrev, colore: 'rgba(239,68,68,0.5)' },
                  { lbl: 'Uscite effettive', val: usciteEffettive, colore: 'var(--rosso)' },
                ].map(r => (
                  <div key={r.lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{r.lbl}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: r.colore }}>{fmt(r.val)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--grigio-5)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--grigio-2)' }}>Saldo previsto</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: saldoPrevisto >= 0 ? 'var(--verde)' : 'var(--rosso)' }}>
                    {saldoPrevisto >= 0 ? '+' : ''}{fmt(saldoPrevisto)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Grafico mensile entrate */}
          <div className="card" style={{ padding: '18px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grigio-3)', marginBottom: 4 }}>
              Entrate mensili — previste vs effettive
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--grigio-4)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 4, background: 'rgba(200,240,0,0.35)', display: 'inline-block', borderRadius: 2 }} /> Previste
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 4, background: 'var(--verde)', display: 'inline-block', borderRadius: 2 }} /> Effettive
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {datiMensili.map((m, i) => (
                (m.prevE > 0 || m.effE > 0) ? (
                  <BarraMensile key={i} label={m.lbl} previsto={m.prevE} effettivo={m.effE} tipo="entrata" />
                ) : null
              ))}
              {datiMensili.every(m => m.prevE === 0 && m.effE === 0) && (
                <div style={{ color: 'var(--grigio-4)', fontSize: 12, padding: '8px 0' }}>Nessun dato per questa stagione.</div>
              )}
            </div>
          </div>

          {/* Grafico mensile uscite */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grigio-3)', marginBottom: 4 }}>
              Uscite mensili — previste vs effettive
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--grigio-4)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 4, background: 'rgba(239,68,68,0.3)', display: 'inline-block', borderRadius: 2 }} /> Previste
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 4, background: 'var(--rosso)', display: 'inline-block', borderRadius: 2 }} /> Effettive
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {datiMensili.map((m, i) => (
                (m.prevU > 0 || m.effU > 0) ? (
                  <BarraMensile key={i} label={m.lbl} previsto={m.prevU} effettivo={m.effU} tipo="uscita" />
                ) : null
              ))}
              {datiMensili.every(m => m.prevU === 0 && m.effU === 0) && (
                <div style={{ color: 'var(--grigio-4)', fontSize: 12, padding: '8px 0' }}>Nessun dato per questa stagione.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB ENTRATE PREVISTE ──────────────────────────────────────────────── */}
      {tab === 'entrate' && (
        <div>
          {(addingE || editIdE) && (
            <div className="card" style={{ padding: '20px 24px', marginBottom: 20, borderLeft: '3px solid var(--verde)' }}>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--verde)', marginBottom: 14 }}>
                {editIdE ? '✏️ Modifica entrata' : '+ Nuova entrata prevista'}
              </div>
              <FormVoce tipo="entrata" initial={editIdE ? entratePrev.find(v => v.id === editIdE) : undefined}
                onSave={vals => saveVoce('entrata', editIdE, vals)}
                onCancel={() => { setAddingE(false); setEditIdE(null) }} saving={savingVoce} />
            </div>
          )}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Entrate previste</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--verde)', fontWeight: 700 }}>{fmt(totEntratePrev)}</span>
                {canEdit && !addingE && !editIdE && (
                  <button className="btn btn-primary btn-sm" onClick={() => setAddingE(true)}>+ Aggiungi</button>
                )}
              </div>
            </div>
            {entratePrev.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
                Nessuna entrata prevista.{canEdit && <> <button className="btn btn-secondary btn-sm" style={{ marginLeft: 10 }} onClick={() => setAddingE(true)}>+ Aggiungi</button></>}
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Descrizione</th><th>Categoria</th><th>Importo previsto</th><th>Mese</th><th></th></tr>
                  </thead>
                  <tbody>
                    {entratePrev.map(v => (
                      <VoceRow key={v.id} v={v} tipo="entrata" canEdit={canEdit}
                        editingId={editIdE} confirmId={confirmE}
                        onEdit={id => { setEditIdE(id); setAddingE(false) }}
                        onDeleteReq={setConfirmE} onDeleteOk={id => deleteVoce('entrata', id)}
                        onDeleteCancel={() => setConfirmE(null)} />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--grigio-6)', borderTop: '1px solid var(--grigio-5)' }}>
                      <td colSpan={2} style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--grigio-3)' }}>Totale</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--verde)' }}>{fmt(totEntratePrev)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
          {/* Confronto effettive */}
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--grigio-6)', borderRadius: 6, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--grigio-3)' }}>Entrate effettive (prima nota): <strong style={{ color: 'var(--verde)' }}>{fmt(entrateEffettive)}</strong></span>
            <span style={{ fontSize: 12, color: 'var(--grigio-3)' }}>Differenza: <strong style={{ color: entrateEffettive >= totEntratePrev ? 'var(--verde)' : 'var(--ambra)' }}>{fmt(entrateEffettive - totEntratePrev)}</strong></span>
          </div>
        </div>
      )}

      {/* ── TAB USCITE PREVISTE ───────────────────────────────────────────────── */}
      {tab === 'uscite' && (
        <div>
          {(addingU || editIdU) && (
            <div className="card" style={{ padding: '20px 24px', marginBottom: 20, borderLeft: '3px solid var(--rosso)' }}>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--rosso)', marginBottom: 14 }}>
                {editIdU ? '✏️ Modifica uscita' : '+ Nuova uscita prevista'}
              </div>
              <FormVoce tipo="uscita" initial={editIdU ? uscitePrev.find(v => v.id === editIdU) : undefined}
                onSave={vals => saveVoce('uscita', editIdU, vals)}
                onCancel={() => { setAddingU(false); setEditIdU(null) }} saving={savingVoce} />
            </div>
          )}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Uscite previste</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--rosso)', fontWeight: 700 }}>{fmt(totUscitePrev)}</span>
                {canEdit && !addingU && !editIdU && (
                  <button className="btn btn-primary btn-sm" onClick={() => setAddingU(true)}>+ Aggiungi</button>
                )}
              </div>
            </div>
            {uscitePrev.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
                Nessuna uscita prevista.{canEdit && <> <button className="btn btn-secondary btn-sm" style={{ marginLeft: 10 }} onClick={() => setAddingU(true)}>+ Aggiungi</button></>}
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Descrizione</th><th>Categoria</th><th>Importo previsto</th><th>Mese</th><th></th></tr>
                  </thead>
                  <tbody>
                    {uscitePrev.map(v => (
                      <VoceRow key={v.id} v={v} tipo="uscita" canEdit={canEdit}
                        editingId={editIdU} confirmId={confirmU}
                        onEdit={id => { setEditIdU(id); setAddingU(false) }}
                        onDeleteReq={setConfirmU} onDeleteOk={id => deleteVoce('uscita', id)}
                        onDeleteCancel={() => setConfirmU(null)} />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--grigio-6)', borderTop: '1px solid var(--grigio-5)' }}>
                      <td colSpan={2} style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--grigio-3)' }}>Totale</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--rosso)' }}>{fmt(totUscitePrev)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--grigio-6)', borderRadius: 6, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--grigio-3)' }}>Uscite effettive (prima nota): <strong style={{ color: 'var(--rosso)' }}>{fmt(usciteEffettive)}</strong></span>
            <span style={{ fontSize: 12, color: 'var(--grigio-3)' }}>Differenza: <strong style={{ color: usciteEffettive <= totUscitePrev ? 'var(--verde)' : 'var(--rosso)' }}>{fmt(usciteEffettive - totUscitePrev)}</strong></span>
            {budget && <span style={{ fontSize: 12, color: 'var(--grigio-3)' }}>Tetto residuo: <strong style={{ color: usciteEffettive > budget.budget_totale_stagione ? 'var(--rosso)' : 'var(--verde)' }}>{fmt(budget.budget_totale_stagione - usciteEffettive)}</strong></span>}
          </div>
        </div>
      )}

      {/* ── TAB CONFIGURA TETTO ───────────────────────────────────────────────── */}
      {tab === 'configura' && canEdit && (
        <div className="card" style={{ padding: '24px 28px', maxWidth: 560 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: 'var(--grigio)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            ⚙ Configura tetto di budget — {stagione}
          </div>
          {budget && !editTetto && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--grigio-3)' }}>Budget totale stagione</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--white)' }}>{fmt(budget.budget_totale_stagione)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--grigio-3)' }}>Budget di mercato</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--ambra)' }}>{fmt(budget.budget_mercato)}</span>
                </div>
                {budget.note_budget && (
                  <div style={{ padding: '10px 14px', background: 'var(--grigio-6)', borderRadius: 4, fontSize: 12, color: 'var(--grigio-3)' }}>
                    {budget.note_budget}
                  </div>
                )}
              </div>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={() => setEditTetto(true)}>
                Modifica
              </button>
            </div>
          )}
          {(!budget || editTetto) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Budget totale stagione (€) *</label>
                <input className="input" type="number" min={0} step={1} value={tBudget || ''}
                  onChange={e => setTBudget(parseFloat(e.target.value) || 0)} placeholder="es. 150000" />
                <div style={{ fontSize: 11, color: 'var(--grigio-4)', marginTop: 4 }}>
                  Tetto massimo complessivo — visibile anche a Segretario e Team Manager
                </div>
              </div>
              <div>
                <label className="label">Budget di mercato (€)</label>
                <input className="input" type="number" min={0} step={1} value={tMercato || ''}
                  onChange={e => setTMercato(parseFloat(e.target.value) || 0)} placeholder="es. 30000" />
                <div style={{ fontSize: 11, color: 'var(--grigio-4)', marginTop: 4 }}>
                  Quota destinata ad acquisti / cessioni — visibile anche al DS
                </div>
              </div>
              <div>
                <label className="label">Note <span style={{ color: 'var(--grigio-3)', fontWeight: 400 }}>(facoltativo)</span></label>
                <textarea className="input" rows={3} value={tNote} onChange={e => setTNote(e.target.value)}
                  placeholder="Eventuali note sul budget..." style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {editTetto && <button className="btn btn-secondary btn-sm" onClick={() => setEditTetto(false)} disabled={savingTetto}>Annulla</button>}
                <button className="btn btn-primary btn-sm" onClick={salvaTetto} disabled={savingTetto || tBudget <= 0}>
                  {savingTetto ? 'Salvataggio…' : budget ? 'Aggiorna budget' : 'Imposta budget'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          padding: '12px 20px', borderRadius: 6,
          background: toast.ok ? 'var(--verde)' : 'var(--rosso)',
          color: '#fff', fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
