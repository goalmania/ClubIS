'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Drawer, FormField, FormGrid, FormSection, Toast } from '@/components/ui'
import { useRouter } from 'next/navigation'

type MedioTrasporto = 'pullman' | 'treno' | 'aereo' | 'auto_propria' | 'altro'

type PlayerOption = { id: string; nome: string; cognome: string }
type StaffOption = { id: string; nome: string; cognome: string; ruolo: string }
type TeamManagerOption = { id: string; nome: string; cognome: string }
type PartitaOption = { id: string; competizione?: string | null; avversario: string; data_ora: string; casa_trasferta: string }

const MAX_ALLEGATI = 10
const CIS_ALLEGATI_BUCKET = 'cis-eventi-allegati'
const ALLOWED_FILE_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png'])

const COSTI_JSON_START = '__COSTI_TRASFERTE_JSON_START__'
const COSTI_JSON_END = '__COSTI_TRASFERTE_JSON_END__'

function parseNumberOrNull(v: string) {
  if (!v) return null
  const n = Number(v)
  if (Number.isNaN(n)) return null
  return n
}

function wrapCostiJsonBlock(costsObj: any, userNote: string) {
  const jsonBlock = `${COSTI_JSON_START}${JSON.stringify(costsObj)}${COSTI_JSON_END}`
  const note = userNote?.trim() ? `\n\n${userNote.trim()}` : ''
  return `${jsonBlock}${note}`
}

export default function TrasferteCreateDrawer() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [saving, setSaving] = useState(false)

  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' | 'info' } | null>(null)

  const [partite, setPartite] = useState<PartitaOption[]>([])
  const [giocatori, setGiocatori] = useState<PlayerOption[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [teamManagers, setTeamManagers] = useState<TeamManagerOption[]>([])

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  const [newFiles, setNewFiles] = useState<File[]>([])

  const [form, setForm] = useState({
    partita_id: '' as string,
    destinazione: '',
    data_partenza: today,
    data_rientro: today,
    mezzo: 'pullman' as MedioTrasporto,
    fornitore: '',
    costo_trasporto_stimato: null as number | null,
    costo_trasporto_reale: null as number | null,

    hotel: '',
    costo_alloggio_stimato: null as number | null,
    costo_alloggio_reale: null as number | null,

    numero_pasti_inclusi: null as number | null,
    costo_pasti_stimato: null as number | null,
    costo_pasti_reale: null as number | null,

    partecipanti: {
      giocatori: [] as string[],
      staff: [] as string[],
      team_manager: [] as string[],
    },

    note_libere: '',
  })

  const numeroNotti = useMemo(() => {
    if (!form.data_partenza || !form.data_rientro) return 0
    const d1 = new Date(`${form.data_partenza}T00:00:00`).getTime()
    const d2 = new Date(`${form.data_rientro}T00:00:00`).getTime()
    const diffDays = Math.round((d2 - d1) / 86400000)
    return diffDays > 0 ? diffDays : 0
  }, [form.data_partenza, form.data_rientro])

  const selectedPartita = useMemo(() => {
    if (!form.partita_id) return null
    return partite.find(p => p.id === form.partita_id) ?? null
  }, [form.partita_id, partite])

  const toggleParticipant = (group: 'giocatori' | 'staff' | 'team_manager', id: string) => {
    setForm(prev => {
      const arr = prev.partecipanti[group]
      const next = arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]
      return { ...prev, partecipanti: { ...prev.partecipanti, [group]: next } }
    })
  }

  const resetForm = () => {
    setForm({
      partita_id: '',
      destinazione: '',
      data_partenza: today,
      data_rientro: today,
      mezzo: 'pullman',
      fornitore: '',
      costo_trasporto_stimato: null,
      costo_trasporto_reale: null,
      hotel: '',
      costo_alloggio_stimato: null,
      costo_alloggio_reale: null,
      numero_pasti_inclusi: null,
      costo_pasti_stimato: null,
      costo_pasti_reale: null,
      partecipanti: {
        giocatori: [],
        staff: [],
        team_manager: [],
      },
      note_libere: '',
    })
    setNewFiles([])
  }

  const loadContextAndOptions = async () => {
    if (loadingOptions) return
    setLoadingOptions(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUserId(user.id)

      const { data: utente, error: utenteError } = await supabase
        .from('utenti')
        .select('club_id')
        .eq('id', user.id)
        .single()

      if (utenteError || !utente?.club_id) return
      const clubId = utente.club_id

      // Competizione/evento: derivo dalla tabella `partite`
      const { data: partiteData, error: partErr } = await supabase
        .from('partite')
        .select('id, competizione, avversario, data_ora, casa_trasferta')
        .eq('club_id', clubId)
        .order('data_ora', { ascending: true })
        .limit(50)

      if (!partErr && partiteData) {
        setPartite(partiteData as any[])
      } else {
        setPartite([])
      }

      // Staff (escludo team_manager) + Team manager
      const staffRoles = ['presidente', 'ds', 'segretario', 'allenatore', 'osservatore', 'medico', 'team_manager']
      const { data: utentiData, error: utentiErr } = await supabase
        .from('utenti')
        .select('id, nome, cognome, ruolo, attivo')
        .eq('club_id', clubId)
        .in('ruolo', staffRoles)

      if (!utentiErr && utentiData) {
        const filtered = (utentiData as any[]).filter(x => x.attivo ?? true)
        const staffOnly = filtered.filter(x => x.ruolo !== 'team_manager')
        const tmOnly = filtered.filter(x => x.ruolo === 'team_manager')

        setStaff(
          staffOnly.map(x => ({ id: x.id, nome: x.nome, cognome: x.cognome, ruolo: x.ruolo })),
        )
        setTeamManagers(tmOnly.map(x => ({ id: x.id, nome: x.nome, cognome: x.cognome })))

        // Default team manager coerente con le opzioni disponibili
        const tmDefault =
          tmOnly.some(x => x.id === user.id) ? [user.id] : (tmOnly[0] ? [tmOnly[0].id] : [])
        setForm(prev => ({ ...prev, partecipanti: { ...prev.partecipanti, team_manager: tmDefault } }))
      } else {
        setStaff([])
        setTeamManagers([])
      }

      // Giocatori: via tesseramenti
      const { data: tess, error: tErr } = await supabase
        .from('tesseramenti')
        .select('giocatore_id')
        .eq('club_id', clubId)
        .eq('stato', 'attivo')

      if (!tErr && tess) {
        const ids = Array.from(new Set((tess as any[]).map(t => t.giocatore_id).filter(Boolean)))
        if (ids.length > 0) {
          const { data: pData, error: pErr } = await supabase
            .from('giocatori')
            .select('id, nome, cognome')
            .in('id', ids)
            .order('cognome')
          if (!pErr && pData) {
            setGiocatori(pData as any[])
          } else {
            setGiocatori([])
          }
        } else {
          setGiocatori([])
        }
      } else {
        setGiocatori([])
      }
    } finally {
      setLoadingOptions(false)
    }
  }

  useEffect(() => {
    if (!open) return
    void loadContextAndOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!form.partita_id && partite.length > 0) {
      setForm(prev => ({ ...prev, partita_id: partite[0].id }))
    }
  }, [open, partite, form.partita_id])

  const openDrawer = () => {
    resetForm()
    setOpen(true)
  }

  const closeDrawer = () => {
    setOpen(false)
  }

  const onSave = async () => {
    if (saving) return

    // Validazioni base
    if (!form.destinazione.trim()) {
      setToast({ msg: 'Destinazione obbligatoria', tipo: 'error' })
      return
    }
    if (!form.partita_id) {
      setToast({ msg: 'Seleziona Competizione/Evento', tipo: 'error' })
      return
    }
    if (!form.data_partenza || !form.data_rientro) {
      setToast({ msg: 'Date obbligatorie', tipo: 'error' })
      return
    }
    const d1 = new Date(`${form.data_partenza}T00:00:00`).getTime()
    const d2 = new Date(`${form.data_rientro}T00:00:00`).getTime()
    if (d2 < d1) {
      setToast({ msg: 'Data rientro deve essere >= data partenza', tipo: 'error' })
      return
    }

    const pCount =
      form.partecipanti.giocatori.length + form.partecipanti.staff.length + form.partecipanti.team_manager.length
    if (pCount === 0) {
      setToast({ msg: 'Seleziona almeno un partecipante', tipo: 'error' })
      return
    }

    setSaving(true)
    try {
      const costsStimato = [form.costo_trasporto_stimato, form.costo_alloggio_stimato, form.costo_pasti_stimato]
        .reduce<number>((s, v) => s + (v ?? 0), 0)
      const costsEffettivo = [form.costo_trasporto_reale, form.costo_alloggio_reale, form.costo_pasti_reale]
        .reduce<number>((s, v) => s + (v ?? 0), 0)

      const costoStm = costsStimato > 0 ? costsStimato : null
      const costoEff = costsEffettivo > 0 ? costsEffettivo : null

      const costsObj: any = {
        competizione_evento: selectedPartita
          ? `${selectedPartita.competizione ?? 'Evento'} · ${selectedPartita.avversario}`
          : '',
        fornitore: form.fornitore,
        trasporto: {
          mezzo: form.mezzo,
          costo_stimato: form.costo_trasporto_stimato,
          costo_reale: form.costo_trasporto_reale,
        },
        alloggio: {
          hotel: form.hotel,
          numero_notti: numeroNotti,
          costo_stimato: form.costo_alloggio_stimato,
          costo_reale: form.costo_alloggio_reale,
        },
        pasti: {
          numero_pasti_inclusi: form.numero_pasti_inclusi,
          costo_stimato: form.costo_pasti_stimato,
          costo_reale: form.costo_pasti_reale,
        },
        partecipanti: form.partecipanti,
        allegati: [] as any[],
      }

      const noteInitial = wrapCostiJsonBlock(costsObj, form.note_libere)

      const res = await fetch('/api/cis/trasferte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinazione: form.destinazione,
          data_partenza: form.data_partenza,
          data_rientro: form.data_rientro,
          mezzo: form.mezzo,
          costo_stimato: costoStm,
          costo_effettivo: costoEff,
          note: noteInitial,
          stato: 'programmata',
          partita_id: form.partita_id,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Errore creazione trasferta')
      const trasferteId = json.id as string

      // Upload allegati (best-effort)
      let attachmentsMeta: any[] = []
      if (newFiles.length > 0) {
        for (let i = 0; i < newFiles.length; i++) {
          const file = newFiles[i]
          const storagePath = `trasferte/${trasferteId}/${Date.now()}_${i}_${file.name}`
          const uploadRes = await supabase.storage
            .from(CIS_ALLEGATI_BUCKET)
            .upload(storagePath, file, { contentType: file.type })
          if (uploadRes.error) throw new Error(uploadRes.error.message)
          attachmentsMeta.push({
            file_name: file.name,
            mime_type: file.type,
            file_size: file.size ?? null,
            storage_path: storagePath,
          })
        }
      }

      if (attachmentsMeta.length > 0) {
        const nextCostsObj = { ...costsObj, allegati: attachmentsMeta }
        const nextNote = wrapCostiJsonBlock(nextCostsObj, form.note_libere)
        const patchRes = await fetch(`/api/cis/trasferte/${trasferteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: nextNote }),
        })
        const patchJson = await patchRes.json()
        if (!patchRes.ok) throw new Error(patchJson.error ?? 'Errore aggiornamento allegati')
      }

      setToast({ msg: 'Trasferta creata', tipo: 'success' })
      closeDrawer()
      router.refresh()
    } catch (e: any) {
      setToast({ msg: e?.message ?? 'Errore salvataggio trasferta', tipo: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const onFilesSelected = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files)
    const filtered = arr.filter(f => ALLOWED_FILE_TYPES.has(f.type))
    const invalidCount = arr.length - filtered.length

    if (invalidCount > 0) {
      setToast({ msg: 'Allegati consentiti: PDF, JPG, PNG', tipo: 'error' })
    }

    const next = [...newFiles, ...filtered].slice(0, MAX_ALLEGATI)
    if (newFiles.length + filtered.length > MAX_ALLEGATI) {
      setToast({ msg: `Massimo ${MAX_ALLEGATI} allegati consentiti`, tipo: 'error' })
    }
    setNewFiles(next)
  }

  const mezzoLabel: Record<MedioTrasporto, string> = {
    pullman: 'Pullman',
    treno: 'Treno',
    aereo: 'Aereo',
    auto_propria: 'Auto propria',
    altro: 'Altro',
  }

  return (
    <>
      <button className="btn btn-primary btn-sm" type="button" onClick={openDrawer}>
        + Nuova trasferta
      </button>

      <Drawer open={open} onClose={closeDrawer} title="Nuova trasferta" width={860}>
        {toast && (
          <Toast
            msg={toast.msg}
            tipo={toast.tipo}
            onClose={() => setToast(null)}
          />
        )}

        <div style={{ marginBottom: 10, color: 'var(--text-muted)', fontSize: 13 }}>
          Sezioni complete: generale, trasporti, alloggio, pasti, partecipanti e allegati.
        </div>

        {loadingOptions ? (
          <div style={{ padding: 14, color: 'var(--text-muted)' }}>Caricamento opzioni…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <FormSection title="Sezione Generale">
              <FormGrid cols={2}>
                <div>
                  <FormField label="Destinazione" required hint="Indirizzo/città (mappa opzionale non implementata: usa lat/lng se necessario)">
                    <input
                      className="input"
                      value={form.destinazione}
                      onChange={e => setForm(prev => ({ ...prev, destinazione: e.target.value }))}
                      placeholder="Es. Roma (stadio / hotel / indirizzo)"
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Competizione/Evento" required>
                    <select
                      className="input"
                      value={form.partita_id}
                      onChange={e => setForm(prev => ({ ...prev, partita_id: e.target.value }))}
                    >
                      <option value="" disabled>
                        {partite.length > 0 ? 'Seleziona…' : 'Nessuna partita disponibile'}
                      </option>
                      {partite.map(p => (
                        <option key={p.id} value={p.id}>
                          {(p.competizione ?? 'Evento') + ' · ' + p.avversario}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div>
                  <FormField label="Data partenza" required>
                    <input
                      className="input"
                      type="date"
                      value={form.data_partenza}
                      onChange={e => setForm(prev => ({ ...prev, data_partenza: e.target.value }))}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Data rientro" required>
                    <input
                      className="input"
                      type="date"
                      value={form.data_rientro}
                      onChange={e => setForm(prev => ({ ...prev, data_rientro: e.target.value }))}
                    />
                  </FormField>
                </div>
              </FormGrid>
            </FormSection>

            <FormSection title="Sezione Trasporti">
              <FormGrid cols={2}>
                <div>
                  <FormField label="Mezzo" required>
                    <select
                      className="input"
                      value={form.mezzo}
                      onChange={e => setForm(prev => ({ ...prev, mezzo: e.target.value as MedioTrasporto }))}
                    >
                      {Object.entries(mezzoLabel).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div>
                  <FormField label="Fornitore">
                    <input
                      className="input"
                      value={form.fornitore}
                      onChange={e => setForm(prev => ({ ...prev, fornitore: e.target.value }))}
                      placeholder="Es. Autolinee / Agenzia / Noleggio"
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Costo stimato trasporto (€)">
                    <input
                      className="input"
                      type="number"
                      step="1"
                      min={0}
                      value={form.costo_trasporto_stimato ?? ''}
                      onChange={e => setForm(prev => ({ ...prev, costo_trasporto_stimato: parseNumberOrNull(e.target.value) }))}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Costo reale trasporto (€)">
                    <input
                      className="input"
                      type="number"
                      step="1"
                      min={0}
                      value={form.costo_trasporto_reale ?? ''}
                      onChange={e => setForm(prev => ({ ...prev, costo_trasporto_reale: parseNumberOrNull(e.target.value) }))}
                    />
                  </FormField>
                </div>
              </FormGrid>
            </FormSection>

            <FormSection title="Sezione Alloggio">
              <FormGrid cols={2}>
                <div>
                  <FormField label="Nome hotel / struttura">
                    <input
                      className="input"
                      value={form.hotel}
                      onChange={e => setForm(prev => ({ ...prev, hotel: e.target.value }))}
                      placeholder="Es. Hotel Roma, Residenza…"
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Numero notti (auto-calcolato)" hint="Differenza tra data rientro e data partenza">
                    <input className="input" type="number" value={numeroNotti} readOnly />
                  </FormField>
                </div>

                <div>
                  <FormField label="Costo stimato alloggio (€)">
                    <input
                      className="input"
                      type="number"
                      step="1"
                      min={0}
                      value={form.costo_alloggio_stimato ?? ''}
                      onChange={e => setForm(prev => ({ ...prev, costo_alloggio_stimato: parseNumberOrNull(e.target.value) }))}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Costo reale alloggio (€)">
                    <input
                      className="input"
                      type="number"
                      step="1"
                      min={0}
                      value={form.costo_alloggio_reale ?? ''}
                      onChange={e => setForm(prev => ({ ...prev, costo_alloggio_reale: parseNumberOrNull(e.target.value) }))}
                    />
                  </FormField>
                </div>
              </FormGrid>
            </FormSection>

            <FormSection title="Sezione Pasti">
              <FormGrid cols={2}>
                <div>
                  <FormField label="Numero pasti inclusi">
                    <input
                      className="input"
                      type="number"
                      step="1"
                      min={0}
                      value={form.numero_pasti_inclusi ?? ''}
                      onChange={e => setForm(prev => ({ ...prev, numero_pasti_inclusi: parseNumberOrNull(e.target.value) }))}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Costo stimato pasti (€)">
                    <input
                      className="input"
                      type="number"
                      step="1"
                      min={0}
                      value={form.costo_pasti_stimato ?? ''}
                      onChange={e => setForm(prev => ({ ...prev, costo_pasti_stimato: parseNumberOrNull(e.target.value) }))}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Costo reale pasti (€)">
                    <input
                      className="input"
                      type="number"
                      step="1"
                      min={0}
                      value={form.costo_pasti_reale ?? ''}
                      onChange={e => setForm(prev => ({ ...prev, costo_pasti_reale: parseNumberOrNull(e.target.value) }))}
                    />
                  </FormField>
                </div>
              </FormGrid>
            </FormSection>

            <FormSection title="Sezione Partecipanti">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                    Giocatori
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {giocatori.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nessun giocatore attivo</div>
                    ) : (
                      giocatori.map(p => (
                        <label key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                          <input
                            type="checkbox"
                            checked={form.partecipanti.giocatori.includes(p.id)}
                            onChange={() => toggleParticipant('giocatori', p.id)}
                          />
                          {p.nome} {p.cognome}
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                    Staff
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {staff.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nessuno staff disponibile</div>
                    ) : (
                      staff.map(s => (
                        <label key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                          <input
                            type="checkbox"
                            checked={form.partecipanti.staff.includes(s.id)}
                            onChange={() => toggleParticipant('staff', s.id)}
                          />
                          {s.nome} {s.cognome} · {s.ruolo}
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                    Team manager
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {teamManagers.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nessun team manager trovato</div>
                    ) : (
                      teamManagers.map(tm => (
                        <label key={tm.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                          <input
                            type="checkbox"
                            checked={form.partecipanti.team_manager.includes(tm.id)}
                            onChange={() => toggleParticipant('team_manager', tm.id)}
                          />
                          {tm.nome} {tm.cognome}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection title="Sezione Allegati">
              <div style={{ marginBottom: 12 }}>
                <input
                  className="input"
                  type="file"
                  accept=".pdf,image/jpeg,image/png"
                  multiple
                  onChange={e => onFilesSelected(e.target.files)}
                />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  Consentiti: PDF/JPG/PNG · Max {MAX_ALLEGATI} file
                </div>
              </div>

              {newFiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {newFiles.map((f, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {(f.size / 1024).toFixed(1)} KB · {f.type || 'unknown'}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setNewFiles(prev => prev.filter((_, i) => i !== idx))}
                      >
                        Rimuovi
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </FormSection>

            <FormSection title="Sezione Note">
              <FormField label="Note libere">
                <textarea
                  className="input"
                  style={{ minHeight: 92, resize: 'vertical' }}
                  value={form.note_libere}
                  onChange={e => setForm(prev => ({ ...prev, note_libere: e.target.value }))}
                  placeholder="Dettagli operativi, richieste, note logistiche…"
                />
              </FormField>
            </FormSection>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
              <button type="button" className="btn btn-secondary" onClick={closeDrawer} disabled={saving}>
                Annulla
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void onSave()} disabled={saving}>
                {saving ? 'Salvataggio…' : 'Salva trasferta'}
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </>
  )
}

