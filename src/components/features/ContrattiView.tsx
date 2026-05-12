'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatData, giorniAlla, ruoloShort, formatEuro } from '@/lib/helpers'
import { PageHeader, FormSection, FormGrid, FormField, Drawer, Toast } from '@/components/ui'

/* ─── Props ──────────────────────────────────────────────────────── */

export type Props = { clubId: string; ruolo: string }

/* ─── Costanti ───────────────────────────────────────────────────── */

const TIPI_CONTRATTO = [
  { value: 'rimborso_spese',   label: 'Rimborso spese' },
  { value: 'collaborazione',   label: 'Collaborazione' },
  { value: 'dipendente',       label: 'Dipendente' },
  { value: 'professionistico', label: 'Professionistico' },
]
const STATI_CONTRATTO = [
  { value: 'in_bozza', label: 'In bozza' },
  { value: 'attivo',   label: 'Attivo' },
  { value: 'scaduto',  label: 'Scaduto' },
  { value: 'rescisso', label: 'Rescisso' },
]
const RUOLI_VISIBILITA = [
  { key: 'ds',          label: 'DS' },
  { key: 'presidente',  label: 'Presidente' },
  { key: 'segretario',  label: 'Segretario' },
  { key: 'allenatore',  label: 'Allenatore' },
]
const REPARTI: { label: string; ruoli: string[] }[] = [
  { label: 'Portieri',      ruoli: ['portiere'] },
  { label: 'Difensori',     ruoli: ['difensore_centrale', 'terzino'] },
  { label: 'Centrocampisti',ruoli: ['centrocampista_difensivo', 'centrocampista', 'trequartista'] },
  { label: 'Attaccanti',    ruoli: ['ala', 'seconda_punta', 'centravanti'] },
]

/* ─── Tipi interni ───────────────────────────────────────────────── */

interface FormState {
  personaId: string         // 'g:uuid' | 's:uuid' | ''
  tipo: string
  stato: string
  data_inizio: string
  data_scadenza: string
  firmato_da: string
  data_firma: string
  importo_mensile: string
  importo_annuo: string
  bonus_firma: string
  bonus_gol: string
  bonus_presenze: string
  clausola_rescissione: string
  note_private: string
  visibile_ruoli: string[]
}

interface PersonaOption { value: string; label: string }

const FORM_INIT: FormState = {
  personaId: '', tipo: 'rimborso_spese', stato: 'attivo',
  data_inizio: '', data_scadenza: '',
  firmato_da: '', data_firma: '',
  importo_mensile: '', importo_annuo: '',
  bonus_firma: '', bonus_gol: '', bonus_presenze: '',
  clausola_rescissione: '',
  note_private: '',
  visibile_ruoli: ['ds', 'presidente', 'segretario'],
}

function n(s: string) { return parseFloat(s) || 0 }

function contrattoToForm(c: any): FormState {
  return {
    personaId: c.giocatore_id ? `g:${c.giocatore_id}` : c.staff_id ? `s:${c.staff_id}` : '',
    tipo: c.tipo ?? 'rimborso_spese',
    stato: c.stato ?? 'attivo',
    data_inizio: c.data_inizio ?? '',
    data_scadenza: c.data_scadenza ?? '',
    firmato_da: c.firmato_da ?? '',
    data_firma: c.data_firma ?? '',
    importo_mensile: String(c.importo_mensile ?? c.ingaggio_mensile ?? ''),
    importo_annuo: String(c.importo_annuo ?? ''),
    bonus_firma: String(c.bonus_firma ?? ''),
    bonus_gol: String(c.bonus_gol ?? ''),
    bonus_presenze: String(c.bonus_presenze ?? ''),
    clausola_rescissione: String(c.clausola_rescissione ?? ''),
    note_private: c.note_private ?? '',
    visibile_ruoli: c.visibile_ruoli ?? ['ds', 'presidente', 'segretario'],
  }
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function RepartoBar({ label, valore, max }: { label: string; valore: number; max: number }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { setTimeout(() => setAnimated(true), 80) }, [])
  const pct = max > 0 ? (valore / max) * 100 : 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
        <span style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grigio-2)', fontWeight: 600 }}>
          {label}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--grigio-3)' }}>
          {formatEuro(valore)}<span style={{ color: 'var(--grigio-4)' }}>/mese</span>
        </span>
      </div>
      <div style={{ height: 7, background: 'var(--grigio-5)' }}>
        <div style={{
          height: '100%',
          width: animated ? `${Math.min(100, pct)}%` : '0%',
          background: 'var(--accent)',
          transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  )
}

function CostoRiepilogo({ form }: { form: FormState }) {
  const mensile  = n(form.importo_mensile)
  const annuo    = n(form.importo_annuo) || mensile * 10
  const bonusFirma = n(form.bonus_firma)
  const totStimato = annuo + bonusFirma
  if (mensile === 0 && annuo === 0) return null
  return (
    <div style={{
      background: 'rgba(200,240,0,0.06)',
      border: '1px solid rgba(200,240,0,0.2)',
      padding: '16px 20px',
      marginBottom: 24,
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: 12, fontWeight: 700 }}>
        Riepilogo costo stimato
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {[
          { l: 'Costo mensile', v: formatEuro(mensile) },
          { l: 'Costo stagionale (10 mesi)', v: formatEuro(annuo) },
          { l: 'Con bonus firma', v: formatEuro(totStimato) },
        ].map(r => (
          <div key={r.l}>
            <div style={{ fontSize: 10, color: 'var(--grigio-4)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{r.l}</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--white)' }}>{r.v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Componente principale ──────────────────────────────────────── */

export default function ContrattiView({ clubId, ruolo }: Props) {
  const supabase = createClient()

  const [contratti, setContratti]           = useState<any[]>([])
  const [personaOptions, setPersonaOptions] = useState<PersonaOption[]>([])
  const [drawerOpen, setDrawerOpen]         = useState(false)
  const [editId, setEditId]                 = useState<string | null>(null)
  const [form, setForm]                     = useState<FormState>(FORM_INIT)
  const [saving, setSaving]                 = useState(false)
  const [toast, setToast]                   = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  /* ── Load ──────────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    const [{ data: rawContratti }, { data: tesseramenti }, { data: staffList }] = await Promise.all([
      supabase
        .from('contratti')
        .select('*, giocatori(id, nome, cognome, ruolo_principale, data_nascita), staff:utenti!contratti_staff_id_fkey(id, nome, cognome, ruolo)')
        .eq('club_id', clubId)
        .order('data_scadenza'),
      supabase
        .from('tesseramenti')
        .select('giocatori(id, nome, cognome, ruolo_principale)')
        .eq('club_id', clubId)
        .eq('stato', 'attivo'),
      supabase
        .from('utenti')
        .select('id, nome, cognome, ruolo')
        .eq('club_id', clubId)
        .in('ruolo', ['ds', 'allenatore', 'team_manager', 'medico', 'fisioterapista', 'preparatore', 'segretario']),
    ])

    const giocatori = (tesseramenti ?? [])
      .map((t: any) => t.giocatori)
      .filter(Boolean)
      .sort((a: any, b: any) => a.cognome.localeCompare(b.cognome))

    // Filtra per visibilità ruolo
    const visibili = (rawContratti ?? []).filter(c => {
      const vr: string[] = c.visibile_ruoli ?? ['ds', 'presidente', 'segretario']
      return vr.includes(ruolo) || ruolo === 'presidente'
    })
    setContratti(visibili)

    const opts: PersonaOption[] = [
      ...(giocatori ?? []).map(g => ({
        value: `g:${g.id}`,
        label: `⚽ ${g.cognome} ${g.nome}${g.ruolo_principale ? ` (${ruoloShort[g.ruolo_principale] ?? g.ruolo_principale})` : ''}`,
      })),
      ...(staffList ?? []).map(s => ({
        value: `s:${s.id}`,
        label: `👔 ${s.cognome} ${s.nome} — ${s.ruolo}`,
      })),
    ]
    setPersonaOptions(opts)
  }, [clubId, ruolo])

  useEffect(() => { load() }, [load])

  /* ── Form helpers ──────────────────────────────────────────────── */

  function setF<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      // Auto-calcola importo_annuo da mensile
      if (k === 'importo_mensile') {
        const m = parseFloat(v as string) || 0
        if (!prev.importo_annuo || prev.importo_annuo === String((parseFloat(prev.importo_mensile) || 0) * 10)) {
          next.importo_annuo = m > 0 ? String(m * 10) : ''
        }
      }
      return next
    })
  }

  function toggleVisibilita(key: string) {
    setForm(prev => ({
      ...prev,
      visibile_ruoli: prev.visibile_ruoli.includes(key)
        ? prev.visibile_ruoli.filter(r => r !== key)
        : [...prev.visibile_ruoli, key],
    }))
  }

  function openCreate() {
    setEditId(null)
    setForm(FORM_INIT)
    setDrawerOpen(true)
  }

  function openEdit(c: any) {
    setEditId(c.id)
    setForm(contrattoToForm(c))
    setDrawerOpen(true)
  }

  /* ── Save ──────────────────────────────────────────────────────── */

  async function salva() {
    if (!form.data_inizio || !form.data_scadenza) {
      setToast({ msg: 'Date obbligatorie', tipo: 'error' }); return
    }
    setSaving(true)

    const isGiocatore = form.personaId.startsWith('g:')
    const personaUuid = form.personaId.slice(2) || null
    const payload: Record<string, any> = {
      club_id: clubId,
      giocatore_id: isGiocatore ? personaUuid : null,
      staff_id: !isGiocatore && personaUuid ? personaUuid : null,
      tipo: form.tipo,
      stato: form.stato,
      data_inizio: form.data_inizio,
      data_scadenza: form.data_scadenza,
      firmato_da: form.firmato_da || null,
      data_firma: form.data_firma || null,
      importo_mensile: n(form.importo_mensile) || null,
      importo_annuo: n(form.importo_annuo) || null,
      ingaggio_mensile: n(form.importo_mensile) || null,   // compat
      bonus_firma: n(form.bonus_firma) || null,
      bonus_gol: n(form.bonus_gol) || null,
      bonus_presenze: n(form.bonus_presenze) || null,
      clausola_rescissione: n(form.clausola_rescissione) || null,
      note_private: form.note_private || null,
      visibile_ruoli: form.visibile_ruoli,
    }

    const { error } = editId
      ? await supabase.from('contratti').update(payload).eq('id', editId)
      : await supabase.from('contratti').insert(payload)

    setSaving(false)
    if (error) { setToast({ msg: `Errore: ${error.message}`, tipo: 'error' }); return }
    setToast({ msg: editId ? 'Contratto aggiornato' : 'Contratto creato', tipo: 'success' })
    setDrawerOpen(false)
    await load()
  }

  /* ── Calcoli KPI ───────────────────────────────────────────────── */

  const attivi    = contratti.filter(c => (c.stato ?? 'attivo') === 'attivo')
  const costo     = (c: any) => Number(c.importo_mensile ?? c.ingaggio_mensile ?? 0)
  const mensileTot = attivi.reduce((s, c) => s + costo(c), 0)
  const annuoTot   = attivi.reduce((s, c) => s + Number(c.importo_annuo ?? costo(c) * 10), 0)
  const inScad60   = attivi.filter(c => {
    const gg = giorniAlla(c.data_scadenza)
    return gg >= 0 && gg <= 60
  }).length

  /* ── Ingaggi per reparto ───────────────────────────────────────── */

  const repartoData = REPARTI.map(r => ({
    label: r.label,
    valore: attivi
      .filter(c => r.ruoli.includes(c.giocatori?.ruolo_principale))
      .reduce((s, c) => s + costo(c), 0),
  })).filter(r => r.valore > 0)
  const staffValore = attivi.filter(c => !c.giocatore_id).reduce((s, c) => s + costo(c), 0)
  if (staffValore > 0) repartoData.push({ label: 'Staff', valore: staffValore })
  const maxReparto = Math.max(...repartoData.map(r => r.valore), 1)

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <PageHeader
        title="Contratti"
        subtitle="Gestione contratti giocatori e staff"
        actions={
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            + Aggiungi contratto
          </button>
        }
      />

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Contratti attivi</div>
          <div className="stat-value">{attivi.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ingaggio mensile tot.</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{formatEuro(mensileTot)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ingaggio annuo tot.</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{formatEuro(annuoTot)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In scadenza 60gg</div>
          <div className="stat-value" style={{ color: inScad60 > 0 ? 'var(--ambra)' : undefined }}>
            {inScad60}
          </div>
        </div>
      </div>

      {inScad60 > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          ⚠ {inScad60} contrat{inScad60 === 1 ? 'to' : 'ti'} in scadenza entro 60 giorni — pianifica i rinnovi.
        </div>
      )}

      {/* Ingaggi per reparto */}
      {repartoData.length > 0 && (
        <div className="card" style={{ padding: '18px 20px', marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grigio-3)', marginBottom: 16 }}>
            Distribuzione ingaggi mensili per reparto
          </div>
          {repartoData.map(r => (
            <RepartoBar key={r.label} label={r.label} valore={r.valore} max={maxReparto} />
          ))}
        </div>
      )}

      {/* Tabella */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Persona</th>
                <th>Tipo</th>
                <th>Stato</th>
                <th>Inizio</th>
                <th>Scadenza</th>
                <th>Gg rimanenti</th>
                <th>Mensile</th>
                <th>Annuo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contratti.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '60px', color: 'var(--grigio-4)', fontSize: 13 }}>
                    Nessun contratto registrato
                  </td>
                </tr>
              ) : contratti.map(c => {
                const g = c.giocatori as any
                const s = c.staff as any
                const nomePersona = g
                  ? `${g.cognome} ${g.nome}`
                  : s ? `${s.cognome} ${s.nome}` : '—'
                const ruoloPersona = g?.ruolo_principale
                  ? ruoloShort[g.ruolo_principale] ?? g.ruolo_principale
                  : s?.ruolo ?? null
                const gg = giorniAlla(c.data_scadenza)
                const stato = c.stato ?? (gg >= 0 ? 'attivo' : 'scaduto')
                const importoMensile = Number(c.importo_mensile ?? c.ingaggio_mensile ?? 0)
                const importoAnnuo   = Number(c.importo_annuo ?? importoMensile * 10)
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{nomePersona}</div>
                      {ruoloPersona && (
                        <span className="badge badge-grigio" style={{ fontSize: 10, marginTop: 2 }}>
                          {ruoloPersona}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-grigio" style={{ fontSize: 10 }}>
                        {TIPI_CONTRATTO.find(t => t.value === c.tipo)?.label ?? c.tipo ?? '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${stato === 'attivo' ? 'verde' : stato === 'in_bozza' ? 'ambra' : 'rosso'}`} style={{ fontSize: 10 }}>
                        {STATI_CONTRATTO.find(s => s.value === stato)?.label ?? stato}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatData(c.data_inizio)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatData(c.data_scadenza)}</td>
                    <td>
                      {stato === 'scaduto' || gg < 0
                        ? <span className="badge badge-rosso">Scaduto</span>
                        : gg <= 30
                          ? <span className="badge badge-rosso">{gg}gg</span>
                          : gg <= 60
                            ? <span className="badge badge-ambra">{gg}gg</span>
                            : <span className="badge badge-verde">{gg}gg</span>
                      }
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                      {importoMensile > 0 ? formatEuro(importoMensile) : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--grigio-3)' }}>
                      {importoAnnuo > 0 ? formatEuro(importoAnnuo) : '—'}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 11 }}
                        onClick={() => openEdit(c)}
                      >
                        Modifica
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Drawer form ──────────────────────────────────────────── */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editId ? 'Modifica contratto' : 'Nuovo contratto'}
        width={720}
      >
        {/* Sezione persona */}
        <FormSection title="Giocatore / Staff">
          <FormField label="Persona" required>
            <select
              className="input"
              style={{ width: '100%' }}
              value={form.personaId}
              onChange={e => setF('personaId', e.target.value)}
            >
              <option value="">— Seleziona giocatore o staff —</option>
              {personaOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>
        </FormSection>

        {/* Tipo e durata */}
        <FormSection title="Tipo e durata">
          <FormGrid cols={2}>
            <FormField label="Tipo contratto">
              <select
                className="input"
                style={{ width: '100%' }}
                value={form.tipo}
                onChange={e => setF('tipo', e.target.value)}
              >
                {TIPI_CONTRATTO.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Stato">
              <select
                className="input"
                style={{ width: '100%' }}
                value={form.stato}
                onChange={e => setF('stato', e.target.value)}
              >
                {STATI_CONTRATTO.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </FormField>
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label="Data inizio" required>
              <input
                className="input"
                type="date"
                style={{ width: '100%' }}
                value={form.data_inizio}
                onChange={e => setF('data_inizio', e.target.value)}
              />
            </FormField>
            <FormField label="Data fine" required>
              <input
                className="input"
                type="date"
                style={{ width: '100%' }}
                value={form.data_scadenza}
                onChange={e => setF('data_scadenza', e.target.value)}
              />
            </FormField>
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label="Firmato da">
              <input
                className="input"
                style={{ width: '100%' }}
                value={form.firmato_da}
                onChange={e => setF('firmato_da', e.target.value)}
                placeholder="Es. Presidente Mario Rossi"
              />
            </FormField>
            <FormField label="Data firma">
              <input
                className="input"
                type="date"
                style={{ width: '100%' }}
                value={form.data_firma}
                onChange={e => setF('data_firma', e.target.value)}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        {/* Compensi */}
        <FormSection title="Compensi">
          <FormGrid cols={3}>
            <FormField label="Importo mensile (€)">
              <input
                className="input"
                type="number"
                min={0}
                style={{ width: '100%' }}
                value={form.importo_mensile}
                onChange={e => setF('importo_mensile', e.target.value)}
                placeholder="0"
              />
            </FormField>
            <FormField label="Importo annuo (€)" hint="Auto: mensile × 10">
              <input
                className="input"
                type="number"
                min={0}
                style={{ width: '100%' }}
                value={form.importo_annuo}
                onChange={e => setF('importo_annuo', e.target.value)}
                placeholder="0"
              />
            </FormField>
            <FormField label="Bonus firma (€)">
              <input
                className="input"
                type="number"
                min={0}
                style={{ width: '100%' }}
                value={form.bonus_firma}
                onChange={e => setF('bonus_firma', e.target.value)}
                placeholder="0"
              />
            </FormField>
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label="Bonus gol (€/gol)">
              <input
                className="input"
                type="number"
                min={0}
                style={{ width: '100%' }}
                value={form.bonus_gol}
                onChange={e => setF('bonus_gol', e.target.value)}
                placeholder="0"
              />
            </FormField>
            <FormField label="Bonus presenze (€/10 presenze)">
              <input
                className="input"
                type="number"
                min={0}
                style={{ width: '100%' }}
                value={form.bonus_presenze}
                onChange={e => setF('bonus_presenze', e.target.value)}
                placeholder="0"
              />
            </FormField>
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label="Clausola rescissione (€)">
              <input
                className="input"
                type="number"
                min={0}
                style={{ width: '100%' }}
                value={form.clausola_rescissione}
                onChange={e => setF('clausola_rescissione', e.target.value)}
                placeholder="0"
              />
            </FormField>
          </FormGrid>
        </FormSection>

        {/* Riepilogo costo stimato */}
        <CostoRiepilogo form={form} />

        {/* Note e visibilità */}
        <FormSection title="Note e visibilità">
          <FormField label="Note private" hint="Visibili solo ai ruoli autorizzati">
            <textarea
              className="input"
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
              value={form.note_private}
              onChange={e => setF('note_private', e.target.value)}
            />
          </FormField>
          <FormField label="Visibile ai ruoli">
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const, marginTop: 4 }}>
              {RUOLI_VISIBILITA.map(r => (
                <label key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={form.visibile_ruoli.includes(r.key)}
                    onChange={() => toggleVisibilita(r.key)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span style={{ color: 'var(--grigio-2)' }}>{r.label}</span>
                </label>
              ))}
            </div>
          </FormField>
        </FormSection>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
          <button
            className="btn btn-primary"
            onClick={salva}
            disabled={saving || !form.data_inizio || !form.data_scadenza}
          >
            {saving ? 'Salvo…' : editId ? 'Aggiorna contratto' : 'Crea contratto'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setDrawerOpen(false)}>
            Annulla
          </button>
        </div>
      </Drawer>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
