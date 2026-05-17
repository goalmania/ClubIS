'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Drawer, Toast } from '@/components/ui'

type Props = {
  open: boolean
  onClose: () => void
  clubId: string
  preselectedGiocatoreId?: string
  onSuccess?: () => void
}

interface GiocatoreOpt { id: string; nome: string; cognome: string }

const oggi = new Date().toISOString().split('T')[0]

export default function FormVisita({ open, onClose, clubId, preselectedGiocatoreId, onSuccess }: Props) {
  const supabase = createClient()
  const [giocatori, setGiocatori] = useState<GiocatoreOpt[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  const [giocatoreId, setGiocatoreId] = useState(preselectedGiocatoreId ?? '')
  const [tipo, setTipo] = useState('idoneita_sportiva')
  const [data, setData] = useState(oggi)
  const [ora, setOra] = useState('')
  const [medico, setMedico] = useState('')
  const [struttura, setStruttura] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    fetch('/api/giocatori')
      .then(r => r.json())
      .then((data: GiocatoreOpt[]) => setGiocatori(Array.isArray(data) ? data : []))
  }, [open])

  useEffect(() => {
    if (preselectedGiocatoreId) setGiocatoreId(preselectedGiocatoreId)
  }, [preselectedGiocatoreId])

  const reset = () => {
    setGiocatoreId(preselectedGiocatoreId ?? '')
    setTipo('idoneita_sportiva')
    setData(oggi)
    setOra('')
    setMedico('')
    setStruttura('')
    setNote('')
  }

  const salva = async () => {
    if (!data) {
      setToast({ msg: 'Data obbligatoria', tipo: 'error' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('visite_mediche').insert({
      club_id: clubId,
      giocatore_id: giocatoreId || null,
      tipo,
      data,
      ora: ora || null,
      medico: medico || null,
      struttura: struttura || null,
      note: note || null,
      esito: 'in_attesa',
    })
    setSaving(false)
    if (error) { setToast({ msg: error.message, tipo: 'error' }); return }
    setToast({ msg: 'Visita pianificata', tipo: 'success' })
    setTimeout(() => { reset(); onSuccess?.(); onClose() }, 800)
  }

  const tipoLabel: Record<string, string> = {
    idoneita_sportiva: 'Idoneità sportiva',
    controllo: 'Controllo periodico',
    specialistica: 'Visita specialistica',
    follow_up: 'Follow-up',
    altro: 'Altro',
  }

  return (
    <Drawer open={open} onClose={onClose} title="Pianifica visita medica" width={520}>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="label">Giocatore</label>
          <select className="input" style={{ width: '100%', marginTop: 4 }}
            value={giocatoreId} onChange={e => setGiocatoreId(e.target.value)}
            disabled={!!preselectedGiocatoreId}>
            <option value="">Visita generica / nessun giocatore</option>
            {giocatori.map(g => (
              <option key={g.id} value={g.id}>{g.cognome} {g.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Tipo visita *</label>
          <select className="input" style={{ width: '100%', marginTop: 4 }}
            value={tipo} onChange={e => setTipo(e.target.value)}>
            {Object.entries(tipoLabel).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="label">Data *</label>
            <input className="input" type="date" style={{ width: '100%', marginTop: 4 }}
              value={data} onChange={e => setData(e.target.value)} />
          </div>
          <div>
            <label className="label">Ora</label>
            <input className="input" type="time" style={{ width: '100%', marginTop: 4 }}
              value={ora} onChange={e => setOra(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Medico responsabile</label>
          <input className="input" style={{ width: '100%', marginTop: 4 }}
            value={medico} onChange={e => setMedico(e.target.value)}
            placeholder="Nome del medico" />
        </div>

        <div>
          <label className="label">Luogo / Struttura</label>
          <input className="input" style={{ width: '100%', marginTop: 4 }}
            value={struttura} onChange={e => setStruttura(e.target.value)}
            placeholder="es. Poliambulatorio Sport, Via Roma 1" />
        </div>

        <div>
          <label className="label">Note</label>
          <textarea className="input" rows={3} style={{ width: '100%', marginTop: 4, resize: 'vertical' }}
            value={note} onChange={e => setNote(e.target.value)}
            placeholder="Informazioni aggiuntive…" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary btn-sm" onClick={salva} disabled={saving}>
            {saving ? 'Salvataggio…' : 'Pianifica visita'}
          </button>
        </div>
      </div>
    </Drawer>
  )
}
