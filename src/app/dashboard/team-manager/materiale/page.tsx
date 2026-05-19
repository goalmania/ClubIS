'use client'
// src/app/dashboard/team-manager/materiale/page.tsx
// Usa API route /api/materiale (non Supabase diretto) → evita errori schema cache + invia notifiche
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Toast } from '@/components/ui'

type MaterialeStato   = 'in_attesa' | 'approvata' | 'consegnata' | 'rifiutata'
type MaterialeUrgenza = 'bassa' | 'media' | 'alta'

type RichiestaMateriale = {
  id: string
  tipo: string | null
  descrizione: string | null
  quantita: number | null
  stato: MaterialeStato
  urgenza?: MaterialeUrgenza | null
  richiedente?: string | null
  data_richiesta: string | null
  note: string | null
}

const STATI: MaterialeStato[]   = ['in_attesa', 'approvata', 'consegnata', 'rifiutata']
const URGENZE: MaterialeUrgenza[] = ['bassa', 'media', 'alta']

const URGENZA_META: Record<MaterialeUrgenza, { label: string; color: string }> = {
  bassa:  { label: 'Bassa',  color: 'var(--accent-green)' },
  media:  { label: 'Media',  color: 'var(--accent-orange)' },
  alta:   { label: 'Alta',   color: 'var(--accent-red)' },
}

const STATO_META: Record<MaterialeStato, { label: string; color: string; badge: string }> = {
  in_attesa:  { label: 'In attesa',  color: 'var(--accent-orange)', badge: 'badge-ambra' },
  approvata:  { label: 'Approvata',  color: 'var(--accent-blue)',   badge: 'badge-blu'   },
  consegnata: { label: 'Consegnata', color: 'var(--accent-green)',  badge: 'badge-verde'  },
  rifiutata:  { label: 'Rifiutata',  color: 'var(--accent-red)',    badge: 'badge-rosso'  },
}

export default function TMMaterialePage() {
  const supabase = useRef(createClient()).current
  const [rows, setRows]                   = useState<RichiestaMateriale[]>([])
  const [catalogo, setCatalogo]           = useState<string[]>([])
  const [richiedente, setRichiedente]     = useState('')
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [savingId, setSavingId]           = useState<string | null>(null)
  const [filtroStato, setFiltroStato]     = useState<'tutti' | MaterialeStato>('tutti')
  const [showForm, setShowForm]           = useState(false)
  const [toast, setToast]                 = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [form, setForm]                   = useState({
    tipo:      '',
    quantita:  1,
    urgenza:   'media' as MaterialeUrgenza,
    note:      '',
  })

  // Carica nome del TM loggato (solo una volta)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/auth/login'; return }
      supabase.from('utenti').select('nome, cognome').eq('id', user.id).single().then(({ data }) => {
        setRichiedente(data ? `${data.nome ?? ''} ${data.cognome ?? ''}`.trim() : user.email ?? '')
      })
    })
  }, [supabase])

  const carica = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/materiale')
    const json = await res.json()
    const normalized = ((json.richieste ?? []) as any[]).map(r => ({
      ...r,
      stato: (STATI.includes(r.stato) ? r.stato : 'in_attesa') as MaterialeStato,
    }))
    setRows(normalized)
    setCatalogo(Array.from(new Set(normalized.map((r: any) => (r.tipo ?? '').trim()).filter(Boolean))))
    setLoading(false)
  }, [])

  useEffect(() => { carica() }, [carica])

  const salvaRichiesta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.tipo.trim()) {
      setToast({ msg: 'Inserisci il tipo di materiale', tipo: 'error' }); return
    }
    setSaving(true)
    const res = await fetch('/api/materiale', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        tipo:        form.tipo.trim(),
        quantita:    form.quantita,
        urgenza:     form.urgenza,
        richiedente: richiedente,
        note:        form.note.trim() || null,
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) {
      setToast({ msg: json.error ?? 'Errore salvataggio', tipo: 'error' }); return
    }
    setRows(prev => [json.richiesta, ...prev])
    setCatalogo(prev => Array.from(new Set([...prev, json.richiesta.tipo].filter(Boolean))))
    setForm({ tipo: '', quantita: 1, urgenza: 'media', note: '' })
    setShowForm(false)
    setToast({ msg: '✓ Richiesta inviata — notifica inviata a presidente e segreteria', tipo: 'success' })
  }

  const aggiornaStato = async (id: string, stato: MaterialeStato) => {
    setSavingId(id)
    const res = await fetch(`/api/materiale?id=${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ stato }),
    })
    setSavingId(null)
    if (!res.ok) { setToast({ msg: 'Errore aggiornamento stato', tipo: 'error' }); return }
    setRows(prev => prev.map(r => r.id === id ? { ...r, stato } : r))
  }

  const visibili = filtroStato === 'tutti' ? rows : rows.filter(r => r.stato === filtroStato)
  const byStato  = Object.fromEntries(STATI.map(s => [s, rows.filter(r => r.stato === s)])) as Record<MaterialeStato, RichiestaMateriale[]>

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
            Materiale sportivo
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            Richieste inventario — notifiche automatiche a presidenza e segreteria
          </p>
        </div>
        <button data-onboarding="btn-aggiungi-materiale" className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Chiudi' : '+ Nuova richiesta'}
        </button>
      </div>

      {/* Form nuova richiesta */}
      {showForm && (
        <form className="card" style={{ marginBottom: 20, padding: '18px 20px' }} onSubmit={salvaRichiesta}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 14 }}>
            📦 Nuova richiesta materiale
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 140px', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Tipo di materiale *</label>
              <input
                className="input"
                value={form.tipo}
                onChange={e => setForm(v => ({ ...v, tipo: e.target.value }))}
                list="catalogo-materiale"
                placeholder="Es. Palloni, Casacche, Coni..."
                required
              />
              <datalist id="catalogo-materiale">
                {catalogo.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label style={labelStyle}>Quantità</label>
              <input
                className="input"
                type="number"
                min={1}
                value={form.quantita}
                onChange={e => setForm(v => ({ ...v, quantita: Math.max(1, parseInt(e.target.value) || 1) }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Urgenza</label>
              <select
                className="input"
                value={form.urgenza}
                onChange={e => setForm(v => ({ ...v, urgenza: e.target.value as MaterialeUrgenza }))}
              >
                {URGENZE.map(u => (
                  <option key={u} value={u}>{URGENZA_META[u].label}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Note aggiuntive</label>
            <textarea
              className="input"
              rows={2}
              style={{ resize: 'vertical' }}
              value={form.note}
              onChange={e => setForm(v => ({ ...v, note: e.target.value }))}
              placeholder="Motivazione, urgenza, dettagli specifici..."
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              🔔 Verrà inviata notifica a presidente e segreteria
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>
                Annulla
              </button>
              <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
                {saving ? 'Invio in corso...' : 'Invia richiesta'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* KPI per stato */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {STATI.map(s => (
          <div
            key={s}
            className="stat-card"
            style={{ cursor: 'pointer', borderBottom: filtroStato === s ? `2px solid ${STATO_META[s].color}` : undefined }}
            onClick={() => setFiltroStato(filtroStato === s ? 'tutti' : s)}
          >
            <div className="stat-label">{STATO_META[s].label}</div>
            <div className="stat-value" style={{ color: STATO_META[s].color }}>{byStato[s]?.length ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Filtri tab */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <button
          className={`btn btn-sm ${filtroStato === 'tutti' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFiltroStato('tutti')}
        >
          Tutti ({rows.length})
        </button>
        {STATI.map(s => (
          <button
            key={s}
            className={`btn btn-sm ${filtroStato === s ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFiltroStato(s)}
          >
            {STATO_META[s].label}
          </button>
        ))}
      </div>

      {/* Lista richieste */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Caricamento...</div>
        ) : visibili.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
            Nessuna richiesta {filtroStato !== 'tutti' ? `con stato "${STATO_META[filtroStato as MaterialeStato]?.label}"` : ''}
          </div>
        ) : (
          visibili.map(m => {
            const urgenza = (m.urgenza ?? 'media') as MaterialeUrgenza
            return (
              <div
                key={m.id}
                style={{
                  padding: '13px 18px',
                  borderBottom: '1px solid var(--border-light)',
                  borderLeft: `3px solid ${URGENZA_META[urgenza].color}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {m.descrizione ?? m.tipo}
                      </span>
                      <span className={`badge ${STATO_META[m.stato].badge}`}>{STATO_META[m.stato].label}</span>
                      <span style={{ fontSize: 11, color: URGENZA_META[urgenza].color, fontWeight: 600 }}>
                        ● {URGENZA_META[urgenza].label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Qty: <strong>{m.quantita ?? 1}</strong>
                      {m.richiedente && <> · {m.richiedente}</>}
                      {m.data_richiesta && (
                        <> · {new Date(m.data_richiesta).toLocaleDateString('it-IT')}</>
                      )}
                    </div>
                    {m.note && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                        {m.note}
                      </div>
                    )}
                  </div>
                  <select
                    className="input"
                    style={{ width: 150, height: 34, fontSize: 12 }}
                    value={m.stato}
                    disabled={savingId === m.id}
                    onChange={e => aggiornaStato(m.id, e.target.value as MaterialeStato)}
                  >
                    {STATI.map(s => <option key={s} value={s}>{STATO_META[s].label}</option>)}
                  </select>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <Link href="/dashboard/team-manager" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 5,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}
