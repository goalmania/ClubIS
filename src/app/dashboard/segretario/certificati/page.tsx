'use client'
import { useState, useEffect, useCallback } from 'react'
import { PageHeader, EmptyState, Modal, FormField, FormGrid, Toast } from '@/components/ui'

/* ─── Pagina ─────────────────────────────────────────────────────── */

export default function CertificatiPage() {
  const [certificati, setCertificati]     = useState<any[]>([])
  const [giocatoriList, setGiocatoriList] = useState<any[]>([])
  const [loading, setLoading]             = useState(true)
  const [filtro, setFiltro]               = useState<'tutti' | 'scaduti' | 'in_scadenza' | 'validi'>('tutti')
  const [toast, setToast]                 = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  // Modal
  const [openModal, setOpenModal]       = useState(false)
  const [giocatoreId, setGiocatoreId]   = useState('')
  const [tipo, setTipo]                 = useState('agonistico')
  const [dataRilascio, setDataRilascio] = useState('')
  const [dataScadenza, setDataScadenza] = useState('')
  const [medico, setMedico]             = useState('')
  const [struttura, setStruttura]       = useState('')
  const [noteModal, setNoteModal]       = useState('')
  const [saving, setSaving]             = useState(false)
  const [fileUrl, setFileUrl]           = useState<string | null>(null)
  const [uploading, setUploading]       = useState(false)

  /* ── Load ──────────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/certificati')
      const json = await res.json()
      if (!res.ok) { setToast({ msg: json.error ?? 'Errore caricamento', tipo: 'error' }); return }
      setCertificati(json.certificati ?? [])
      setGiocatoriList(json.giocatori ?? [])
    } catch {
      setToast({ msg: 'Errore di rete', tipo: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  /* ── Classificazione ───────────────────────────────────────────── */

  const oggi  = new Date()
  const tra30 = new Date(oggi); tra30.setDate(oggi.getDate() + 30)
  const tra7  = new Date(oggi); tra7.setDate(oggi.getDate() + 7)

  const classifica = (c: any) => {
    const scad = new Date(c.data_scadenza)
    if (scad < oggi)   return 'scaduti'
    if (scad <= tra30) return 'in_scadenza'
    return 'validi'
  }

  const filtrati = certificati.filter(c => filtro === 'tutti' || classifica(c) === filtro)

  const counts = {
    scaduti:     certificati.filter(c => classifica(c) === 'scaduti').length,
    in_scadenza: certificati.filter(c => classifica(c) === 'in_scadenza').length,
    validi:      certificati.filter(c => classifica(c) === 'validi').length,
  }

  const badgeStato = (c: any) => {
    const stato = classifica(c)
    const gg = Math.ceil((new Date(c.data_scadenza).getTime() - oggi.getTime()) / 86400000)
    if (stato === 'scaduti')     return <span className="badge badge-rosso">Scaduto</span>
    if (gg <= 7)                 return <span className="badge badge-rosso">Scade in {gg}gg</span>
    if (stato === 'in_scadenza') return <span className="badge badge-ambra">{gg} giorni</span>
    return <span className="badge badge-verde">Valido</span>
  }

  /* ── Modal handlers ────────────────────────────────────────────── */

  function apriModal(prefill?: { giocatoreId?: string; tipo?: string; medico?: string; struttura?: string }) {
    setGiocatoreId(prefill?.giocatoreId ?? '')
    setTipo(prefill?.tipo ?? 'agonistico')
    setDataRilascio('')
    setDataScadenza('')
    setMedico(prefill?.medico ?? '')
    setStruttura(prefill?.struttura ?? '')
    setNoteModal('')
    setFileUrl(null)
    setOpenModal(true)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !giocatoreId) {
      if (!giocatoreId) setToast({ msg: 'Seleziona prima il giocatore', tipo: 'error' })
      return
    }
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('giocatoreId', giocatoreId)
    try {
      const res = await fetch('/api/upload/certificato', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.url) {
        setFileUrl(json.url)
        setToast({ msg: 'File caricato', tipo: 'success' })
      } else {
        setToast({ msg: json.error ?? 'Errore upload', tipo: 'error' })
      }
    } catch {
      setToast({ msg: 'Errore upload', tipo: 'error' })
    } finally {
      setUploading(false)
    }
  }

  function onDataRilascioChange(v: string) {
    setDataRilascio(v)
    if (v) {
      const d = new Date(v)
      d.setFullYear(d.getFullYear() + 1)
      setDataScadenza(d.toISOString().split('T')[0])
    }
  }

  async function salva() {
    if (!giocatoreId || !dataRilascio || !dataScadenza) {
      setToast({ msg: 'Compila i campi obbligatori', tipo: 'error' }); return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/certificati', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          giocatore_id: giocatoreId,
          tipo,
          data_rilascio: dataRilascio,
          data_scadenza: dataScadenza,
          medico:        medico    || null,
          struttura:     struttura || null,
          note:          noteModal || null,
          documento_url: fileUrl   || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setToast({ msg: json.error ?? 'Errore salvataggio', tipo: 'error' }); return }
      setToast({ msg: 'Certificato aggiunto', tipo: 'success' })
      setOpenModal(false)
      await load()
    } catch {
      setToast({ msg: 'Errore di rete', tipo: 'error' })
    } finally {
      setSaving(false)
    }
  }

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div>
      <PageHeader
        title="Certificati medici"
        subtitle={`${certificati.length} giocatori — ${counts.scaduti + counts.in_scadenza} richiedono attenzione`}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => apriModal()}>
            + Aggiungi certificato
          </button>
        }
      />

      {counts.scaduti > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: 14 }}>
          <strong>{counts.scaduti} certificati scaduti.</strong> I giocatori interessati non possono essere convocati.
        </div>
      )}

      {/* Filtri */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {([
          { v: 'tutti' as const,       l: `Tutti (${certificati.length})` },
          { v: 'scaduti' as const,     l: `Scaduti (${counts.scaduti})`,       c: counts.scaduti > 0 ? 'var(--rosso)' : undefined },
          { v: 'in_scadenza' as const, l: `In scadenza (${counts.in_scadenza})`,c: counts.in_scadenza > 0 ? 'var(--ambra)' : undefined },
          { v: 'validi' as const,      l: `Validi (${counts.validi})` },
        ]).map(f => (
          <button key={f.v} onClick={() => setFiltro(f.v)} style={{
            padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
            border: filtro === f.v ? `1px solid ${f.c ?? 'var(--verde)'}` : '1px solid var(--grigio-5)',
            background: filtro === f.v ? (f.c ? `${f.c}22` : 'var(--verde-lt)') : 'transparent',
            color: filtro === f.v ? (f.c ?? 'var(--verde)') : 'var(--grigio-3)',
            fontWeight: filtro === f.v ? 500 : 400,
          }}>
            {f.l}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)' }}>
            Caricamento...
          </div>
        ) : filtrati.length === 0 ? (
          <EmptyState icon="✓" title="Nessun certificato in questa categoria" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Giocatore</th>
                  <th>Tipo</th>
                  <th>Data rilascio</th>
                  <th>Scadenza</th>
                  <th>Medico</th>
                  <th>Stato</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtrati.map(c => {
                  const g = c.giocatori
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{g?.cognome} {g?.nome}</td>
                      <td><span className="badge badge-grigio">{c.tipo}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--grigio-3)' }}>
                        {c.data_rilascio ? new Date(c.data_rilascio).toLocaleDateString('it-IT') : '—'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500 }}>
                        {new Date(c.data_scadenza).toLocaleDateString('it-IT')}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{c.medico ?? '—'}</td>
                      <td>{badgeStato(c)}</td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 12 }}
                          onClick={() => apriModal({ giocatoreId: g?.id, tipo: c.tipo, medico: c.medico ?? '', struttura: c.struttura ?? '' })}
                        >
                          Rinnova
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ─────────────────────────────────────────────────── */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Aggiungi certificato" width={540}>
        <FormField label="Giocatore" required>
          <select
            className="input"
            style={{ width: '100%' }}
            value={giocatoreId}
            onChange={e => setGiocatoreId(e.target.value)}
          >
            <option value="">— Seleziona giocatore —</option>
            {giocatoriList.map(g => (
              <option key={g.id} value={g.id}>{g.cognome} {g.nome}</option>
            ))}
          </select>
        </FormField>

        <FormGrid cols={2}>
          <FormField label="Tipo certificato" required>
            <select
              className="input"
              style={{ width: '100%' }}
              value={tipo}
              onChange={e => setTipo(e.target.value)}
            >
              <option value="agonistico">Agonistico</option>
              <option value="non_agonistico">Non agonistico</option>
            </select>
          </FormField>
          <div />
        </FormGrid>

        <FormGrid cols={2}>
          <FormField label="Data rilascio" required>
            <input
              className="input"
              type="date"
              style={{ width: '100%' }}
              value={dataRilascio}
              onChange={e => onDataRilascioChange(e.target.value)}
            />
          </FormField>
          <FormField label="Data scadenza" required hint="Auto-calcolata a +1 anno dal rilascio">
            <input
              className="input"
              type="date"
              style={{ width: '100%' }}
              value={dataScadenza}
              onChange={e => setDataScadenza(e.target.value)}
            />
          </FormField>
        </FormGrid>

        <FormGrid cols={2}>
          <FormField label="Medico">
            <input
              className="input"
              style={{ width: '100%' }}
              value={medico}
              onChange={e => setMedico(e.target.value)}
              placeholder="Dr. Rossi"
            />
          </FormField>
          <FormField label="Struttura / ASL">
            <input
              className="input"
              style={{ width: '100%' }}
              value={struttura}
              onChange={e => setStruttura(e.target.value)}
              placeholder="ASL Bari"
            />
          </FormField>
        </FormGrid>

        <FormField label="Note">
          <textarea
            className="input"
            rows={2}
            style={{ width: '100%', resize: 'vertical' as const }}
            value={noteModal}
            onChange={e => setNoteModal(e.target.value)}
          />
        </FormField>

        <FormField label="Documento (PDF / JPG / PNG, max 5 MB)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileUpload}
              disabled={uploading || !giocatoreId}
              style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11 }}
            />
            {uploading && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)' }}>
                Caricamento…
              </span>
            )}
            {fileUrl && !uploading && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--verde)' }}>
                ✓ Caricato
              </span>
            )}
          </div>
          {!giocatoreId && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginTop: 4 }}>
              Seleziona prima il giocatore per abilitare l&apos;upload
            </p>
          )}
        </FormField>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setOpenModal(false)}>
            Annulla
          </button>
          <button
            className="btn btn-primary"
            onClick={salva}
            disabled={saving || !giocatoreId || !dataRilascio || !dataScadenza}
          >
            {saving ? 'Salvo…' : 'Aggiungi certificato'}
          </button>
        </div>
      </Modal>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
