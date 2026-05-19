'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FormField, FormGrid, FormSection, SectionCard, Select, BackButton, Toast } from '@/components/ui'

export default function NuovaPartitaPage() {
  const router = useRouter()
  const [squadre, setSquadre] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  const domani = new Date(); domani.setDate(domani.getDate() + 7)

  const [squadraId,     setSquadraId]     = useState('')
  const [avversario,    setAvversario]    = useState('')
  const [dataOra,       setDataOra]       = useState(domani.toISOString().slice(0, 16))
  const [campo,         setCampo]         = useState('')
  const [tipo,          setTipo]          = useState('campionato')
  const [competizione,  setCompetizione]  = useState('')
  const [giornata,      setGiornata]      = useState('')
  const [casaTrasferta, setCasaTrasferta] = useState('casa')

  useEffect(() => {
    async function load() {
      const sq: any[] = await fetch('/api/squadre').then(r => r.json()).catch(() => [])
      setSquadre(Array.isArray(sq) ? sq : [])
      if (sq?.length === 1) setSquadraId(sq[0].id)
    }
    load()
  }, [])

  const salva = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!squadraId || !avversario.trim()) {
      setToast({ msg: 'Squadra e avversario obbligatori', tipo: 'error' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/partite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squadra_id:    squadraId,
          avversario,
          data_ora:      new Date(dataOra).toISOString(),
          campo,
          tipo,
          competizione,
          giornata,
          casa_trasferta: casaTrasferta,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Errore') }
      setToast({ msg: 'Partita aggiunta', tipo: 'success' })
      setTimeout(() => router.push('/dashboard/segretario/partite'), 900)
    } catch (err: any) {
      setToast({ msg: err.message ?? 'Errore', tipo: 'error' })
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 660, margin: '0 auto' }}>
      <BackButton label="Torna alle partite" />
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Nuova partita</h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>Aggiungi una partita al calendario della stagione.</p>
      </div>
      <form onSubmit={salva}>
        <SectionCard>
          <FormSection title="Dettagli gara">
            <FormGrid cols={2}>
              <FormField label="Squadra" required>
                <Select value={squadraId} onChange={setSquadraId} placeholder="Seleziona squadra"
                  options={squadre.map(s => ({ value: s.id, label: s.nome }))} />
              </FormField>
              <FormField label="Avversario" required>
                <input className="input" value={avversario} onChange={e => setAvversario(e.target.value)} placeholder="A.S.D. Barletta" />
              </FormField>
            </FormGrid>
            <FormGrid cols={2}>
              <FormField label="Data e ora" required>
                <input className="input" type="datetime-local" value={dataOra} onChange={e => setDataOra(e.target.value)} />
              </FormField>
              <FormField label="Campo">
                <input className="input" value={campo} onChange={e => setCampo(e.target.value)} placeholder="Stadio Comunale" />
              </FormField>
            </FormGrid>
            <FormGrid cols={2}>
              <FormField label="Casa / Trasferta">
                <Select value={casaTrasferta} onChange={setCasaTrasferta}
                  options={[{ value: 'casa', label: 'Casa' }, { value: 'trasferta', label: 'Trasferta' }, { value: 'neutro', label: 'Campo neutro' }]} />
              </FormField>
              <FormField label="Tipo gara">
                <Select value={tipo} onChange={setTipo}
                  options={[{ value: 'campionato', label: 'Campionato' }, { value: 'coppa', label: 'Coppa' }, { value: 'amichevole', label: 'Amichevole' }, { value: 'playoff', label: 'Playoff/Playout' }]} />
              </FormField>
            </FormGrid>
            <FormGrid cols={2}>
              <FormField label="Competizione" hint="Es. Eccellenza Puglia Girone A">
                <input className="input" value={competizione} onChange={e => setCompetizione(e.target.value)} placeholder="Eccellenza Puglia" />
              </FormField>
              <FormField label="Giornata">
                <input className="input" type="number" min={1} max={40} value={giornata} onChange={e => setGiornata(e.target.value)} placeholder="1" />
              </FormField>
            </FormGrid>
          </FormSection>
        </SectionCard>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingBottom: 32 }}>
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Annulla</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Salvataggio...' : 'Salva partita'}</button>
        </div>
      </form>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
