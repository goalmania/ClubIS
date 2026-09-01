'use client'
import { useState, useEffect } from 'react'
import { PageHeader, FormField, SectionCard, Toast } from '@/components/ui'

type Prenotazione = { id: string; tipologia: string; data_ora_inizio: string; data_ora_fine: string }
type Campo = {
  id: string; nome: string; indirizzo: string | null; note: string | null; attivo: boolean
  costo_orario: number | null; orari_disponibili: string | null; prenotazioni: Prenotazione[]
}

const TIPOL_LABEL: Record<string, string> = {
  allenamento: 'Allenamento', partita: 'Partita', riunione: 'Riunione',
  visita_medica: 'Visita medica', trasferta: 'Trasferta',
}

export default function CampiPage() {
  const [campi, setCampi] = useState<Campo[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [nome, setNome] = useState('')
  const [indirizzo, setIndirizzo] = useState('')
  const [note, setNote] = useState('')
  const [costoOrario, setCostoOrario] = useState('')
  const [orariDisponibili, setOrariDisponibili] = useState('')
  const [saving, setSaving] = useState(false)
  const [espanso, setEspanso] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/campi')
    if (res.ok) { const j = await res.json(); setCampi(j.campi ?? []) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const salva = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) { setToast({ msg: 'Nome campo richiesto', tipo: 'error' }); return }
    setSaving(true)
    const res = await fetch('/api/campi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, indirizzo, note, costo_orario: costoOrario, orari_disponibili: orariDisponibili }),
    })
    if (res.ok) {
      setToast({ msg: 'Campo aggiunto', tipo: 'success' })
      setNome(''); setIndirizzo(''); setNote(''); setCostoOrario(''); setOrariDisponibili(''); setShowForm(false)
      load()
    } else {
      const j = await res.json().catch(() => ({}))
      setToast({ msg: j.error ?? 'Errore', tipo: 'error' })
    }
    setSaving(false)
  }

  const toggleAttivo = async (campo: Campo) => {
    const res = await fetch(`/api/campi/${campo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attivo: !campo.attivo }),
    })
    if (res.ok) load()
  }

  const fmtOra = (iso: string) => new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <div>
      <PageHeader title="Campi" subtitle="Gestisci i campi su cui si allenano le tue categorie" />

      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Annulla' : '+ Nuovo campo'}
        </button>
      </div>

      {showForm && (
        <SectionCard>
          <form onSubmit={salva} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormField label="Nome campo" required>
              <input className="input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Campo Comunale, Centro Sportivo..." />
            </FormField>
            <FormField label="Indirizzo">
              <input className="input" value={indirizzo} onChange={e => setIndirizzo(e.target.value)} placeholder="Via / Città" />
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Costo affitto (€/ora)">
                <input className="input" type="number" min="0" step="1" value={costoOrario} onChange={e => setCostoOrario(e.target.value)} placeholder="es. 40" />
              </FormField>
              <FormField label="Orari disponibili">
                <input className="input" value={orariDisponibili} onChange={e => setOrariDisponibili(e.target.value)} placeholder="es. Lun-Ven 15:00-22:00" />
              </FormField>
            </div>
            <FormField label="Note">
              <textarea className="input" value={note} onChange={e => setNote(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
            </FormField>
            <div>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva campo'}</button>
            </div>
          </form>
        </SectionCard>
      )}

      <div className="card" style={{ overflow: 'hidden', marginTop: 20 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>Indirizzo</th><th>Costo/ora</th><th>Orari disponibili</th><th>Stato</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray)' }}>Caricamento...</td></tr>
              ) : campi.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray)' }}>Nessun campo registrato</td></tr>
              ) : campi.map(c => (
                <>
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.nome}</td>
                    <td style={{ fontSize: 13, color: 'var(--gray)' }}>{c.indirizzo ?? '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--gray)' }}>{c.costo_orario != null ? `€${Number(c.costo_orario).toFixed(0)}` : '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--gray)' }}>{c.orari_disponibili ?? '—'}</td>
                    <td><span className={`badge ${c.attivo ? 'badge-verde' : 'badge-grigio'}`}>{c.attivo ? 'Attivo' : 'Disattivato'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEspanso(espanso === c.id ? null : c.id)}>
                          Prenotazioni {c.prenotazioni.length > 0 ? `(${c.prenotazioni.length})` : ''}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleAttivo(c)}>
                          {c.attivo ? 'Disattiva' : 'Riattiva'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {espanso === c.id && (
                    <tr>
                      <td colSpan={6} style={{ background: 'var(--bg-card, #0d0d0d)', padding: '12px 18px' }}>
                        {c.prenotazioni.length === 0 ? (
                          <div style={{ fontSize: 13, color: 'var(--gray)' }}>
                            Nessuna prenotazione in programma per questo campo.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {c.prenotazioni.map(p => (
                              <div key={p.id} style={{ fontSize: 13, display: 'flex', gap: 10 }}>
                                <span style={{ color: 'var(--accent, #c8f000)', fontWeight: 600 }}>{TIPOL_LABEL[p.tipologia] ?? p.tipologia}</span>
                                <span style={{ color: 'var(--gray)' }}>{fmtOra(p.data_ora_inizio)} → {fmtOra(p.data_ora_fine)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
