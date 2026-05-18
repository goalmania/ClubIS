'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Toast } from '@/components/ui'

type StatoRapido = 'presente' | 'assente' | 'giustificato'

export default function TMPresenzePage() {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<any[]>([])
  const [giocatori, setGiocatori] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [clubId, setClubId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    targetType: 'giocatore' as 'giocatore' | 'staff',
    targetId: '',
    stato: 'presente' as StatoRapido,
    nota: '',
  })

  useEffect(() => {
    const load = async () => {
      const [ctxData, giocatoriData, staffData] = await Promise.all([
        fetch('/api/user-context').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/giocatori').then(r => r.json()).catch(() => []),
        fetch('/api/staff?ruoli=team_manager,allenatore,medico,segretario').then(r => r.json()).catch(() => []),
      ])

      if (!ctxData?.clubId) {
        window.location.href = '/auth/login'
        return
      }
      setClubId(ctxData.clubId)

      const { data: pres } = await supabase
        .from('presenze')
        .select('giocatore_id, presente, motivo_assenza, stato')
        .eq('club_id', ctxData.clubId)

      // /api/giocatori ritorna oggetti piatti: { id, nome, cognome, ruolo_principale, numero_maglia, categoria_eta, ... }
      const CATEGORIA_ORDER: Record<string, number> = {
        prima_squadra: 0, primavera: 1, juniores: 2,
        u19: 3, u17: 4, u16: 5, u15: 6, u14: 7,
        u12: 8, u10: 9, u8: 10, u6: 11, femminile: 12,
      }
      const tessArr: any[] = Array.isArray(giocatoriData) ? giocatoriData : []
      const st: any[] = Array.isArray(staffData) ? staffData : []
      const players = tessArr
        .map(g => ({ ...g, categoriaOrder: CATEGORIA_ORDER[g.categoria_eta ?? ''] ?? 99 }))
        .sort((a, b) => {
          if (a.categoriaOrder !== b.categoriaOrder) return a.categoriaOrder - b.categoriaOrder
          return (a.cognome ?? '').localeCompare(b.cognome ?? '')
        })

      const grouped = new Map<string, any[]>()
      ;(pres ?? []).forEach((p: any) => {
        const arr = grouped.get(p.giocatore_id) ?? []
        arr.push(p)
        grouped.set(p.giocatore_id, arr)
      })
      const mapped = players.map((g: any) => {
        const pr = grouped.get(g.id) ?? []
        const tot = pr.length
        const presenti = pr.filter((p: any) => p.presente).length
        const assenti = pr.filter((p: any) => !p.presente).length
        const giustificate = pr.filter((p: any) => !p.presente && p.stato === 'giustificato').length
        const pct = tot > 0 ? Math.round((presenti / tot) * 100) : 0
        return { ...g, tot, presenti, assenti, giustificate, pct }
      })

      setRows(mapped)
      setGiocatori(players)
      setStaff(st ?? [])
      setLoading(false)
    }
    load()
  }, [supabase, refreshKey])

  const salvaRapida = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.targetId) {
      setToast({ msg: 'Seleziona un nominativo', tipo: 'error' })
      return
    }
    setSaving(true)
    const ctxData = await fetch('/api/user-context').then(r => r.json()).catch(() => null)

    const payload: any = {
      club_id: clubId,
      data: form.data,
      stato: form.stato,
      note: form.nota || null,
      registrato_da: ctxData?.userId ?? null,
      presente: form.stato === 'presente',
      motivo_assenza: form.stato === 'assente' ? 'non_giustificata' : null,
    }

    if (form.targetType === 'giocatore') payload.giocatore_id = form.targetId
    else payload.staff_id = form.targetId

    const { error } = await supabase.from('presenze').insert(payload)
    setSaving(false)
    if (error) {
      setToast({ msg: error.message, tipo: 'error' })
      return
    }

    setShowForm(false)
    setForm(prev => ({ ...prev, targetId: '', stato: 'presente', nota: '' }))
    setToast({ msg: 'Presenza registrata', tipo: 'success' })
    setRefreshKey(k => k + 1)
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Presenze</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Riepilogo presenze agli allenamenti per giocatore</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>+ </button>
      </div>

      {showForm && (
        <form className="card" style={{ marginBottom: 16, padding: 14 }} onSubmit={salvaRapida}>
          <div style={{ display: 'grid', gridTemplateColumns: '130px 140px 1fr 160px', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>Data</label>
              <input type="date" className="input" value={form.data} onChange={e => setForm(v => ({ ...v, data: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select className="input" value={form.targetType} onChange={e => setForm(v => ({ ...v, targetType: e.target.value as 'giocatore' | 'staff', targetId: '' }))}>
                <option value="giocatore">Giocatore</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Giocatore/Staff</label>
              <select className="input" value={form.targetId} onChange={e => setForm(v => ({ ...v, targetId: e.target.value }))}>
                <option value="">Seleziona...</option>
                {(form.targetType === 'giocatore' ? giocatori : staff).map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.cognome} {r.nome} {r.ruolo ? `(${r.ruolo})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Stato</label>
              <select className="input" value={form.stato} onChange={e => setForm(v => ({ ...v, stato: e.target.value as StatoRapido }))}>
                <option value="presente">presente</option>
                <option value="assente">assente</option>
                <option value="giustificato">giustificato</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Nota</label>
            <textarea className="input" rows={2} value={form.nota} onChange={e => setForm(v => ({ ...v, nota: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Salvataggio...' : 'Registra'}</button>
          </div>
        </form>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-input)' }}>
              <th style={thStyle}>Giocatore</th>
              <th style={thStyle}>Ruolo</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Presente</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Ritardo</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Assente</th>
              <th style={thStyle}>%</th>
            </tr>
          </thead>
          <tbody>
            {loading || rows.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Nessun giocatore</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--border-light)' }}>
                <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--text-primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {r.numero_maglia && (
                      <div style={{ width: 24, height: 24, borderRadius: 4, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {r.numero_maglia}
                      </div>
                    )}
                    {r.cognome} {r.nome}
                  </div>
                </td>
                <td style={{ ...tdStyle, fontSize: 12, textTransform: 'capitalize' }}>{r.ruolo_principale?.replace('_', ' ') ?? '—'}</td>
                <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--accent-green)', fontWeight: 600 }}>{r.presenti}</td>
                <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--accent-orange)' }}>{r.giustificate}</td>
                <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--accent-red)' }}>{r.assenti}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${r.pct}%`,
                        background: r.pct >= 80 ? 'var(--accent-green)' : r.pct >= 60 ? 'var(--accent-orange)' : 'var(--accent-red)',
                      }} />
                    </div>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, minWidth: 36, textAlign: 'right', color: 'var(--text-primary)' }}>{r.pct}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20 }}>
        <Link href="/dashboard/team-manager" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }
const tdStyle: React.CSSProperties = { padding: '12px 14px', fontSize: 13, color: 'var(--text-secondary)' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }
