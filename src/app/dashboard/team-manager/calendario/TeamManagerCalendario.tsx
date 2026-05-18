'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import itLocale from '@fullcalendar/core/locales/it'


import { createClient } from '@/lib/supabase/client'
import { Modal, Toast, PageHeader } from '@/components/ui'

type TipologiaEvento =
  | 'allenamento'
  | 'partita'
  | 'riunione'
  | 'visita_medica'
  | 'trasferta'

type PrioritaEvento = 'bassa' | 'media' | 'alta' | 'urgente'

type SquadOption = { id: string; nome: string }
type StaffOption = { id: string; nome: string; cognome: string; ruolo: string }
type PlayerOption = { id: string; nome: string; cognome: string }

type CalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  extendedProps: {
    tipologia: TipologiaEvento
    priorita: PrioritaEvento
    note: string | null
    data: string
    luogo_testo: string | null
    partecipanti?: {
      squadre?: string[]
      staff?: string[]
      giocatori?: string[]
    }
  }
  backgroundColor?: string
  borderColor?: string
}

const TIP_LABEL: Record<TipologiaEvento, string> = {
  allenamento: 'Allenamento',
  partita: 'Partita',
  riunione: 'Riunione',
  visita_medica: 'Visita medica',
  trasferta: 'Trasferta',
}

const PRIORITY_COLOR: Record<PrioritaEvento, { bg: string; border: string }> = {
  bassa: { bg: 'rgba(148, 163, 184, 0.35)', border: 'rgb(148, 163, 184)' },
  media: { bg: 'rgba(59, 130, 246, 0.35)', border: 'rgb(59, 130, 246)' },
  alta: { bg: 'rgba(245, 158, 11, 0.35)', border: 'rgb(245, 158, 11)' },
  urgente: { bg: 'rgba(239, 68, 68, 0.38)', border: 'rgb(239, 68, 68)' },
}

const MAX_ALLEGATI = 5
const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
])

const CIS_ALLEGATI_BUCKET = 'cis-eventi-allegati'

function toIso(dateStr: string, timeStr: string) {
  // HTML time input is local. Convert to ISO for backend / FullCalendar.
  return new Date(`${dateStr}T${timeStr}:00`).toISOString()
}

function clampTimeToMinute(t: string) {
  return t.length >= 5 ? t.slice(0, 5) : t
}

function sameArray(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((x, i) => x === sb[i])
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr))
}

export default function TeamManagerCalendario() {
  const supabase = useMemo(() => createClient(), [])

  const [clubId, setClubId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])

  // Options for selects
  const [squadre, setSquadre] = useState<SquadOption[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [giocatori, setGiocatori] = useState<PlayerOption[]>([])

  // Filters
  const [filtersTipologia, setFiltersTipologia] = useState<TipologiaEvento[]>([])
  const [filtersSquadre, setFiltersSquadre] = useState<string[]>([])
  const [filtersStaff, setFiltersStaff] = useState<string[]>([])
  const [filtersGiocatori, setFiltersGiocatori] = useState<string[]>([])

  // Range
  const rangeRef = useRef<{ start: string; end: string } | null>(null)

  // Toast
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' | 'info' } | null>(null)

  // Modal CRUD
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const defaultStartTime = '18:00'
  const defaultEndTime = '19:00'

  const [form, setForm] = useState({
    tipologia: 'allenamento' as TipologiaEvento,
    data: today,
    startTime: defaultStartTime,
    endTime: defaultEndTime,
    luogo_testo: '',
    luogo_lat: null as number | null,
    luogo_lng: null as number | null,
    priorita: 'media' as PrioritaEvento,
    partecipanti: {
      squadre: [] as string[],
      staff: [] as string[],
      giocatori: [] as string[],
    },
    note: '',
  })

  const [existingAllegati, setExistingAllegati] = useState<
    { id: string; file_name: string; mime_type: string; file_size: number | null; storage_path: string; created_at: string }[]
  >([])
  const [newFiles, setNewFiles] = useState<File[]>([])

  const [attachmentsDirty, setAttachmentsDirty] = useState(false)

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setNewFiles([])
    setExistingAllegati([])
    setAttachmentsDirty(false)
  }

  const toggleListItem = <T extends string>(id: T, current: T[]) => {
    if (current.includes(id)) return current.filter(x => x !== id)
    return [...current, id]
  }

  const loadContextAndOptions = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: utente, error: utErr } = await supabase
      .from('utenti')
      .select('club_id')
      .eq('id', user.id)
      .single()
    if (utErr || !utente?.club_id) return

    setClubId(utente.club_id)

    // Squadre — via API server-side (adminClient, bypassa RLS)
    const sRes = await fetch('/api/squadre')
    if (sRes.ok) {
      const sData = await sRes.json()
      setSquadre((sData as any[]).map(x => ({ id: x.id, nome: x.nome })))
    }

    // Staff: utenti tranne famiglie
    const staffRoles = ['presidente', 'ds', 'segretario', 'allenatore', 'osservatore', 'medico', 'team_manager']
    const { data: stData, error: stErr } = await supabase
      .from('utenti')
      .select('id, nome, cognome, ruolo, attivo')
      .eq('club_id', utente.club_id)
      .in('ruolo', staffRoles)

    if (!stErr && stData) {
      setStaff((stData as any[]).filter(x => x.attivo ?? true).map(x => ({ id: x.id, nome: x.nome, cognome: x.cognome, ruolo: x.ruolo })))
    }

    // Giocatori — via API server-side che interroga per squadra_id (include importati con club_id NULL)
    const gRes = await fetch('/api/giocatori/tutti')
    if (gRes.ok) {
      const gData = await gRes.json()
      setGiocatori((gData as any[]).map(p => ({ id: p.id, nome: p.nome, cognome: p.cognome })))
    } else {
      setGiocatori([])
    }
  }

  const loadEvents = async (startIso: string, endIso: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('start', startIso)
      params.set('end', endIso)
      if (filtersTipologia.length > 0) params.set('tipologie', filtersTipologia.join(','))
      if (filtersSquadre.length > 0) params.set('squadre', filtersSquadre.join(','))
      if (filtersStaff.length > 0) params.set('staff', filtersStaff.join(','))
      if (filtersGiocatori.length > 0) params.set('giocatori', filtersGiocatori.join(','))

      const res = await fetch(`/api/cis/calendario/eventi?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Errore caricamento eventi')

      const mapped: CalendarEvent[] = (json.events ?? []).map((ev: any) => {
        const pri = ev.extendedProps?.priorita as PrioritaEvento
        const color = PRIORITY_COLOR[pri] ?? PRIORITY_COLOR.media
        return {
          ...ev,
          backgroundColor: color.bg,
          borderColor: color.border,
        }
      })

      setEvents(mapped)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContextAndOptions()
  }, [])

  useEffect(() => {
    if (!clubId) return
    if (!rangeRef.current) return
    // Ricarica eventi nel range corrente quando cambiano i filtri.
    loadEvents(rangeRef.current.start, rangeRef.current.end)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, filtersTipologia, filtersSquadre, filtersStaff, filtersGiocatori])

  const openCreateFromSelection = (info: any) => {
    const start = info?.start as Date
    const end = (info?.end as Date) ?? new Date(start.getTime() + 60 * 60 * 1000)
    const dateStr = start.toISOString().split('T')[0]
    const startTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
    const endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`

    setForm({
      tipologia: 'allenamento',
      data: dateStr,
      startTime: clampTimeToMinute(startTime),
      endTime: clampTimeToMinute(endTime),
      luogo_testo: '',
      luogo_lat: null,
      luogo_lng: null,
      priorita: 'media',
      partecipanti: { squadre: [], staff: [], giocatori: [] },
      note: '',
    })
    setNewFiles([])
    setExistingAllegati([])
    setAttachmentsDirty(false)
    setModalMode('create')
    setEditingId(null)
    setModalOpen(true)
  }

  const openEdit = async (eventId: string) => {
    setModalMode('edit')
    setEditingId(eventId)
    setNewFiles([])
    setAttachmentsDirty(false)

    const res = await fetch(`/api/cis/calendario/eventi/${eventId}`)
    const json = await res.json()
    if (!res.ok) {
      setToast({ msg: json.error ?? 'Errore caricamento evento', tipo: 'error' })
      return
    }

    const ev = json.evento
    const start = ev.data_ora_inizio ? new Date(ev.data_ora_inizio) : null
    const end = ev.data_ora_fine ? new Date(ev.data_ora_fine) : null
    const startTime = start ? `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}` : defaultStartTime
    const endTime = end ? `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}` : defaultEndTime

    setExistingAllegati((ev.allegati as any[]) ?? [])

    setForm({
      tipologia: ev.tipologia as TipologiaEvento,
      data: ev.data ?? (start ? start.toISOString().split('T')[0] : today),
      startTime: clampTimeToMinute(startTime),
      endTime: clampTimeToMinute(endTime),
      luogo_testo: ev.luogo_testo ?? '',
      luogo_lat: ev.luogo_lat ?? null,
      luogo_lng: ev.luogo_lng ?? null,
      priorita: ev.priorita as PrioritaEvento,
      partecipanti: {
        squadre: ev.partecipanti?.squadre ?? [],
        staff: ev.partecipanti?.staff ?? [],
        giocatori: ev.partecipanti?.giocatori ?? [],
      },
      note: ev.note ?? '',
    })

    setModalOpen(true)
  }

  const onClickUseGeo = async () => {
    if (!navigator.geolocation) {
      setToast({ msg: 'Geolocalizzazione non supportata', tipo: 'error' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, luogo_lat: pos.coords.latitude, luogo_lng: pos.coords.longitude }))
        setToast({ msg: 'Posizione salvata', tipo: 'success' })
      },
      () => setToast({ msg: 'Impossibile ottenere la posizione', tipo: 'error' }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  }

  const onPickFiles = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? [])
    const filtered = files.filter(f => ALLOWED_FILE_TYPES.has(f.type) || f.type === '')
    const tooMany = filtered.length + newFiles.length > MAX_ALLEGATI
    if (tooMany) {
      setToast({ msg: `Massimo ${MAX_ALLEGATI} allegati consentiti`, tipo: 'error' })
      return
    }

    const invalid = files.some(f => !ALLOWED_FILE_TYPES.has(f.type) && f.type !== '')
    if (invalid) {
      setToast({ msg: 'Formati ammessi: PDF, JPG, PNG', tipo: 'error' })
      return
    }

    setNewFiles(prev => [...prev, ...filtered].slice(0, MAX_ALLEGATI))
    setAttachmentsDirty(true)
  }

  const removeNewFile = (idx: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== idx))
    setAttachmentsDirty(true)
  }

  const removeExistingAttachment = (id: string) => {
    setExistingAllegati(prev => prev.filter(a => a.id !== id))
    setAttachmentsDirty(true)
  }

  const getFinalAllegatiMetadata = (uploaded: any[]) => {
    const keptExisting = existingAllegati.map(a => ({
      file_name: a.file_name,
      mime_type: a.mime_type,
      file_size: a.file_size ?? null,
      storage_path: a.storage_path,
    }))
    const merged = [...keptExisting, ...uploaded]
    return merged.slice(0, MAX_ALLEGATI)
  }

  const uploadFiles = async (eventoId: string) => {
    if (!clubId) throw new Error('clubId non disponibile')
    if (newFiles.length === 0) return []

    const uploaded: any[] = []
    for (const file of newFiles) {
      const safeName = file.name.replace(/[^\w.-]+/g, '_')
      const storagePath = `eventi/${clubId}/${eventoId}/${Date.now()}_${safeName}`
      const { error: upErr } = await supabase.storage
        .from(CIS_ALLEGATI_BUCKET)
        .upload(storagePath, file, { contentType: file.type })

      if (upErr) throw new Error(upErr.message)

      uploaded.push({
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size ?? null,
        storage_path: storagePath,
      })
    }
    return uploaded
  }

  const validateAndSave = async () => {
    if (!clubId) return

    if (!form.luogo_testo.trim()) {
      setToast({ msg: 'Luogo è obbligatorio', tipo: 'error' })
      return
    }
    if (!form.note.trim()) {
      setToast({ msg: 'Note è obbligatorio', tipo: 'error' })
      return
    }
    const startIso = toIso(form.data, form.startTime)
    const endIso = toIso(form.data, form.endTime)
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setToast({ msg: 'Ora fine deve essere successiva all’ora inizio', tipo: 'error' })
      return
    }
    const partecipanti = {
      squadre: uniq(form.partecipanti.squadre),
      staff: uniq(form.partecipanti.staff),
      giocatori: uniq(form.partecipanti.giocatori),
    }
    if (partecipanti.squadre.length + partecipanti.staff.length + partecipanti.giocatori.length === 0) {
      setToast({ msg: 'Seleziona almeno un partecipante', tipo: 'error' })
      return
    }

    try {
      if (modalMode === 'create') {
        const res = await fetch('/api/cis/calendario/eventi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipologia: form.tipologia,
            data: form.data,
            data_ora_inizio: startIso,
            data_ora_fine: endIso,
            luogo_testo: form.luogo_testo,
            luogo_lat: form.luogo_lat,
            luogo_lng: form.luogo_lng,
            priorita: form.priorita,
            note: form.note,
            partecipanti,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Errore creazione evento')

        const eventoId = json.id as string

        // Upload allegati + metadata
        let allegatiMetadata: any[] = []
        if (newFiles.length > 0) {
          const uploaded = await uploadFiles(eventoId)
          allegatiMetadata = getFinalAllegatiMetadata(uploaded)
        }

        if (allegatiMetadata.length > 0) {
          const patchRes = await fetch(`/api/cis/calendario/eventi/${eventoId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ allegati: allegatiMetadata }),
          })
          const patchJson = await patchRes.json()
          if (!patchRes.ok) throw new Error(patchJson.error ?? 'Errore salvataggio allegati')
        }

        setToast({ msg: 'Evento creato', tipo: 'success' })
        closeModal()
        if (rangeRef.current) await loadEvents(rangeRef.current.start, rangeRef.current.end)
        return
      }

      // Edit
      if (!editingId) return
      const eventoId = editingId

      let allegatiMetadata: any[] = []
      if (newFiles.length > 0 || attachmentsDirty) {
        const uploaded = await uploadFiles(eventoId)
        allegatiMetadata = getFinalAllegatiMetadata(uploaded)
      }

      const patchRes = await fetch(`/api/cis/calendario/eventi/${eventoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipologia: form.tipologia,
          data: form.data,
          data_ora_inizio: startIso,
          data_ora_fine: endIso,
          luogo_testo: form.luogo_testo,
          luogo_lat: form.luogo_lat,
          luogo_lng: form.luogo_lng,
          priorita: form.priorita,
          note: form.note,
          partecipanti,
          ...(allegatiMetadata.length >= 0 && (newFiles.length > 0 || attachmentsDirty) ? { allegati: allegatiMetadata } : {}),
        }),
      })
      const patchJson = await patchRes.json()
      if (!patchRes.ok) throw new Error(patchJson.error ?? 'Errore aggiornamento evento')

      setToast({ msg: 'Evento aggiornato', tipo: 'success' })
      closeModal()
      if (rangeRef.current) await loadEvents(rangeRef.current.start, rangeRef.current.end)
    } catch (e: any) {
      setToast({ msg: e.message ?? 'Errore salvataggio', tipo: 'error' })
    }
  }

  const onDelete = async () => {
    if (!editingId) return
    try {
      const res = await fetch(`/api/cis/calendario/eventi/${editingId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Errore eliminazione evento')
      setToast({ msg: 'Evento eliminato', tipo: 'success' })
      closeModal()
      if (rangeRef.current) await loadEvents(rangeRef.current.start, rangeRef.current.end)
    } catch (e: any) {
      setToast({ msg: e.message ?? 'Errore eliminazione', tipo: 'error' })
    }
  }

  const calendarEventsProps = useMemo(() => events as any[], [events])

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <PageHeader
        title="Calendario"
        subtitle="CRUD eventi · filtri · drag-and-drop"
        actions={
          <button
            className="btn btn-primary btn-sm"
            type="button"
            onClick={() => {
              setForm({
                tipologia: 'allenamento',
                data: today,
                startTime: defaultStartTime,
                endTime: defaultEndTime,
                luogo_testo: '',
                luogo_lat: null,
                luogo_lng: null,
                priorita: 'media',
                partecipanti: { squadre: [], staff: [], giocatori: [] },
                note: '',
              })
              setExistingAllegati([])
              setNewFiles([])
              setAttachmentsDirty(false)
              setModalMode('create')
              setEditingId(null)
              setModalOpen(true)
            }}
          >
            + Nuovo evento
          </button>
        }
      />

      {/* Filters */}
      <div className="card" style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 280px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Tipologia
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(Object.keys(TIP_LABEL) as TipologiaEvento[]).map(t => {
                const active = filtersTipologia.includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFiltersTipologia(prev => toggleListItem(t, prev))}
                    style={{ padding: '6px 10px' }}
                  >
                    {TIP_LABEL[t]}
                  </button>
                )
              })}
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setFiltersTipologia([])}
              >
                Reset
              </button>
            </div>
          </div>

          <div style={{ flex: '1 1 280px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Partecipanti
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <details open={filtersSquadre.length > 0}>
                <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>Squadre</summary>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
                  {squadre.map(s => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={filtersSquadre.includes(s.id)}
                        onChange={() => setFiltersSquadre(prev => toggleListItem(s.id, prev))}
                      />
                      <span>{s.nome}</span>
                    </label>
                  ))}
                </div>
              </details>

              <details open={filtersStaff.length > 0}>
                <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>Staff</summary>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
                  {staff.map(st => (
                    <label key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={filtersStaff.includes(st.id)}
                        onChange={() => setFiltersStaff(prev => toggleListItem(st.id, prev))}
                      />
                      <span>{st.nome} {st.cognome}</span>
                    </label>
                  ))}
                </div>
              </details>

              <details open={filtersGiocatori.length > 0}>
                <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>Giocatori</summary>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                  {giocatori.map(p => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={filtersGiocatori.includes(p.id)}
                        onChange={() => setFiltersGiocatori(prev => toggleListItem(p.id, prev))}
                      />
                      <span>{p.cognome} {p.nome}</span>
                    </label>
                  ))}
                </div>
              </details>

              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setFiltersSquadre([])
                  setFiltersStaff([])
                  setFiltersGiocatori([])
                }}
              >
                Reset partecipanti
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {clubId == null ? (
          <div style={{ padding: 24, color: 'var(--text-muted)' }}>Caricamento dati…</div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            locale={itLocale}
            timeZone="local"
            initialView="dayGridMonth"
            selectable
            editable
            eventResizableFromStart
            eventDrop={(info) => {
              const ev = info.event
              const start = ev.start?.toISOString()
              const end = ev.end?.toISOString()
              if (!start || !end) return

              fetch(`/api/cis/calendario/eventi/${ev.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ start, end }),
              })
                .then(async (r) => {
                  if (!r.ok) throw new Error((await r.json()).error ?? 'Errore patch')
                  if (rangeRef.current) await loadEvents(rangeRef.current.start, rangeRef.current.end)
                })
                .catch((err) => {
                  info.revert()
                  setToast({ msg: err.message ?? 'Errore spostamento', tipo: 'error' })
                })
            }}
            eventResize={(info) => {
              const ev = info.event
              const start = ev.start?.toISOString()
              const end = ev.end?.toISOString()
              if (!start || !end) return
              fetch(`/api/cis/calendario/eventi/${ev.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ start, end }),
              })
                .then(async (r) => {
                  if (!r.ok) throw new Error((await r.json()).error ?? 'Errore resize')
                  if (rangeRef.current) await loadEvents(rangeRef.current.start, rangeRef.current.end)
                })
                .catch((err) => {
                  info.revert()
                  setToast({ msg: err.message ?? 'Errore resize', tipo: 'error' })
                })
            }}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            }}
            views={{
              listWeek: { buttonText: 'Agenda' },
            }}
            events={calendarEventsProps as any}
            select={(info) => openCreateFromSelection(info)}
            eventClick={(info) => {
              const id = info.event.id
              openEdit(String(id))
            }}
            datesSet={(arg) => {
              const start = arg.startStr
              const end = arg.endStr
              rangeRef.current = { start, end }
              loadEvents(start, end)
            }}
            loading={(isLoading) => setLoading(isLoading)}
            height="auto"
          />
        )}
        {loading && (
          <div style={{ padding: 10, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Caricamento eventi…
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={modalMode === 'create' ? 'Nuovo evento' : 'Modifica evento'}
        width={900}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            validateAndSave()
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="label">
                    Tipologia <span style={{ color: 'var(--accent-red)', marginLeft: 3 }}>*</span>
                  </label>
                  <select
                    className="input"
                    value={form.tipologia}
                    onChange={(e) => setForm(f => ({ ...f, tipologia: e.target.value as TipologiaEvento }))}
                  >
                    {(Object.keys(TIP_LABEL) as TipologiaEvento[]).map(t => (
                      <option key={t} value={t}>{TIP_LABEL[t]}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">
                      Data <span style={{ color: 'var(--accent-red)', marginLeft: 3 }}>*</span>
                    </label>
                    <input
                      className="input"
                      type="date"
                      value={form.data}
                      onChange={(e) => setForm(f => ({ ...f, data: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">
                      Priorità <span style={{ color: 'var(--accent-red)', marginLeft: 3 }}>*</span>
                    </label>
                    <select
                      className="input"
                      value={form.priorita}
                      onChange={(e) => setForm(f => ({ ...f, priorita: e.target.value as PrioritaEvento }))}
                    >
                      {(['bassa', 'media', 'alta', 'urgente'] as PrioritaEvento[]).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">
                      Ora inizio <span style={{ color: 'var(--accent-red)', marginLeft: 3 }}>*</span>
                    </label>
                    <input
                      className="input"
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm(f => ({ ...f, startTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">
                      Ora fine <span style={{ color: 'var(--accent-red)', marginLeft: 3 }}>*</span>
                    </label>
                    <input
                      className="input"
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm(f => ({ ...f, endTime: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <label className="label">
                  Luogo <span style={{ color: 'var(--accent-red)', marginLeft: 3 }}>*</span>
                </label>
                <input
                  className="input"
                  value={form.luogo_testo}
                  onChange={(e) => setForm(f => ({ ...f, luogo_testo: e.target.value }))}
                  placeholder="es. Campo Comunale"
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={onClickUseGeo}>
                    Usa geolocalizzazione
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {form.luogo_lat != null && form.luogo_lng != null ? `Lat ${form.luogo_lat.toFixed(5)} · Lng ${form.luogo_lng.toFixed(5)}` : 'Lat/Lng opzionali'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div style={{ marginBottom: 12 }}>
                <label className="label">
                  Partecipanti <span style={{ color: 'var(--accent-red)', marginLeft: 3 }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                  <details open>
                    <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Squadre</summary>
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 130, overflowY: 'auto' }}>
                      {squadre.map(s => (
                        <label key={s.id} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={form.partecipanti.squadre.includes(s.id)}
                            onChange={() => setForm(f => ({
                              ...f,
                              partecipanti: { ...f.partecipanti, squadre: toggleListItem(s.id, f.partecipanti.squadre) },
                            }))}
                          />
                          {s.nome}
                        </label>
                      ))}
                    </div>
                  </details>

                  <details open>
                    <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Staff</summary>
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 130, overflowY: 'auto' }}>
                      {staff.map(st => (
                        <label key={st.id} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={form.partecipanti.staff.includes(st.id)}
                            onChange={() => setForm(f => ({
                              ...f,
                              partecipanti: { ...f.partecipanti, staff: toggleListItem(st.id, f.partecipanti.staff) },
                            }))}
                          />
                          {st.nome} {st.cognome}
                        </label>
                      ))}
                    </div>
                  </details>

                  <details open>
                    <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Giocatori</summary>
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                      {giocatori.map(p => (
                        <label key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={form.partecipanti.giocatori.includes(p.id)}
                            onChange={() => setForm(f => ({
                              ...f,
                              partecipanti: { ...f.partecipanti, giocatori: toggleListItem(p.id, f.partecipanti.giocatori) },
                            }))}
                          />
                          {p.cognome} {p.nome}
                        </label>
                      ))}
                    </div>
                  </details>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <label className="label">
                  Note <span style={{ color: 'var(--accent-red)', marginLeft: 3 }}>*</span>
                </label>
                <textarea
                  className="input"
                  value={form.note}
                  onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Note sull'evento…"
                  style={{ minHeight: 90, resize: 'vertical' }}
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <label className="label">Allegati (max {MAX_ALLEGATI})</label>
                <input
                  className="input"
                  type="file"
                  multiple
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(e) => onPickFiles(e.target.files)}
                />
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {existingAllegati.length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Allegati esistenti
                    </div>
                  )}
                  {existingAllegati.map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.file_name}
                      </span>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeExistingAttachment(a.id)}>
                        Rimuovi
                      </button>
                    </div>
                  ))}
                  {newFiles.map((f, idx) => (
                    <div key={`${f.name}-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.name}
                      </span>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeNewFile(idx)}>
                        Rimuovi
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 18 }}>
            {modalMode === 'edit' ? (
              <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
                Elimina
              </button>
            ) : (
              <div />
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={closeModal}>
                Annulla
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {modalMode === 'create' ? 'Crea evento' : 'Salva modifiche'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {toast && (
        <Toast
          msg={toast.msg}
          tipo={toast.tipo}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

