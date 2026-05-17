'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal, FormField, FormGrid, Select, Toast } from '@/components/ui'

const GRUPPI_SANGUIGNI = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-']

export default function CreaCartella({
  clubId,
  onSuccess,
}: {
  clubId: string
  onSuccess: () => void
}) {
  const [open, setOpen]                 = useState(false)
  const [giocatoreId, setGiocatoreId]   = useState('')
  const [giocatori, setGiocatori]       = useState<any[]>([])
  const [gruppoSanguigno, setGruppoSanguigno] = useState('')
  const [allergie, setAllergie]         = useState('')
  const [terapie, setTerapie]           = useState('')
  const [note, setNote]                 = useState('')
  const [saving, setSaving]             = useState(false)
  const [toast, setToast]               = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  async function apri() {
    const data = await fetch('/api/giocatori').then(r => r.json()).catch(() => [])
    setGiocatori(Array.isArray(data) ? data : [])
    setGiocatoreId('')
    setGruppoSanguigno('')
    setAllergie('')
    setTerapie('')
    setNote('')
    setOpen(true)
  }

  async function salva() {
    if (!giocatoreId) return
    const supabase = createClient()
    setSaving(true)
    const { error } = await supabase
      .from('giocatori')
      .update({
        gruppo_sanguigno: gruppoSanguigno || null,
        allergie: allergie || null,
        terapie_in_corso: terapie || null,
        note_medico: note || null,
      })
      .eq('id', giocatoreId)
    setSaving(false)
    if (error) { setToast({ msg: error.message, tipo: 'error' }); return }
    setToast({ msg: 'Cartella medica aggiornata', tipo: 'success' })
    setTimeout(() => {
      setOpen(false)
      onSuccess()
    }, 700)
  }

  return (
    <>
      <button className="btn btn-primary btn-sm" onClick={apri}>
        + Nuova cartella medica
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuova cartella medica" width={520}>
        <FormField label="Giocatore" required>
          <Select
            value={giocatoreId}
            onChange={setGiocatoreId}
            placeholder="Seleziona giocatore..."
            options={giocatori.map(g => ({ value: g.id, label: `${g.cognome} ${g.nome}` }))}
          />
        </FormField>

        <FormGrid cols={2}>
          <FormField label="Gruppo sanguigno">
            <Select
              value={gruppoSanguigno}
              onChange={setGruppoSanguigno}
              placeholder="—"
              options={GRUPPI_SANGUIGNI.map(v => ({ value: v, label: v }))}
            />
          </FormField>
          <div />
        </FormGrid>

        <FormField label="Allergie note">
          <textarea
            className="input"
            rows={2}
            style={{ width: '100%', resize: 'vertical' as const }}
            value={allergie}
            onChange={e => setAllergie(e.target.value)}
            placeholder="Es. Penicillina, lattice..."
          />
        </FormField>

        <FormField label="Terapie in corso">
          <textarea
            className="input"
            rows={2}
            style={{ width: '100%', resize: 'vertical' as const }}
            value={terapie}
            onChange={e => setTerapie(e.target.value)}
            placeholder="Farmaci e dosaggi..."
          />
        </FormField>

        <FormField label="Note medico">
          <textarea
            className="input"
            rows={2}
            style={{ width: '100%', resize: 'vertical' as const }}
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </FormField>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>
            Annulla
          </button>
          <button
            className="btn btn-primary"
            onClick={salva}
            disabled={saving || !giocatoreId}
          >
            {saving ? 'Salvo…' : 'Crea cartella'}
          </button>
        </div>
      </Modal>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </>
  )
}
