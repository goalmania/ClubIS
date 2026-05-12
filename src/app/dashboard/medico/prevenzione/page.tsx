'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal, Toast } from '@/components/ui'
import Link from 'next/link'

export default function MedicoPrevenzionePage() {
  const supabase = createClient()
  const [clubId, setClubId] = useState<string | null>(null)
  const [infortuni, setInfortuni] = useState<any[]>([])
  const [protocolli, setProtocolli] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [form, setForm] = useState({ titolo: '', area: '', frequenza: '', descrizione: '', attivo: true })

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
    if (!utente) return
    setClubId(utente.club_id)

    const [{ data: inf }, { data: prot }] = await Promise.all([
      supabase.from('infortuni').select('zona_corpo, gravita, data_infortunio').eq('club_id', utente.club_id),
      supabase.from('protocolli_prevenzione').select('id, titolo, descrizione, area, frequenza, attivo').eq('club_id', utente.club_id).order('attivo', { ascending: false }),
    ])
    setInfortuni(inf ?? [])
    setProtocolli(prot ?? [])
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!form.titolo.trim() || !clubId) {
      setToast({ msg: 'Il titolo è obbligatorio', tipo: 'error' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('protocolli_prevenzione').insert({
      club_id: clubId,
      titolo: form.titolo,
      area: form.area || null,
      frequenza: form.frequenza || null,
      descrizione: form.descrizione || null,
      attivo: form.attivo,
    })
    setSaving(false)
    if (error) { setToast({ msg: error.message, tipo: 'error' }); return }
    setToast({ msg: 'Protocollo creato', tipo: 'success' })
    setModalOpen(false)
    setForm({ titolo: '', area: '', frequenza: '', descrizione: '', attivo: true })
    init()
  }

  // Aggregazioni
  const byZona: Record<string, number> = {}
  infortuni.forEach(i => { const z = i.zona_corpo ?? 'altro'; byZona[z] = (byZona[z] ?? 0) + 1 })
  const zone = Object.entries(byZona).sort((a, b) => b[1] - a[1])
  const maxZ = Math.max(...Object.values(byZona), 1)
  const byGrav: Record<string, number> = { lieve: 0, moderato: 0, grave: 0 }
  infortuni.forEach(i => { byGrav[i.gravita] = (byGrav[i.gravita] ?? 0) + 1 })
  const limite = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
  const recenti = infortuni.filter(i => i.data_infortunio >= limite).length

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Caricamento…</div>

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Prevenzione</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Analisi dati infortuni e protocolli preventivi</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>+ Nuovo protocollo</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-label">Infortuni totali</div><div className="stat-value">{infortuni.length}</div><div className="stat-sub">storico completo</div></div>
        <div className="stat-card"><div className="stat-label">Ultimi 90gg</div><div className="stat-value" style={{ color: 'var(--accent-orange)' }}>{recenti}</div><div className="stat-sub">casi registrati</div></div>
        <div className="stat-card"><div className="stat-label">Gravi</div><div className="stat-value" style={{ color: 'var(--accent-red)' }}>{byGrav.grave}</div><div className="stat-sub">{byGrav.moderato} moderati · {byGrav.lieve} lievi</div></div>
        <div className="stat-card"><div className="stat-label">Protocolli attivi</div><div className="stat-value" style={{ color: 'var(--accent-green)' }}>{protocolli.filter(p => p.attivo).length}</div><div className="stat-sub">in applicazione</div></div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Zone del corpo più colpite</div>
        {zone.length === 0
          ? <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nessun dato disponibile</div>
          : zone.map(([z, n]) => (
            <div key={z} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{z.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{n} casi</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(n / maxZ) * 100}%`, background: 'var(--accent-orange)', borderRadius: 3 }} />
              </div>
            </div>
          ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Protocolli di prevenzione</div>
        {protocolli.length === 0
          ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nessun protocollo configurato. Crea il primo per avviare la prevenzione.</div>
          : protocolli.map(p => (
            <div key={p.id} style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{p.titolo}</span>
                <span className={`badge ${p.attivo ? 'badge-verde' : 'badge-grigio'}`}>{p.attivo ? 'Attivo' : 'Sospeso'}</span>
              </div>
              {p.descrizione && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, lineHeight: 1.5 }}>{p.descrizione}</div>}
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {p.area && <span style={{ textTransform: 'capitalize' }}>Area: {p.area}</span>}
                {p.frequenza && <> · Frequenza: {p.frequenza}</>}
              </div>
            </div>
          ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <Link href="/dashboard/medico" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>

      <Modal open={modalOpen} title="Nuovo protocollo di prevenzione" onClose={() => setModalOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Titolo *</label>
            <input className="input" style={{ width: '100%', marginTop: 4 }}
              value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))}
              placeholder="es. Stretching hamstring" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Area anatomica</label>
              <input className="input" style={{ width: '100%', marginTop: 4 }}
                value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                placeholder="es. Ginocchio, Hamstring" />
            </div>
            <div>
              <label className="label">Frequenza</label>
              <input className="input" style={{ width: '100%', marginTop: 4 }}
                value={form.frequenza} onChange={e => setForm(f => ({ ...f, frequenza: e.target.value }))}
                placeholder="es. 3 volte a settimana" />
            </div>
          </div>
          <div>
            <label className="label">Descrizione</label>
            <textarea className="input" rows={3} style={{ width: '100%', marginTop: 4, resize: 'vertical' }}
              value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
              placeholder="Dettagli del protocollo…" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.attivo} onChange={e => setForm(f => ({ ...f, attivo: e.target.checked }))} />
            Attiva subito
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>Annulla</button>
            <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Salvataggio…' : 'Crea protocollo'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
