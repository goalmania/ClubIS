'use client'
import FeatureGate from '@/components/FeatureGate'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal, FormField, FormGrid, Select, Toast } from '@/components/ui'
import { formatData } from '@/lib/helpers'

const RUOLI_PER_CATEGORIA: Record<string, string[]> = {
  sportivo:         ['presidente', 'allenatore', 'ds'],
  economico:        ['presidente', 'segretario'],
  finanziario:      ['presidente', 'segretario'],
  crescita_giovani: ['presidente', 'allenatore', 'ds', 'osservatore'],
  strutturale:      ['presidente', 'segretario'],
  comunicazione:    ['presidente', 'segretario'],
  altro:            ['presidente'],
}

const TUTTI_RUOLI = [
  { value: 'presidente',  label: 'Presidente' },
  { value: 'allenatore',  label: 'Allenatore' },
  { value: 'ds',          label: 'Direttore Sportivo' },
  { value: 'segretario',  label: 'Segretario' },
  { value: 'osservatore', label: 'Osservatore' },
]

const CATEGORIE = [
  { key: 'sportivo',         label: 'Sportivi',         color: 'var(--accent-green)',  badge: 'badge-verde' },
  { key: 'economico',        label: 'Economici',        color: 'var(--accent-blue)',   badge: 'badge-blu' },
  { key: 'finanziario',      label: 'Finanziari',       color: '#a371f7',              badge: 'badge-viola' },
  { key: 'crescita_giovani', label: 'Crescita Giovani', color: 'var(--accent-orange)', badge: 'badge-ambra' },
  { key: 'strutturale',      label: 'Strutturali',      color: 'var(--accent-blue)',   badge: 'badge-blu' },
  { key: 'comunicazione',    label: 'Comunicazione',    color: '#a371f7',              badge: 'badge-viola' },
  { key: 'altro',            label: 'Altro',            color: 'var(--text-muted)',    badge: 'badge-grigio' },
]

const STATO_OPTIONS = [
  { value: 'in_corso',       label: 'In corso' },
  { value: 'raggiunto',      label: 'Raggiunto' },
  { value: 'non_raggiunto',  label: 'Non raggiunto' },
  { value: 'sospeso',        label: 'Sospeso' },
]
const PRIORITA_OPTIONS = [
  { value: '1', label: 'Alta' },
  { value: '2', label: 'Media' },
  { value: '3', label: 'Bassa' },
]

const statoBadge: Record<string, string> = {
  in_corso: 'badge-ambra', raggiunto: 'badge-verde',
  non_raggiunto: 'badge-rosso', sospeso: 'badge-grigio',
}

export default function ObiettiviPage() {
  const supabase = createClient()

  const [obiettivi, setObiettivi] = useState<any[]>([])
  const [clubId, setClubId] = useState('')
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [editingObiettivo, setEditingObiettivo] = useState<any | null>(null)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [categoriaDefault, setCategoriaDefault] = useState('sportivo')
  const [saving, setSaving] = useState(false)

  // Form
  const [titolo, setTitolo] = useState('')
  const [categoria, setCategoria] = useState('sportivo')
  const [priorita, setPriorita] = useState('2')
  const [target, setTarget] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [scadenza, setScadenza] = useState('')
  const [stato, setStato] = useState('in_corso')
  const [progresso, setProgresso] = useState(0)
  const [note, setNote] = useState('')
  const [ruoliVisibili, setRuoliVisibili] = useState<string[]>(['presidente'])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user!.id).single()
      setClubId(utente!.club_id)
      const { data } = await supabase
        .from('obiettivi_club')
        .select('*')
        .eq('club_id', utente!.club_id)
        .order('priorita')
        .order('created_at', { ascending: false })
      setObiettivi(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function ricarica(cid: string) {
    const { data } = await supabase
      .from('obiettivi_club').select('*').eq('club_id', cid)
      .order('priorita').order('created_at', { ascending: false })
    setObiettivi(data ?? [])
  }

  function apriNuovo(catKey = 'sportivo') {
    setEditingObiettivo(null)
    setTitolo(''); setCategoria(catKey); setPriorita('2')
    setTarget(''); setDescrizione(''); setScadenza('')
    setStato('in_corso'); setProgresso(0); setNote('')
    setRuoliVisibili(RUOLI_PER_CATEGORIA[catKey] ?? ['presidente'])
    setOpenModal(true)
  }

  function apriModifica(o: any) {
    setEditingObiettivo(o)
    setTitolo(o.titolo ?? ''); setCategoria(o.categoria ?? 'sportivo')
    setPriorita(String(o.priorita ?? 2)); setTarget(o.target ?? '')
    setDescrizione(o.descrizione ?? ''); setScadenza(o.scadenza ?? '')
    setStato(o.stato ?? 'in_corso'); setProgresso(o.progresso ?? 0)
    setNote(o.note ?? '')
    setRuoliVisibili(o.ruoli_visibili ?? RUOLI_PER_CATEGORIA[o.categoria ?? 'sportivo'] ?? ['presidente'])
    setOpenModal(true)
  }

  async function salva() {
    if (!titolo.trim()) { setToast({ msg: 'Titolo obbligatorio', tipo: 'error' }); return }
    setSaving(true)
    const payload = {
      club_id: clubId,
      titolo: titolo.trim(),
      categoria,
      priorita: parseInt(priorita),
      target: target || null,
      descrizione: descrizione || null,
      scadenza: scadenza || null,
      stato,
      progresso,
      note: note || null,
      ruoli_visibili: ruoliVisibili.length > 0 ? ruoliVisibili : ['presidente'],
      updated_at: new Date().toISOString(),
    }
    let error
    if (editingObiettivo) {
      ;({ error } = await supabase.from('obiettivi_club').update(payload).eq('id', editingObiettivo.id))
    } else {
      ;({ error } = await supabase.from('obiettivi_club').insert(payload))
    }
    setSaving(false)
    if (error) { setToast({ msg: error.message, tipo: 'error' }); return }
    await ricarica(clubId)
    setOpenModal(false)
    setToast({ msg: editingObiettivo ? 'Obiettivo aggiornato' : 'Obiettivo aggiunto', tipo: 'success' })
  }

  // KPI globali
  const totale = obiettivi.length
  const raggiunti = obiettivi.filter(o => o.stato === 'raggiunto').length
  const inCorso = obiettivi.filter(o => o.stato === 'in_corso').length
  const nonRaggiunti = obiettivi.filter(o => o.stato === 'non_raggiunto').length
  const avanzamento = totale > 0 ? Math.round((raggiunti / totale) * 100) : 0

  const perCategoria = CATEGORIE.map(c => ({
    ...c,
    obiettivi: obiettivi.filter(o => o.categoria === c.key),
    raggiunti: obiettivi.filter(o => o.categoria === c.key && o.stato === 'raggiunto').length,
  }))

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Caricamento...</div>

  return (
    <FeatureGate feature="obiettivi_club" featureLabel="Obiettivi Club">
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Obiettivi club</h1>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                Goal tracking sportivo, economico e strategico
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => apriNuovo()} data-onboarding="btn-nuovo-obiettivo">+ Nuovo obiettivo</button>
          </div>

          {/* KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-label">Totale obiettivi</div>
              <div className="stat-value">{totale}</div>
              <div className="stat-sub">stagione in corso</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Raggiunti</div>
              <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{raggiunti}</div>
              <div className="stat-sub">{avanzamento}% del totale</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">In corso</div>
              <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>{inCorso}</div>
              <div className="stat-sub">in fase di esecuzione</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Non raggiunti</div>
              <div className="stat-value" style={{ color: nonRaggiunti > 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>{nonRaggiunti}</div>
              <div className="stat-sub">richiedono revisione</div>
            </div>
          </div>

          {/* Barra avanzamento globale */}
          <div className="card" style={{ padding: '14px 18px', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                Avanzamento stagionale complessivo
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-green)' }}>{avanzamento}%</span>
            </div>
            <div className="progress" style={{ height: 8 }}>
              <div className="progress-fill" style={{
                width: `${avanzamento}%`,
                background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-green))',
              }} />
            </div>
          </div>

          {/* Griglia categorie */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {perCategoria.map(c => {
              const pct = c.obiettivi.length > 0
                ? Math.round((c.raggiunti / c.obiettivi.length) * 100)
                : 0
              return (
                <div key={c.key} className="card" style={{ padding: 18 }}>
                  {/* Header categoria */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: c.color }}>{c.label}</div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {c.raggiunti}/{c.obiettivi.length}
                    </span>
                  </div>

                  {/* Progress bar categoria */}
                  <div className="progress" style={{ marginBottom: 14 }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: c.color }} />
                  </div>

                  {/* Lista obiettivi */}
                  {c.obiettivi.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0 12px' }}>
                      Nessun obiettivo
                    </div>
                  ) : (
                    c.obiettivi.map(o => (
                      <div key={o.id} style={{
                        padding: '8px 10px', marginBottom: 6,
                        background: 'var(--bg-input)', borderRadius: 6,
                        borderLeft: `3px solid ${c.color}`,
                        opacity: o.stato === 'non_raggiunto' ? 0.6 : 1,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3, gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>
                            {o.titolo}
                          </span>
                          <span className={`badge ${statoBadge[o.stato] ?? 'badge-grigio'}`} style={{ fontSize: 10, flexShrink: 0 }}>
                            {o.stato.replace('_', ' ')}
                          </span>
                        </div>
                        {o.target && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                            Target: {o.target}
                          </div>
                        )}
                        {o.progresso > 0 && (
                          <div className="progress" style={{ height: 3, marginBottom: 6 }}>
                            <div className="progress-fill" style={{ width: `${o.progresso}%`, background: c.color }} />
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, padding: '3px 8px' }}
                            onClick={() => apriModifica(o)}
                          >
                            Modifica
                          </button>
                          {o.scadenza && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              Scad. {formatData(o.scadenza)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Aggiungi per categoria */}
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{
                      width: '100%', marginTop: 8, fontSize: 12,
                      justifyContent: 'center',
                      border: '1px dashed var(--border)',
                    }}
                    onClick={() => { setCategoriaDefault(c.key); apriNuovo(c.key) }}
                  >
                    + Aggiungi obiettivo {c.label.toLowerCase()}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Modal */}
          <Modal
            open={openModal}
            onClose={() => setOpenModal(false)}
            title={editingObiettivo ? 'Modifica obiettivo' : 'Nuovo obiettivo'}
            width={560}
          >
            <FormField label="Titolo" required>
              <input className="input" value={titolo} onChange={e => setTitolo(e.target.value)} style={{ width: '100%' }} />
            </FormField>

            <FormGrid cols={2}>
              <FormField label="Categoria" required>
                <Select
                  value={categoria}
                  onChange={v => {
                    setCategoria(v)
                    // Auto-popola i ruoli in base alla categoria scelta
                    // solo se non è una modifica (o se ancora corrispondono ai default)
                    if (!editingObiettivo || ruoliVisibili.join() === (RUOLI_PER_CATEGORIA[categoria] ?? ['presidente']).join()) {
                      setRuoliVisibili(RUOLI_PER_CATEGORIA[v] ?? ['presidente'])
                    }
                  }}
                  options={CATEGORIE.map(c => ({ value: c.key, label: c.label }))}
                />
              </FormField>
              <FormField label="Priorità">
                <Select value={priorita} onChange={setPriorita} options={PRIORITA_OPTIONS} />
              </FormField>
            </FormGrid>

            <FormField
              label="Target / Descrizione obiettivo"
              hint="Es. 'Raggiungere il 3° posto in classifica' o '€50.000 di sponsorizzazioni'"
            >
              <input className="input" value={target} onChange={e => setTarget(e.target.value)} style={{ width: '100%' }} />
            </FormField>

            <FormField label="Descrizione dettagliata">
              <textarea className="input" rows={2} value={descrizione} onChange={e => setDescrizione(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
            </FormField>

            <FormGrid cols={2}>
              <FormField label="Scadenza">
                <input className="input" type="date" value={scadenza} onChange={e => setScadenza(e.target.value)} style={{ width: '100%' }} />
              </FormField>
              <FormField label="Stato">
                <Select value={stato} onChange={setStato} options={STATO_OPTIONS} />
              </FormField>
            </FormGrid>

            <FormField label="Progresso (%)" hint="0–100">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progresso}
                  onChange={e => setProgresso(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--accent-blue)' }}
                />
                <span style={{
                  minWidth: 36, textAlign: 'center',
                  fontFamily: 'var(--font-mono)', fontWeight: 700,
                  fontSize: 14, color: 'var(--accent-blue)',
                }}>
                  {progresso}%
                </span>
              </div>
            </FormField>

            <FormField
              label="Visibile ai ruoli"
              hint="Seleziona chi può vedere questo obiettivo nelle proprie dashboard"
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 2 }}>
                {TUTTI_RUOLI.map(r => {
                  const checked = ruoliVisibili.includes(r.value)
                  const isPresidente = r.value === 'presidente'
                  return (
                    <label
                      key={r.value}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        cursor: isPresidente ? 'not-allowed' : 'pointer',
                        fontSize: 12, color: checked ? 'var(--white)' : 'var(--grigio-3)',
                        padding: '5px 10px', borderRadius: 20,
                        border: `1px solid ${checked ? 'var(--accent)' : 'var(--grigio-5)'}`,
                        background: checked ? 'rgba(200,240,0,0.08)' : 'transparent',
                        transition: 'all 0.12s',
                        userSelect: 'none' as const,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isPresidente}
                        style={{ display: 'none' }}
                        onChange={e => {
                          if (isPresidente) return
                          setRuoliVisibili(prev =>
                            e.target.checked ? [...prev, r.value] : prev.filter(v => v !== r.value)
                          )
                        }}
                      />
                      {checked ? '✓ ' : ''}{r.label}
                    </label>
                  )
                })}
              </div>
            </FormField>

            <FormField label="Note">
              <textarea className="input" rows={2} value={note} onChange={e => setNote(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
            </FormField>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setOpenModal(false)}>Annulla</button>
              <button className="btn btn-primary btn-sm" onClick={salva} disabled={saving}>
                {saving ? 'Salvataggio...' : editingObiettivo ? 'Aggiorna' : 'Aggiungi'}
              </button>
            </div>
          </Modal>

          {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
        </div>
    </FeatureGate>
  )
}
