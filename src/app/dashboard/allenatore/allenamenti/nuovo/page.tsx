'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { FormField, FormGrid, FormSection, SectionCard, Select, BackButton, Toast } from '@/components/ui'

export default function NuovoAllenamentoPage() {
  const router  = useRouter()
  const supabase = createClient()

  const [squadre,  setSquadre]  = useState<any[]>([])
  const [loading,  setLoading]  = useState(false)
  const [toast,    setToast]    = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  const domani = new Date(); domani.setDate(domani.getDate() + 1)
  const defaultData = domani.toISOString().slice(0, 16)

  const [squadraId,  setSquadraId]  = useState('')
  const [dataOra,    setDataOra]    = useState(defaultData)
  const [durata,     setDurata]     = useState('90')
  const [campo,      setCampo]      = useState('')
  const [tipologia,  setTipologia]  = useState('tecnico')
  const [obiettivo,  setObiettivo]  = useState('')
  const [noteTecnico,setNoteTecnico]= useState('')
  const [creaPresenze, setCreaPresenze] = useState(true)

  useEffect(() => {
    const CAT_ORDER: Record<string, number> = {
      prima_squadra: 0, primavera: 1, juniores: 2,
      u19: 3, u17: 4, u16: 5, u15: 6, u14: 7,
      u12: 8, u10: 9, u8: 10, u6: 11, femminile: 12,
    }
    fetch('/api/squadre')
      .then(r => r.json())
      .then((sq: any[]) => {
        if (!Array.isArray(sq)) return
        const sorted = sq.sort((a, b) => {
          const oa = CAT_ORDER[a.categoria_eta ?? ''] ?? 99
          const ob = CAT_ORDER[b.categoria_eta ?? ''] ?? 99
          if (oa !== ob) return oa - ob
          return (a.nome ?? '').localeCompare(b.nome ?? '')
        })
        setSquadre(sorted)
        if (sorted.length === 1) setSquadraId(sorted[0].id)
      })
  }, [])

  const salva = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!squadraId) { setToast({ msg: 'Seleziona una squadra', tipo: 'error' }); return }
    if (!dataOra)   { setToast({ msg: 'Inserisci data e ora', tipo: 'error' }); return }
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: sessione, error } = await supabase
        .from('sessioni_allenamento')
        .insert({
          squadra_id:    squadraId,
          allenatore_id: user!.id,
          data_ora:      new Date(dataOra).toISOString(),
          durata_minuti: parseInt(durata),
          campo:         campo.trim() || null,
          tipologia,
          obiettivo:     obiettivo.trim() || null,
          note_tecnico:  noteTecnico.trim() || null,
          stato:         'programmato',
        })
        .select('id')
        .single()

      if (error) throw error

      // Crea presenze vuote per tutti i giocatori della squadra
      if (creaPresenze) {
        const { data: tesserati } = await supabase
          .from('tesseramenti')
          .select('giocatore_id')
          .eq('squadra_id', squadraId)
          .eq('stato', 'attivo')

        if (tesserati && tesserati.length > 0) {
          await supabase.from('presenze').insert(
            tesserati.map(t => ({
              sessione_id:  sessione!.id,
              giocatore_id: t.giocatore_id,
              presente:     false,
              registrato_da: user!.id,
            }))
          )
        }
      }

      setToast({ msg: 'Allenamento creato', tipo: 'success' })
      setTimeout(() => router.push(`/dashboard/allenatore/presenze/${sessione!.id}`), 900)
    } catch (err: any) {
      setToast({ msg: err.message ?? 'Errore', tipo: 'error' })
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 660, margin: '0 auto' }}>
      <BackButton label="Torna alla dashboard" />

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Nuovo allenamento</h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          Crea una sessione e gestisci le presenze subito dopo il salvataggio.
        </p>
      </div>

      <form onSubmit={salva}>
        <SectionCard>
          <FormSection title="Dettagli sessione">
            <FormField label="Squadra" required>
              <Select
                value={squadraId}
                onChange={setSquadraId}
                placeholder="Seleziona squadra"
                options={squadre.map(s => ({ value: s.id, label: `${s.nome}${s.categoria_eta ? ` (${s.categoria_eta.toUpperCase().replace(/_/g, ' ')})` : ''}` }))}
              />
            </FormField>
            <FormGrid cols={2}>
              <FormField label="Data e ora" required>
                <input className="input" type="datetime-local" value={dataOra} onChange={e => setDataOra(e.target.value)} />
              </FormField>
              <FormField label="Durata (minuti)">
                <input className="input" type="number" min={15} max={240} value={durata} onChange={e => setDurata(e.target.value)} />
              </FormField>
            </FormGrid>
            <FormGrid cols={2}>
              <FormField label="Tipologia">
                <Select
                  value={tipologia}
                  onChange={setTipologia}
                  options={[
                    { value: 'tecnico',    label: 'Tecnico' },
                    { value: 'tattico',    label: 'Tattico' },
                    { value: 'fisico',     label: 'Fisico' },
                    { value: 'partitella', label: 'Partitella' },
                    { value: 'recupero',   label: 'Recupero' },
                    { value: 'video',      label: 'Analisi video' },
                  ]}
                />
              </FormField>
              <FormField label="Campo" hint="Lascia vuoto per usare quello di default">
                <input className="input" value={campo} onChange={e => setCampo(e.target.value)} placeholder="Stadio Comunale — Campo A" />
              </FormField>
            </FormGrid>
            <FormField label="Obiettivo della sessione">
              <input className="input" value={obiettivo} onChange={e => setObiettivo(e.target.value)} placeholder="Es. Lavoro sulle palle inattive, pressing alto..." />
            </FormField>
            <FormField label="Note tecniche">
              <textarea
                className="input"
                value={noteTecnico}
                onChange={e => setNoteTecnico(e.target.value)}
                placeholder="Annotazioni personali sulla sessione..."
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </FormField>
          </FormSection>

          <div style={{ paddingTop: 16, borderTop: '1px solid var(--grigio-5)' }}>
            <label style={{ display: 'flex', gap: 12, cursor: 'pointer', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={creaPresenze}
                onChange={e => setCreaPresenze(e.target.checked)}
                style={{ accentColor: 'var(--verde)' }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Apri gestione presenze dopo il salvataggio</div>
                <div style={{ fontSize: 12, color: 'var(--grigio-4)' }}>
                  Crea automaticamente una riga presenza per ogni giocatore tesserato
                </div>
              </div>
            </label>
          </div>
        </SectionCard>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingBottom: 32 }}>
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
            Annulla
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Salvataggio...' : creaPresenze ? 'Salva e gestisci presenze →' : 'Salva allenamento'}
          </button>
        </div>
      </form>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
