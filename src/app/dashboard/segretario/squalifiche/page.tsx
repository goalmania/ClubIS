'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal, Toast } from '@/components/ui'
import Link from 'next/link'

interface Squalifica {
  id: string
  giocatore_id: string
  motivo: string | null
  partite_restanti: number
  giornate_squalifica: number | null
  data_inizio: string | null
  data_fine: string | null
  comunicato_figc: string | null
  giocatori: { nome: string; cognome: string; numero_maglia: number | null } | null
}

interface GiocatoreOption {
  id: string
  nome: string
  cognome: string
  numero_maglia: number | null
}

const today = new Date().toISOString().split('T')[0]

export default function SqualifichePage() {
  const supabase = createClient()
  const [clubId, setClubId] = useState<string | null>(null)
  const [squadreIds, setSquadreIds] = useState<string[]>([])
  const [squalifiche, setSqualifiche] = useState<Squalifica[]>([])
  const [giocatori, setGiocatori] = useState<GiocatoreOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [form, setForm] = useState({
    giocatore_id: '',
    comunicato_figc: '',
    data_inizio: today,
    giornate: 1,
    motivo: '',
  })

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
    if (!utente) return
    setClubId(utente.club_id)

    const [{ data: sq }, { data: tess }, { data: sqd }] = await Promise.all([
      supabase
        .from('squalifiche')
        .select('id, giocatore_id, motivo, partite_restanti, giornate_squalifica, data_inizio, data_fine, comunicato_figc, giocatori(nome, cognome, numero_maglia)')
        .eq('club_id', utente.club_id)
        .or(`partite_restanti.gt.0,data_fine.gte.${today}`)
        .order('data_inizio', { ascending: false }),
      supabase
        .from('tesseramenti')
        .select('numero_maglia, giocatori(id, nome, cognome)')
        .eq('club_id', utente.club_id)
        .eq('stato', 'attivo'),
      supabase
        .from('squadre')
        .select('id')
        .eq('club_id', utente.club_id),
    ])

    setSqualifiche((sq ?? []) as unknown as Squalifica[])
    setSquadreIds((sqd ?? []).map((s: any) => s.id))
    setGiocatori(
      (tess ?? [])
        .map((t: any) => ({
          id: t.giocatori?.id,
          nome: t.giocatori?.nome,
          cognome: t.giocatori?.cognome,
          numero_maglia: t.numero_maglia ?? null,
        }))
        .filter((g: any) => g.id)
    )
    setLoading(false)
  }

  const calcDataFine = async (dataInizio: string, nGiornate: number): Promise<string | null> => {
    if (!squadreIds.length) return null
    const { data } = await supabase
      .from('partite')
      .select('data_ora')
      .in('squadra_id', squadreIds)
      .gt('data_ora', `${dataInizio}T23:59:59`)
      .order('data_ora')
      .limit(nGiornate)
    if (!data || data.length < nGiornate) return null
    return data[nGiornate - 1].data_ora.split('T')[0]
  }

  const handleSubmit = async () => {
    if (!form.giocatore_id || !form.data_inizio || form.giornate < 1) {
      setToast({ msg: 'Giocatore, data inizio e giornate sono obbligatori', tipo: 'error' })
      return
    }
    if (!clubId) return
    setSaving(true)

    const dataFine = await calcDataFine(form.data_inizio, form.giornate)

    const { error } = await supabase.from('squalifiche').insert({
      club_id: clubId,
      giocatore_id: form.giocatore_id,
      motivo: form.motivo || null,
      partite_restanti: form.giornate,
      giornate_squalifica: form.giornate,
      data_inizio: form.data_inizio,
      data_fine: dataFine,
      comunicato_figc: form.comunicato_figc || null,
    })

    setSaving(false)
    if (error) {
      setToast({ msg: error.message, tipo: 'error' })
    } else {
      setToast({ msg: 'Squalifica inserita', tipo: 'success' })
      setModalOpen(false)
      setForm({ giocatore_id: '', comunicato_figc: '', data_inizio: today, giornate: 1, motivo: '' })
      init()
    }
  }

  const segnaRientro = async (id: string) => {
    const { error } = await supabase
      .from('squalifiche')
      .update({ partite_restanti: 0, giornate_rimanenti: 0 })
      .eq('id', id)
    if (error) {
      setToast({ msg: error.message, tipo: 'error' })
    } else {
      setToast({ msg: 'Rientro registrato', tipo: 'success' })
      setSqualifiche(prev => prev.filter(s => s.id !== id))
    }
  }

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Caricamento…</div>
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Squalifiche</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            Gestione squalifiche FIGC — giocatori non disponibili per squalifica
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/dashboard/allenatore/indisponibili" className="btn btn-ghost btn-sm">
            Vista allenatore
          </Link>
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
            + Inserisci squalifica
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {squalifiche.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nessuna squalifica attiva
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)' }}>
                <th style={th}>Giocatore</th>
                <th style={th}>Comunicato FIGC</th>
                <th style={th}>Inizio</th>
                <th style={th}>Fine prevista</th>
                <th style={{ ...th, textAlign: 'center' }}>Giornate</th>
                <th style={{ ...th, textAlign: 'center' }}>Rimanenti</th>
                <th style={{ ...th, textAlign: 'right' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {squalifiche.map(s => {
                const g = s.giocatori
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {g?.numero_maglia != null && (
                          <span style={{
                            width: 22, height: 22, borderRadius: 4,
                            background: 'var(--bg-input)',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
                            flexShrink: 0,
                          }}>
                            {g.numero_maglia}
                          </span>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {g?.cognome} {g?.nome}
                          </div>
                          {s.motivo && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                              {s.motivo}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                      {s.comunicato_figc ?? '—'}
                    </td>
                    <td style={td}>
                      {s.data_inizio
                        ? new Date(s.data_inizio).toLocaleDateString('it-IT')
                        : '—'}
                    </td>
                    <td style={td}>
                      {s.data_fine
                        ? new Date(s.data_fine).toLocaleDateString('it-IT')
                        : '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span className="badge badge-grigio">{s.giornate_squalifica ?? '—'}</span>
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span className={`badge ${(s.partite_restanti ?? 0) > 0 ? 'badge-rosso' : 'badge-verde'}`}>
                        {s.partite_restanti ?? 0}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      {(s.partite_restanti ?? 0) > 0 && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11 }}
                          onClick={() => segnaRientro(s.id)}
                        >
                          Segna rientro
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} title="Inserisci squalifica" onClose={() => setModalOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Giocatore *</label>
            <select
              className="input"
              style={{ width: '100%', marginTop: 4 }}
              value={form.giocatore_id}
              onChange={e => setForm(f => ({ ...f, giocatore_id: e.target.value }))}
            >
              <option value="">Seleziona giocatore…</option>
              {[...giocatori]
                .sort((a, b) => a.cognome.localeCompare(b.cognome))
                .map(g => (
                  <option key={g.id} value={g.id}>
                    {g.numero_maglia != null ? `#${g.numero_maglia} ` : ''}{g.cognome} {g.nome}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">N° comunicato FIGC</label>
              <input
                className="input"
                style={{ width: '100%', marginTop: 4 }}
                value={form.comunicato_figc}
                onChange={e => setForm(f => ({ ...f, comunicato_figc: e.target.value }))}
                placeholder="es. 123/2026"
              />
            </div>
            <div>
              <label className="label">Data inizio *</label>
              <input
                className="input"
                type="date"
                style={{ width: '100%', marginTop: 4 }}
                value={form.data_inizio}
                onChange={e => setForm(f => ({ ...f, data_inizio: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="label">N° giornate *</label>
            <input
              className="input"
              type="number"
              min={1}
              style={{ width: '100%', marginTop: 4 }}
              value={form.giornate}
              onChange={e => setForm(f => ({ ...f, giornate: Math.max(1, parseInt(e.target.value) || 1) }))}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              La data fine sarà la {form.giornate}ª partita successiva alla data inizio
            </div>
          </div>

          <div>
            <label className="label">Motivo</label>
            <textarea
              className="input"
              style={{ width: '100%', marginTop: 4, minHeight: 68, resize: 'vertical' }}
              value={form.motivo}
              onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
              placeholder="Descrizione del comportamento sanzionato…"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>
              Annulla
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Salvataggio…' : 'Inserisci squalifica'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

const th: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  borderBottom: '1px solid var(--border)',
}

const td: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 13,
  verticalAlign: 'middle',
}
