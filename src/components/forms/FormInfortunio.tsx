'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Drawer, FormField, FormGrid, Toast } from '@/components/ui'
import CorpoUmano from '@/components/ui/CorpoUmano'

type Props = {
  open: boolean
  onClose: () => void
  clubId: string
  preselectedGiocatoreId?: string
  onSuccess?: () => void
}

interface GiocatoreOpt { id: string; nome: string; cognome: string }

const oggi = new Date().toISOString().split('T')[0]

export default function FormInfortunio({ open, onClose, clubId, preselectedGiocatoreId, onSuccess }: Props) {
  const supabase = createClient()
  const [giocatori, setGiocatori] = useState<GiocatoreOpt[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  const [giocatoreId, setGiocatoreId] = useState(preselectedGiocatoreId ?? '')
  const [dataInfortunio, setDataInfortunio] = useState(oggi)
  const [tipo, setTipo] = useState('muscolare')
  const [gravita, setGravita] = useState('lieve')
  const [giorniStop, setGiorniStop] = useState('')
  const [zonaSelezionata, setZonaSelezionata] = useState<string | null>(null)
  const [diagnosi, setDiagnosi] = useState('')
  const [prognosi, setPrognosi] = useState('')
  const [terapia, setTerapia] = useState('')
  const [medicoRefertante, setMedicoRefertante] = useState('')

  useEffect(() => {
    if (!open) return
    fetch('/api/giocatori')
      .then(r => r.json())
      .then((data: GiocatoreOpt[]) => setGiocatori(Array.isArray(data) ? data : []))
  }, [open])

  useEffect(() => {
    if (preselectedGiocatoreId) setGiocatoreId(preselectedGiocatoreId)
  }, [preselectedGiocatoreId])

  const dataRientro = giorniStop
    ? new Date(Date.now() + parseInt(giorniStop) * 86400000).toISOString().split('T')[0]
    : null

  const reset = () => {
    setGiocatoreId(preselectedGiocatoreId ?? '')
    setDataInfortunio(oggi)
    setTipo('muscolare')
    setGravita('lieve')
    setGiorniStop('')
    setZonaSelezionata(null)
    setDiagnosi('')
    setPrognosi('')
    setTerapia('')
    setMedicoRefertante('')
  }

  const salva = async () => {
    if (!giocatoreId || !zonaSelezionata) {
      setToast({ msg: 'Seleziona giocatore e zona colpita', tipo: 'error' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('infortuni').insert({
      club_id: clubId,
      giocatore_id: giocatoreId,
      tipo,
      zona_corpo: zonaSelezionata,
      gravita,
      data_infortunio: dataInfortunio,
      giorni_stop: giorniStop ? parseInt(giorniStop) : null,
      data_rientro_prevista: dataRientro,
      diagnosi: diagnosi || null,
      prognosi: prognosi || null,
      terapia: terapia || null,
      medico_refertante: medicoRefertante || null,
    })
    setSaving(false)
    if (error) { setToast({ msg: error.message, tipo: 'error' }); return }
    setToast({ msg: 'Infortunio registrato', tipo: 'success' })
    setTimeout(() => { reset(); onSuccess?.(); onClose() }, 800)
  }

  return (
    <Drawer open={open} onClose={onClose} title="Registra infortunio" width={600}>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Giocatore */}
        <div>
          <label className="label">Giocatore *</label>
          <select
            className="input"
            style={{ width: '100%', marginTop: 4 }}
            value={giocatoreId}
            onChange={e => setGiocatoreId(e.target.value)}
            disabled={!!preselectedGiocatoreId}
          >
            <option value="">Seleziona giocatore…</option>
            {giocatori.map(g => (
              <option key={g.id} value={g.id}>{g.cognome} {g.nome}</option>
            ))}
          </select>
        </div>

        {/* Dati infortunio */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="label">Data infortunio</label>
            <input className="input" type="date" style={{ width: '100%', marginTop: 4 }}
              value={dataInfortunio} onChange={e => setDataInfortunio(e.target.value)} />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select className="input" style={{ width: '100%', marginTop: 4 }}
              value={tipo} onChange={e => setTipo(e.target.value)}>
              {['muscolare', 'osseo', 'legamentoso', 'contusione', 'distorsione', 'altro'].map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Gravità</label>
            <select className="input" style={{ width: '100%', marginTop: 4 }}
              value={gravita} onChange={e => setGravita(e.target.value)}>
              {['lieve', 'moderato', 'grave'].map(g => (
                <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Giorni stop</label>
            <input className="input" type="number" min={1} style={{ width: '100%', marginTop: 4 }}
              value={giorniStop} onChange={e => setGiorniStop(e.target.value)}
              placeholder="es. 21" />
            {dataRientro && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Rientro previsto: {new Date(dataRientro).toLocaleDateString('it-IT')}
              </div>
            )}
          </div>
        </div>

        {/* Schema anatomico */}
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 8 }}>
            Zona colpita *
          </label>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0', background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <CorpoUmano selected={zonaSelezionata} onChange={setZonaSelezionata} />
          </div>
        </div>

        {/* Sezione clinica */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
            Dati clinici
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="label">Diagnosi</label>
              <textarea className="input" rows={2} style={{ width: '100%', marginTop: 4, resize: 'vertical' }}
                value={diagnosi} onChange={e => setDiagnosi(e.target.value)}
                placeholder="Descrizione della diagnosi…" />
            </div>
            <div>
              <label className="label">Prognosi</label>
              <textarea className="input" rows={2} style={{ width: '100%', marginTop: 4, resize: 'vertical' }}
                value={prognosi} onChange={e => setPrognosi(e.target.value)}
                placeholder="Previsione di recupero…" />
            </div>
            <div>
              <label className="label">Terapia</label>
              <textarea className="input" rows={2} style={{ width: '100%', marginTop: 4, resize: 'vertical' }}
                value={terapia} onChange={e => setTerapia(e.target.value)}
                placeholder="Protocollo terapeutico…" />
            </div>
            <div>
              <label className="label">Medico refertante</label>
              <input className="input" style={{ width: '100%', marginTop: 4 }}
                value={medicoRefertante} onChange={e => setMedicoRefertante(e.target.value)}
                placeholder="Nome del medico" />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary btn-sm" onClick={salva} disabled={saving}>
            {saving ? 'Salvataggio…' : 'Registra infortunio'}
          </button>
        </div>
      </div>
    </Drawer>
  )
}
