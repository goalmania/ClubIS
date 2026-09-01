'use client'
import { useState, useCallback, useEffect } from 'react'
import { PageHeader, FormSection, FormGrid, FormField, Drawer, Toast } from '@/components/ui'
import { formatData } from '@/lib/helpers'

/* ─── Tipi ───────────────────────────────────────────────────────── */

interface Premio { tipo: string; importo: string; condizione: string }

interface FormState {
  tesserato_id: string
  nome_tesserato: string
  cognome_tesserato: string
  tipo_lavoratore: string
  retribuzione_lorda_annua: string
  data_inizio: string
  data_scadenza: string
  durata_anni: string
  clausola_rescissoria: string
  premi: Premio[]
  stato_deposito: string
  lega_ref: string
  note: string
  // Campi ufficiali template
  rappresentante_legale: string
  qualifica_rappresentante: string
  cf_tesserato: string
  data_nascita_tesserato: string
  luogo_nascita_tesserato: string
  domicilio_tesserato: string
  matricola_tesserato: string
  agente_calciatore_nome: string
  agente_calciatore_reg: string
  agente_societa_nome: string
  agente_societa_reg: string
  numero_modulo: string
}

interface PersonaOption { value: string; label: string; nome: string; cognome: string }

const FORM_INIT: FormState = {
  tesserato_id: '', nome_tesserato: '', cognome_tesserato: '',
  tipo_lavoratore: 'calciatore_professionista',
  retribuzione_lorda_annua: '', data_inizio: '', data_scadenza: '',
  durata_anni: '', clausola_rescissoria: '', premi: [],
  stato_deposito: 'da_depositare', lega_ref: '', note: '',
  rappresentante_legale: '', qualifica_rappresentante: '',
  cf_tesserato: '', data_nascita_tesserato: '', luogo_nascita_tesserato: '',
  domicilio_tesserato: '', matricola_tesserato: '',
  agente_calciatore_nome: '', agente_calciatore_reg: '',
  agente_societa_nome: '', agente_societa_reg: '',
  numero_modulo: '',
}

const TIPI_LAVORATORE = [
  { value: 'calciatore_professionista', label: 'Calciatore Professionista' },
  { value: 'collaboratore_tecnico',     label: 'Collaboratore Tecnico' },
]

const STATI_DEPOSITO = [
  { value: 'da_depositare', label: 'Da depositare' },
  { value: 'depositato',    label: 'Depositato' },
]

/* ─── Sub-components ─────────────────────────────────────────────── */

function BadgeStato({ stato }: { stato: string }) {
  const colors: Record<string, string> = {
    da_depositare: 'rgba(255,180,0,0.15)',
    depositato:    'rgba(100,220,100,0.15)',
    scaduto:       'rgba(255,80,80,0.15)',
  }
  const labels: Record<string, string> = {
    da_depositare: 'Da depositare',
    depositato:    'Depositato',
    scaduto:       'Scaduto',
  }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      fontSize: 10,
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      letterSpacing: '0.07em',
      textTransform: 'uppercase',
      background: colors[stato] ?? 'rgba(150,150,150,0.15)',
      color: 'var(--grigio-2)',
    }}>
      {labels[stato] ?? stato}
    </span>
  )
}

function PremioRow({
  premio,
  idx,
  onChange,
  onRemove,
}: {
  premio: Premio
  idx: number
  onChange: (idx: number, field: keyof Premio, val: string) => void
  onRemove: (idx: number) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: 8, marginBottom: 8 }}>
      <input
        value={premio.tipo}
        onChange={e => onChange(idx, 'tipo', e.target.value)}
        placeholder="Tipo (es. gol)"
        style={{ padding: '6px 10px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)', fontSize: 12 }}
      />
      <input
        type="number"
        value={premio.importo}
        onChange={e => onChange(idx, 'importo', e.target.value)}
        placeholder="Importo €"
        style={{ padding: '6px 10px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)', fontSize: 12 }}
      />
      <input
        value={premio.condizione}
        onChange={e => onChange(idx, 'condizione', e.target.value)}
        placeholder="Condizione (es. per ogni gol segnato)"
        style={{ padding: '6px 10px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)', fontSize: 12 }}
      />
      <button
        type="button"
        onClick={() => onRemove(idx)}
        style={{ padding: '6px 10px', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', color: '#f66', cursor: 'pointer', fontSize: 12 }}
      >
        ✕
      </button>
    </div>
  )
}

/* ─── Componente principale ──────────────────────────────────────── */

export default function ContrattiProView({ clubId, ruolo }: { clubId: string; ruolo: string }) {
  const [contratti, setContratti]         = useState<any[]>([])
  const [persone, setPersone]             = useState<PersonaOption[]>([])
  const [drawerOpen, setDrawerOpen]       = useState(false)
  const [editId, setEditId]               = useState<string | null>(null)
  const [form, setForm]                   = useState<FormState>(FORM_INIT)
  const [saving, setSaving]               = useState(false)
  const [toast, setToast]                 = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  void ruolo // disponibile per future restrizioni per ruolo

  /* ── Load ──────────────────────────────────────────────────────── */

  const loadPersone = useCallback(async () => {
    const res = await fetch('/api/giocatori?tutti=1')
    if (!res.ok) return
    const data = await res.json()
    const opts: PersonaOption[] = (data ?? []).map((g: any) => ({
      value: g.id,
      label: `${g.cognome} ${g.nome}`,
      nome: g.nome,
      cognome: g.cognome,
    }))
    setPersone(opts)
  }, [clubId])

  const loadContratti = useCallback(async () => {
    const res = await fetch('/api/contratti-pro')
    if (!res.ok) return
    const data = await res.json()
    setContratti(data ?? [])
  }, [])

  useEffect(() => { loadContratti(); loadPersone() }, [loadContratti, loadPersone])

  /* ── Form helpers ──────────────────────────────────────────────── */

  function setF<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function selectPersona(id: string) {
    const p = persone.find(x => x.value === id)
    setForm(prev => ({
      ...prev,
      tesserato_id: id,
      nome_tesserato: p?.nome ?? prev.nome_tesserato,
      cognome_tesserato: p?.cognome ?? prev.cognome_tesserato,
    }))
  }

  function addPremio() {
    setForm(prev => ({ ...prev, premi: [...prev.premi, { tipo: '', importo: '', condizione: '' }] }))
  }

  function updatePremio(idx: number, field: keyof Premio, val: string) {
    setForm(prev => {
      const premi = [...prev.premi]
      premi[idx] = { ...premi[idx], [field]: val }
      return { ...prev, premi }
    })
  }

  function removePremio(idx: number) {
    setForm(prev => ({ ...prev, premi: prev.premi.filter((_, i) => i !== idx) }))
  }

  function openNuovo() {
    setEditId(null)
    setForm(FORM_INIT)
    setDrawerOpen(true)
  }

  function openEdit(c: any) {
    setEditId(c.id)
    setForm({
      tesserato_id:             c.tesserato_id ?? '',
      nome_tesserato:           c.nome_tesserato ?? '',
      cognome_tesserato:        c.cognome_tesserato ?? '',
      tipo_lavoratore:          c.tipo_lavoratore ?? 'calciatore_professionista',
      retribuzione_lorda_annua: String(c.retribuzione_lorda_annua ?? ''),
      data_inizio:              c.data_inizio ?? '',
      data_scadenza:            c.data_scadenza ?? '',
      durata_anni:              String(c.durata_anni ?? ''),
      clausola_rescissoria:     String(c.clausola_rescissoria ?? ''),
      premi:                    (c.premi ?? []).map((p: any) => ({ tipo: p.tipo ?? '', importo: String(p.importo ?? ''), condizione: p.condizione ?? '' })),
      stato_deposito:           c.stato_deposito ?? 'da_depositare',
      lega_ref:                 c.lega_ref ?? '',
      note:                     c.note ?? '',
      rappresentante_legale:    c.rappresentante_legale ?? '',
      qualifica_rappresentante: c.qualifica_rappresentante ?? '',
      cf_tesserato:             c.cf_tesserato ?? '',
      data_nascita_tesserato:   c.data_nascita_tesserato ?? '',
      luogo_nascita_tesserato:  c.luogo_nascita_tesserato ?? '',
      domicilio_tesserato:      c.domicilio_tesserato ?? '',
      matricola_tesserato:      c.matricola_tesserato ?? '',
      agente_calciatore_nome:   c.agente_calciatore_nome ?? '',
      agente_calciatore_reg:    c.agente_calciatore_reg ?? '',
      agente_societa_nome:      c.agente_societa_nome ?? '',
      agente_societa_reg:       c.agente_societa_reg ?? '',
      numero_modulo:            c.numero_modulo ?? '',
    })
    setDrawerOpen(true)
  }

  /* ── Save ──────────────────────────────────────────────────────── */

  async function save() {
    if (!form.cognome_tesserato || !form.nome_tesserato || !form.data_inizio || !form.data_scadenza) {
      setToast({ msg: 'Compila i campi obbligatori (tesserato, date)', tipo: 'error' })
      return
    }
    setSaving(true)
    try {
      const body = {
        tesserato_id:             form.tesserato_id || null,
        nome_tesserato:           form.nome_tesserato,
        cognome_tesserato:        form.cognome_tesserato,
        tipo_lavoratore:          form.tipo_lavoratore,
        retribuzione_lorda_annua: form.retribuzione_lorda_annua ? Number(form.retribuzione_lorda_annua) : null,
        data_inizio:              form.data_inizio,
        data_scadenza:            form.data_scadenza,
        durata_anni:              form.durata_anni ? Number(form.durata_anni) : null,
        clausola_rescissoria:     form.clausola_rescissoria ? Number(form.clausola_rescissoria) : null,
        premi:                    form.premi.map(p => ({ tipo: p.tipo, importo: Number(p.importo) || 0, condizione: p.condizione })),
        stato_deposito:           form.stato_deposito,
        lega_ref:                 form.lega_ref || null,
        note:                     form.note || null,
        rappresentante_legale:    form.rappresentante_legale || null,
        qualifica_rappresentante: form.qualifica_rappresentante || null,
        cf_tesserato:             form.cf_tesserato || null,
        data_nascita_tesserato:   form.data_nascita_tesserato || null,
        luogo_nascita_tesserato:  form.luogo_nascita_tesserato || null,
        domicilio_tesserato:      form.domicilio_tesserato || null,
        matricola_tesserato:      form.matricola_tesserato || null,
        agente_calciatore_nome:   form.agente_calciatore_nome || null,
        agente_calciatore_reg:    form.agente_calciatore_reg || null,
        agente_societa_nome:      form.agente_societa_nome || null,
        agente_societa_reg:       form.agente_societa_reg || null,
        numero_modulo:            form.numero_modulo || null,
      }
      const url = editId ? `/api/contratti-pro/${editId}` : '/api/contratti-pro'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Errore')
      setToast({ msg: editId ? 'Contratto aggiornato' : 'Contratto creato', tipo: 'success' })
      setDrawerOpen(false)
      loadContratti()
    } catch (err: any) {
      setToast({ msg: err.message, tipo: 'error' })
    } finally {
      setSaving(false)
    }
  }

  /* ── Delete ─────────────────────────────────────────────────────── */

  async function elimina(id: string) {
    if (!confirm('Eliminare questo contratto?')) return
    const res = await fetch(`/api/contratti-pro/${id}`, { method: 'DELETE' })
    if (res.ok) { setToast({ msg: 'Contratto eliminato', tipo: 'success' }); loadContratti() }
    else setToast({ msg: 'Errore eliminazione', tipo: 'error' })
  }

  /* ── Render ──────────────────────────────────────────────────────── */

  const oggi = new Date()
  const scaduti = contratti.filter(c => c.data_scadenza && new Date(c.data_scadenza) < oggi)

  return (
    <>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      <PageHeader
        title="Contratti Professionisti"
        subtitle="Gestione contratti calciatori e collaboratori tecnici"
        actions={
          <button
            onClick={openNuovo}
            style={{ padding: '8px 18px', background: 'var(--accent)', border: 'none', color: 'var(--black)', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Nuovo contratto
          </button>
        }
      />

      {/* Riepilogo */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Totale', v: contratti.length },
          { label: 'Depositati', v: contratti.filter(c => c.stato_deposito === 'depositato').length },
          { label: 'Da depositare', v: contratti.filter(c => c.stato_deposito === 'da_depositare').length },
          { label: 'Scaduti', v: scaduti.length },
        ].map(({ label, v }) => (
          <div key={label} style={{ flex: 1, padding: '14px 18px', background: 'var(--grigio-7)', border: '1px solid var(--grigio-5)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grigio-3)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--white)' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Lista */}
      {contratti.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--grigio-3)', fontFamily: 'var(--font-display)', fontSize: 13 }}>
          Nessun contratto professionista registrato
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--grigio-5)' }}>
              {['Tesserato', 'Tipo', 'Retribuzione lorda', 'Scadenza', 'Stato', ''].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--font-display)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grigio-3)', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contratti.map(c => {
              const isScaduto = c.data_scadenza && new Date(c.data_scadenza) < oggi
              const statoEffettivo = isScaduto && c.stato_deposito !== 'depositato' ? 'scaduto' : c.stato_deposito
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--grigio-6)', opacity: isScaduto ? 0.7 : 1 }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--white)' }}>
                    {c.cognome_tesserato} {c.nome_tesserato}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--grigio-2)', fontSize: 12 }}>
                    {c.tipo_lavoratore === 'calciatore_professionista' ? 'Calciatore Prof.' : 'Collab. Tecnico'}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                    {c.retribuzione_lorda_annua
                      ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(c.retribuzione_lorda_annua)
                      : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: isScaduto ? '#f66' : 'var(--grigio-2)' }}>
                    {formatData(c.data_scadenza)}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <BadgeStato stato={statoEffettivo} />
                  </td>
                  <td style={{ padding: '10px 12px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/contratti-pro/${c.id}/pdf`)
                          if (!res.ok) { const txt = await res.text(); setToast({ msg: `Errore PDF (${res.status}): ${txt.slice(0,120)}`, tipo: 'error' }); return }
                          const blob = await res.blob()
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `contratto_${c.cognome_tesserato}_${c.data_scadenza}.pdf`
                          a.click()
                          URL.revokeObjectURL(url)
                        } catch { setToast({ msg: 'Errore generazione PDF', tipo: 'error' }) }
                      }}
                      title="Genera PDF"
                      style={{ padding: '4px 10px', background: 'rgba(200,240,0,0.08)', border: '1px solid rgba(200,240,0,0.2)', color: 'var(--accent)', cursor: 'pointer', fontSize: 11 }}
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => openEdit(c)}
                      style={{ padding: '4px 10px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)', cursor: 'pointer', fontSize: 11 }}
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => elimina(c.id)}
                      style={{ padding: '4px 10px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#f66', cursor: 'pointer', fontSize: 11 }}
                    >
                      Elimina
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Drawer form */}
      <Drawer
        open={drawerOpen}
        title={editId ? 'Modifica contratto' : 'Nuovo contratto professionista'}
        onClose={() => setDrawerOpen(false)}
      >
        <FormSection title="Tesserato">
          <FormGrid cols={1}>
            <FormField label="Seleziona dalla rosa">
              <select
                value={form.tesserato_id}
                onChange={e => selectPersona(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }}
              >
                <option value="">— seleziona giocatore —</option>
                {persone.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </FormField>
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label="Cognome *">
              <input value={form.cognome_tesserato} onChange={e => setF('cognome_tesserato', e.target.value)} placeholder="Cognome" style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
            <FormField label="Nome *">
              <input value={form.nome_tesserato} onChange={e => setF('nome_tesserato', e.target.value)} placeholder="Nome" style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
          </FormGrid>
          <FormGrid cols={1}>
            <FormField label="Tipo lavoratore">
              <select value={form.tipo_lavoratore} onChange={e => setF('tipo_lavoratore', e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }}>
                {TIPI_LAVORATORE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="Dati anagrafici ufficiali tesserato">
          <FormGrid cols={2}>
            <FormField label="Codice fiscale">
              <input value={form.cf_tesserato} onChange={e => setF('cf_tesserato', e.target.value)} placeholder="RSSMRC80A01H501U" style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
            <FormField label="Matricola FIGC">
              <input value={form.matricola_tesserato} onChange={e => setF('matricola_tesserato', e.target.value)} placeholder="Matricola federale" style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label="Data di nascita">
              <input value={form.data_nascita_tesserato} onChange={e => setF('data_nascita_tesserato', e.target.value)} placeholder="gg/mm/aaaa" style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
            <FormField label="Luogo di nascita">
              <input value={form.luogo_nascita_tesserato} onChange={e => setF('luogo_nascita_tesserato', e.target.value)} placeholder="Città (Provincia)" style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
          </FormGrid>
          <FormGrid cols={1}>
            <FormField label="Domicilio">
              <input value={form.domicilio_tesserato} onChange={e => setF('domicilio_tesserato', e.target.value)} placeholder="Via, n° — Città (Provincia) CAP" style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="Rappresentante legale Società">
          <FormGrid cols={2}>
            <FormField label="Nome rappresentante legale">
              <input value={form.rappresentante_legale} onChange={e => setF('rappresentante_legale', e.target.value)} placeholder="Cognome e nome" style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
            <FormField label="Qualifica">
              <input value={form.qualifica_rappresentante} onChange={e => setF('qualifica_rappresentante', e.target.value)} placeholder="es. Presidente / Amministratore Delegato" style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="Agente / Procuratore sportivo">
          <div style={{ marginBottom: 10, fontSize: 11, color: 'var(--grigio-3)' }}>Lascia vuoto se nessuna delle parti si è avvalsa di un agente.</div>
          <FormGrid cols={2}>
            <FormField label="Agente del calciatore (nome)">
              <input value={form.agente_calciatore_nome} onChange={e => setF('agente_calciatore_nome', e.target.value)} placeholder="Cognome e nome agente" style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
            <FormField label="N. registro nazionale agente calciatore">
              <input value={form.agente_calciatore_reg} onChange={e => setF('agente_calciatore_reg', e.target.value)} placeholder="es. 12345" style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label="Agente della Società (nome)">
              <input value={form.agente_societa_nome} onChange={e => setF('agente_societa_nome', e.target.value)} placeholder="Cognome e nome agente" style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
            <FormField label="N. registro nazionale agente Società">
              <input value={form.agente_societa_reg} onChange={e => setF('agente_societa_reg', e.target.value)} placeholder="es. 12345" style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
          </FormGrid>
          <FormGrid cols={1}>
            <FormField label="Numero modulo (Serie B)">
              <input value={form.numero_modulo} onChange={e => setF('numero_modulo', e.target.value)} placeholder="Solo per Serie B — numero progressivo modulo" style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="Termini economici">
          <FormGrid cols={2}>
            <FormField label="Retribuzione lorda annua (€)">
              <input type="number" value={form.retribuzione_lorda_annua} onChange={e => setF('retribuzione_lorda_annua', e.target.value)} placeholder="es. 30000" style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
            <FormField label="Clausola rescissoria (€, opzionale)">
              <input type="number" value={form.clausola_rescissoria} onChange={e => setF('clausola_rescissoria', e.target.value)} placeholder="es. 500000" style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="Premi di rendimento">
          <div style={{ marginBottom: 8, fontSize: 11, color: 'var(--grigio-3)' }}>
            Aggiungi premi legati a obiettivi di rendimento
          </div>
          {form.premi.map((p, i) => (
            <PremioRow key={i} premio={p} idx={i} onChange={updatePremio} onRemove={removePremio} />
          ))}
          <button
            type="button"
            onClick={addPremio}
            style={{ padding: '6px 14px', background: 'rgba(200,240,0,0.06)', border: '1px solid rgba(200,240,0,0.2)', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, marginTop: 4 }}
          >
            + Aggiungi premio
          </button>
        </FormSection>

        <FormSection title="Durata contrattuale">
          <FormGrid cols={3}>
            <FormField label="Data inizio *">
              <input type="date" value={form.data_inizio} onChange={e => setF('data_inizio', e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
            <FormField label="Data scadenza *">
              <input type="date" value={form.data_scadenza} onChange={e => setF('data_scadenza', e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
            <FormField label="Durata (anni)">
              <input type="number" value={form.durata_anni} onChange={e => setF('durata_anni', e.target.value)} placeholder="es. 2" style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="Deposito Lega Pro">
          <FormGrid cols={2}>
            <FormField label="Stato deposito">
              <select value={form.stato_deposito} onChange={e => setF('stato_deposito', e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }}>
                {STATI_DEPOSITO.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </FormField>
            <FormField label="Riferimento deposito Lega">
              <input value={form.lega_ref} onChange={e => setF('lega_ref', e.target.value)} placeholder="N° protocollo Lega Pro" style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)' }} />
            </FormField>
          </FormGrid>
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(200,240,0,0.04)', border: '1px solid rgba(200,240,0,0.12)', fontSize: 11, color: 'var(--grigio-3)', lineHeight: 1.5 }}>
            Il deposito avviene manualmente sul portale ufficiale Lega Pro. Genera il PDF da consegnare al tesserato, poi deposita sul portale.
          </div>
        </FormSection>

        <FormSection title="Note">
          <textarea
            value={form.note}
            onChange={e => setF('note', e.target.value)}
            placeholder="Note libere sul contratto..."
            rows={4}
            style={{ width: '100%', padding: '8px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </FormSection>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button onClick={() => setDrawerOpen(false)} style={{ padding: '8px 20px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)', cursor: 'pointer' }}>
            Annulla
          </button>
          <button onClick={save} disabled={saving} style={{ padding: '8px 20px', background: 'var(--accent)', border: 'none', color: 'var(--black)', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </Drawer>
    </>
  )
}
