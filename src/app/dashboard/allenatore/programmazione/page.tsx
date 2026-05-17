'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal, FormField, FormGrid, Select, Toast } from '@/components/ui'
import { useSharedData } from '@/hooks/useSharedData'
import Link from 'next/link'

const TIPI_ALL = [
  { value: 'tecnico',          label: 'Tecnico' },
  { value: 'tattico',          label: 'Tattico' },
  { value: 'fisico',           label: 'Fisico' },
  { value: 'partita_simulata', label: 'Partita simulata' },
  { value: 'scarico',          label: 'Scarico' },
  { value: 'riposo',           label: 'Riposo' },
]

const TIPO_COL: Record<string, string> = {
  tecnico: 'var(--accent-blue)',
  tattico: 'var(--accent-purple)',
  fisico:  'var(--accent-orange)',
  partita_simulata: 'var(--accent-green)',
  scarico: 'var(--text-muted)',
  riposo:  'var(--border)',
}

const fmtDate = (d: Date) => d.toISOString().split('T')[0]

export default function ProgrammazionePage() {
  const supabase = createClient()
  const [clubId, setClubId] = useState<string | null>(null)
  const [squadre, setSquadre] = useState<any[]>([])
  const [allenamenti, setAllenamenti] = useState<any[]>([])
  const [partite, setPartite] = useState<any[]>([])

  const [openModal, setOpenModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  // Form state
  const [sqSel, setSqSel] = useState('')
  const [data, setData] = useState('')
  const [ora, setOra] = useState('')
  const [luogo, setLuogo] = useState('')
  const [tipo, setTipo] = useState('tecnico')
  const [obiettivo, setObiettivo] = useState('')
  const [note, setNote] = useState('')

  const oggi = new Date()
  const inizioSett = new Date(oggi)
  inizioSett.setDate(oggi.getDate() - oggi.getDay() + 1)
  const fineSett = new Date(inizioSett)
  fineSett.setDate(inizioSett.getDate() + 13)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
    if (!utente) return
    setClubId(utente.club_id)

    const sq: any[] = await fetch('/api/squadre').then(r => r.json()).catch(() => [])
    setSquadre(sq)
    if (sq.length && !sqSel) setSqSel(sq[0].id)

    const [{ data: alls }, { data: pars }] = await Promise.all([
      supabase.from('allenamenti')
        .select('id, data, ora, luogo, obiettivo, tipo')
        .eq('club_id', utente.club_id)
        .gte('data', fmtDate(inizioSett))
        .lte('data', fmtDate(fineSett))
        .order('data'),
      supabase.from('partite')
        .select('id, data_ora, avversario, casa_trasferta')
        .eq('club_id', utente.club_id)
        .gte('data_ora', inizioSett.toISOString())
        .lte('data_ora', fineSett.toISOString())
        .order('data_ora'),
    ])
    setAllenamenti(alls ?? [])
    setPartite(pars ?? [])
  }, [sqSel])

  useSharedData(load)

  const resetForm = () => {
    setData(''); setOra(''); setLuogo(''); setTipo('tecnico'); setObiettivo(''); setNote('')
  }

  const salva = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId || !data) { setToast({ msg: 'Data obbligatoria', tipo: 'error' }); return }
    setSaving(true)
    const { error } = await supabase.from('allenamenti').insert({
      club_id: clubId,
      squadra_id: sqSel || null,
      data,
      ora: ora || null,
      luogo: luogo || null,
      tipo,
      obiettivo: obiettivo || null,
      note: note || null,
    })
    setSaving(false)
    if (error) { setToast({ msg: error.message, tipo: 'error' }); return }
    setToast({ msg: 'Allenamento aggiunto al calendario', tipo: 'success' })
    setOpenModal(false)
    resetForm()
    load()
  }

  // Build 14-day grid
  const giorni: Date[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(inizioSett)
    d.setDate(inizioSett.getDate() + i)
    giorni.push(d)
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Programmazione</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            Microciclo 2 settimane — pianificazione allenamenti
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setOpenModal(true)}>
          + Nuovo allenamento
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 20 }}>
        {giorni.map(d => {
          const dStr = fmtDate(d)
          const alls = allenamenti.filter(a => a.data === dStr)
          const pars = partite.filter(p => p.data_ora.slice(0, 10) === dStr)
          const isOggi = fmtDate(oggi) === dStr
          return (
            <div key={dStr} style={{
              background: 'var(--bg-card)',
              border: isOggi ? '2px solid var(--accent-blue)' : '1px solid var(--border)',
              borderRadius: 8, overflow: 'hidden', minHeight: 120,
            }}>
              <div style={{
                padding: '8px 10px', borderBottom: '1px solid var(--border-light)',
                fontSize: 11, fontWeight: 600,
                color: isOggi ? 'var(--accent-blue)' : 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {d.toLocaleDateString('it-IT', { weekday: 'short' })} {d.getDate()}
              </div>
              <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {pars.map(p => (
                  <div key={p.id} style={{
                    padding: '5px 8px', background: 'var(--accent-green-lt)',
                    color: 'var(--accent-green)', borderRadius: 4, fontSize: 10, fontWeight: 600,
                  }}>
                    🏆 {p.casa_trasferta === 'casa' ? 'vs' : '@'} {p.avversario}
                  </div>
                ))}
                {alls.map(a => {
                  const col = TIPO_COL[a.tipo ?? 'tecnico'] ?? 'var(--accent-blue)'
                  return (
                    <div key={a.id} style={{
                      padding: '5px 8px', borderLeft: `3px solid ${col}`,
                      background: 'var(--bg-input)', borderRadius: 4, fontSize: 10,
                    }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {a.ora?.slice(0, 5) ?? '—'} {a.tipo}
                      </div>
                      {a.obiettivo && (
                        <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                          {a.obiettivo.slice(0, 28)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="card" style={{ padding: 14, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, marginBottom: 20 }}>
        {Object.entries(TIPO_COL).map(([t, col]) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: col }} />
            <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{t.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      <Link href="/dashboard/allenatore" className="btn btn-secondary btn-sm">← Dashboard</Link>

      {/* Modal nuovo allenamento */}
      <Modal open={openModal} onClose={() => { setOpenModal(false); resetForm() }} title="Nuovo allenamento" width={520}>
        <form onSubmit={salva}>
          {squadre.length > 1 && (
            <FormField label="Squadra">
              <Select value={sqSel} onChange={setSqSel}
                options={squadre.map(s => ({ value: s.id, label: s.nome }))} />
            </FormField>
          )}
          <FormGrid cols={2}>
            <FormField label="Data" required>
              <input className="input" type="date" value={data} onChange={e => setData(e.target.value)} required />
            </FormField>
            <FormField label="Ora">
              <input className="input" type="time" value={ora} onChange={e => setOra(e.target.value)} />
            </FormField>
          </FormGrid>
          <FormField label="Tipo">
            <Select value={tipo} onChange={setTipo} options={TIPI_ALL} />
          </FormField>
          <FormField label="Campo / Luogo">
            <input className="input" value={luogo} onChange={e => setLuogo(e.target.value)} placeholder="es. Campo principale" />
          </FormField>
          <FormField label="Obiettivo" hint="es. Lavoro pressing alto, transizioni">
            <input className="input" value={obiettivo} onChange={e => setObiettivo(e.target.value)} placeholder="Obiettivo della sessione" />
          </FormField>
          <FormField label="Esercizi / Note">
            <textarea className="input" value={note} onChange={e => setNote(e.target.value)} rows={3} style={{ resize: 'vertical' }} placeholder="Esercizi pianificati..." />
          </FormField>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => { setOpenModal(false); resetForm() }}>
              Annulla
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvo...' : 'Aggiungi al calendario'}
            </button>
          </div>
          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            Vuoi anche registrare le presenze?{' '}
            <Link href="/dashboard/allenatore/allenamenti/nuovo" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
              Crea sessione con registro →
            </Link>
          </div>
        </form>
      </Modal>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
