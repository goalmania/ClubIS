'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Toast } from '@/components/ui'

type Messaggio = {
  id: string
  titolo: string
  corpo: string | null
  tipo: string
  tipo_comunicazione: string | null
  fissato: boolean | null
  data_scadenza_post: string | null
  visibile_a: string[] | null
  allegati: { nome: string; url: string; tipo: string }[] | null
  inviato_at: string
  club_id: string
  utenti: { nome: string; cognome: string; ruolo: string } | null
}

const RUOLO_COLORE: Record<string, string> = {
  presidente: 'var(--accent)', ds: '#88aaff', segretario: 'var(--verde)',
  allenatore: '#f97316', medico: '#ec4899', osservatore: '#a855f7',
  team_manager: '#06b6d4', famiglia: 'var(--gray)',
}

const TIPO_BADGE: Record<string, { label: string; color: string }> = {
  comunicazione: { label: 'Comunicazione', color: '#3b82f6' },
  avviso:        { label: 'Avviso',        color: 'var(--rosso)' },
  alert_tecnico: { label: 'Alert',         color: '#f97316' },
  convocazione:  { label: 'Convocazione',  color: 'var(--verde)' },
  bacheca_post:  { label: 'Post',          color: 'var(--accent)' },
  annuncio:      { label: 'Annuncio',      color: '#a855f7' },
  messaggio:     { label: 'Messaggio',     color: 'var(--gray)' },
}

const EMPTY_FORM = {
  titolo: '', corpo: '', tipo: 'comunicazione', tipo_comunicazione: 'bacheca_post',
  fissato: false, data_scadenza_post: '', visibile_a: ['tutti'],
}

export default function MessaggiPage() {
  const supabase = createClient()
  const [tab,        setTab]        = useState<'bacheca' | 'messaggi'>('bacheca')
  const [clubId,     setClubId]     = useState<string | null>(null)
  const [userId,     setUserId]     = useState<string | null>(null)
  const [messaggi,   setMessaggi]   = useState<Messaggio[]>([])
  const [loading,    setLoading]    = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)
  const [toast,      setToast]      = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [expanded,   setExpanded]   = useState<Set<string>>(new Set())
  const [allegati,   setAllegati]   = useState<{ nome: string; url: string; tipo: string }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: u } = await supabase.from('utenti').select('club_id, ruolo').eq('id', user.id).single()
      if (!u) return
      setClubId(u.club_id)
      await reload(u.club_id)
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const reload = async (cid: string) => {
    const { data, error } = await supabase
      .from('messaggi')
      .select('*, utenti!mittente_id(nome, cognome, ruolo)')
      .eq('club_id', cid)
      .order('fissato', { ascending: false })
      .order('inviato_at', { ascending: false })
      .limit(100)
    if (error) {
      if (error.message?.includes('fissato')) {
        const { data: data2 } = await supabase
          .from('messaggi')
          .select('*, utenti!mittente_id(nome, cognome, ruolo)')
          .eq('club_id', cid)
          .order('inviato_at', { ascending: false })
          .limit(100)
        setMessaggi((data2 ?? []) as Messaggio[])
        return
      }
      setToast({ msg: `Errore caricamento: ${error.message}`, tipo: 'error' })
      return
    }
    setMessaggi((data ?? []) as Messaggio[])
  }

  const bacheca  = messaggi.filter(m => m.tipo_comunicazione === 'bacheca_post' || m.tipo_comunicazione === 'annuncio')
  const fissati  = bacheca.filter(m => m.fissato)
  const normali  = bacheca.filter(m => !m.fissato && (!m.data_scadenza_post || new Date(m.data_scadenza_post) >= new Date()))
  const soli_msg = messaggi.filter(m => !m.tipo_comunicazione || m.tipo_comunicazione === 'messaggio')

  const toggleExpand = (id: string) => setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const pubblica = async () => {
    if (!clubId || !userId || !form.titolo.trim()) return
    setSaving(true)
    const { error } = await supabase.from('messaggi').insert({
      club_id: clubId, mittente_id: userId,
      titolo: form.titolo.trim(), corpo: form.corpo.trim() || null,
      tipo: form.tipo, tipo_comunicazione: form.tipo_comunicazione,
      fissato: form.fissato,
      data_scadenza_post: form.data_scadenza_post || null,
      visibile_a: form.visibile_a, allegati,
      inviato_at: new Date().toISOString(),
    })
    setSaving(false)
    if (error) {
      setToast({ msg: error.message, tipo: 'error' })
      return
    }
    await reload(clubId)
    setDrawerOpen(false); setForm(EMPTY_FORM); setAllegati([])
    setTab(form.tipo_comunicazione === 'messaggio' ? 'messaggi' : 'bacheca')
    setToast({ msg: 'Pubblicato ✓', tipo: 'success' })
  }

  const fixPost = async (id: string, fissato: boolean | null) => {
    if (!clubId) return
    await supabase.from('messaggi').update({ fissato: !fissato }).eq('id', id)
    await reload(clubId)
  }

  const eliminaPost = async (id: string) => {
    if (!clubId || !confirm('Eliminare questo post?')) return
    await supabase.from('messaggi').delete().eq('id', id)
    setMessaggi(prev => prev.filter(m => m.id !== id))
  }

  const uploadFile = async (file: File) => {
    const name = `bacheca/${clubId}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('messaggi-allegati').upload(name, file)
    if (error) return null
    const { data: { publicUrl } } = supabase.storage.from('messaggi-allegati').getPublicUrl(name)
    return { nome: file.name, url: publicUrl, tipo: file.type.startsWith('image/') ? 'immagine' : 'file' }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--gray)' }}>Caricamento...</div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)', marginBottom: 4 }}>
            Comunicazioni
          </h1>
          <p style={{ fontSize: 13, color: 'var(--gray)' }}>{bacheca.length} post · {soli_msg.length} messaggi</p>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setAllegati([]); setDrawerOpen(true) }} className="btn btn-primary btn-sm">
          + Pubblica
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-solid)', marginBottom: 20 }}>
        {([{ key: 'bacheca', label: `Bacheca (${bacheca.length})` }, { key: 'messaggi', label: `Messaggi (${soli_msg.length})` }] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '9px 20px', background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`,
            color: tab === t.key ? 'var(--accent)' : 'var(--gray)', fontSize: 13,
            fontWeight: tab === t.key ? 700 : 400, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── BACHECA ── */}
      {tab === 'bacheca' && (
        <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fissati.length === 0 && normali.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--gray)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📌</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', color: 'var(--white)', marginBottom: 6 }}>Bacheca vuota</div>
              <div style={{ fontSize: 13, marginBottom: 20 }}>Pubblica il primo annuncio per il club.</div>
              <button onClick={() => { setForm({ ...EMPTY_FORM, tipo_comunicazione: 'bacheca_post' }); setDrawerOpen(true) }} className="btn btn-primary btn-sm">+ Primo post</button>
            </div>
          )}
          {fissati.length > 0 && (
            <>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>📌 Fissati</div>
              {fissati.map(m => <PostCard key={m.id} m={m} expanded={expanded.has(m.id)} onToggle={toggleExpand} onFix={fixPost} onDelete={eliminaPost} />)}
            </>
          )}
          {normali.length > 0 && (
            <>
              {fissati.length > 0 && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gray)', margin: '8px 0 4px' }}>Recenti</div>}
              {normali.map(m => <PostCard key={m.id} m={m} expanded={expanded.has(m.id)} onToggle={toggleExpand} onFix={fixPost} onDelete={eliminaPost} />)}
            </>
          )}
        </div>
      )}

      {/* ── MESSAGGI ── */}
      {tab === 'messaggi' && (
        <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {soli_msg.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✉</div>
              <div style={{ fontSize: 14, color: 'var(--white)' }}>Nessun messaggio</div>
            </div>
          )}
          {soli_msg.map(m => {
            const mitt = m.utenti
            const tb = TIPO_BADGE[m.tipo] ?? { label: m.tipo, color: 'var(--gray)' }
            return (
              <div key={m.id} style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: mitt ? `${RUOLO_COLORE[mitt.ruolo] ?? 'var(--gray)'}22` : '#1a1a1a', border: `1px solid ${mitt ? RUOLO_COLORE[mitt.ruolo] ?? 'var(--border-solid)' : 'var(--border-solid)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 12, color: mitt ? RUOLO_COLORE[mitt.ruolo] ?? 'var(--white)' : 'var(--white)' }}>
                    {mitt?.nome?.[0]}{mitt?.cognome?.[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--white)' }}>{m.titolo}</span>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: tb.color, background: `${tb.color}18`, padding: '2px 6px', borderRadius: 2 }}>{tb.label}</span>
                    </div>
                    {m.corpo && <p style={{ fontSize: 12, color: 'var(--gray)', margin: 0, lineHeight: 1.6 }}>{m.corpo}</p>}
                    <div style={{ fontSize: 11, color: '#444', marginTop: 6, display: 'flex', gap: 10 }}>
                      {mitt && <span>{mitt.nome} {mitt.cognome}</span>}
                      <span>{new Date(m.inviato_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Drawer nuovo post ── */}
      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 900, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setDrawerOpen(false)}>
          <div style={{ width: 460, background: '#111', borderLeft: '1px solid var(--border-solid)', height: '100%', overflowY: 'auto', padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', color: 'var(--white)' }}>Nuova comunicazione</div>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--gray)', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="label">Tipo comunicazione</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {([{ key: 'bacheca_post', label: '📌 Post' }, { key: 'annuncio', label: '📢 Annuncio' }, { key: 'messaggio', label: '✉ Messaggio' }] as const).map(t => (
                  <button key={t.key} onClick={() => setForm(p => ({ ...p, tipo_comunicazione: t.key }))} style={{ padding: '6px 12px', borderRadius: 2, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', border: '1px solid', background: form.tipo_comunicazione === t.key ? 'var(--accent)' : 'transparent', borderColor: form.tipo_comunicazione === t.key ? 'var(--accent)' : 'var(--border-solid)', color: form.tipo_comunicazione === t.key ? '#000' : 'var(--gray)' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="label">Titolo *</label>
              <input className="input" value={form.titolo} onChange={e => setForm(p => ({ ...p, titolo: e.target.value }))} placeholder="Oggetto o titolo del post" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Corpo</label>
              <textarea className="input" rows={5} value={form.corpo} onChange={e => setForm(p => ({ ...p, corpo: e.target.value }))} placeholder="Testo completo..." style={{ resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Visibile a</label>
              <select className="input" value={form.visibile_a[0]} onChange={e => setForm(p => ({ ...p, visibile_a: [e.target.value] }))} style={{ background: '#1a1a1a', color: 'var(--white)' }}>
                <option value="tutti">Tutto il club</option>
                <option value="famiglia">Solo famiglie</option>
                <option value="staff">Solo staff tecnico</option>
                <option value="allenatore">Solo allenatori</option>
                <option value="medico">Solo staff medico</option>
              </select>
            </div>

            {(form.tipo_comunicazione === 'bacheca_post' || form.tipo_comunicazione === 'annuncio') && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <input type="checkbox" checked={form.fissato} onChange={e => setForm(p => ({ ...p, fissato: e.target.checked }))} style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
                  <label style={{ fontSize: 13, color: 'var(--white)', cursor: 'pointer' }}>📌 Fissa in cima alla bacheca</label>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="label">Scadenza post (opz.)</label>
                  <input className="input" type="date" value={form.data_scadenza_post} onChange={e => setForm(p => ({ ...p, data_scadenza_post: e.target.value }))} />
                </div>
              </>
            )}

            <div style={{ marginBottom: 20 }}>
              <label className="label">Allegati</label>
              {allegati.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12, color: 'var(--white)' }}>
                  <span>{a.tipo === 'immagine' ? '🖼' : '📎'} {a.nome}</span>
                  <button onClick={() => setAllegati(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer' }}>×</button>
                </div>
              ))}
              <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={async e => {
                const files = Array.from(e.target.files ?? [])
                const results = await Promise.all(files.map(uploadFile))
                setAllegati(prev => [...prev, ...(results.filter(Boolean) as typeof allegati)])
              }} />
              <button onClick={() => fileRef.current?.click()} className="btn btn-secondary btn-sm">+ Allegato</button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDrawerOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>Annulla</button>
              <button onClick={pubblica} disabled={saving || !form.titolo.trim()} className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                {saving ? 'Pubblicazione...' : '📢 Pubblica'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

function PostCard({ m, expanded, onToggle, onFix, onDelete }: {
  m: Messaggio; expanded: boolean
  onToggle: (id: string) => void
  onFix: (id: string, fissato: boolean | null) => void
  onDelete: (id: string) => void
}) {
  const mitt = m.utenti
  const tbKey = m.tipo_comunicazione ?? m.tipo
  const tb = TIPO_BADGE[tbKey] ?? { label: tbKey, color: 'var(--gray)' }
  const corpo = expanded || !m.corpo ? m.corpo : m.corpo.length > 200 ? m.corpo.slice(0, 200) + '…' : m.corpo
  const inScadenza = m.data_scadenza_post && new Date(m.data_scadenza_post) <= new Date(Date.now() + 3 * 86400000)

  return (
    <div style={{ background: m.fissato ? '#0f110a' : '#111', border: `1px solid ${m.fissato ? 'rgba(200,240,0,0.25)' : 'var(--border-solid)'}`, borderTop: `3px solid ${m.fissato ? 'var(--accent)' : tb.color}`, borderRadius: 2, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: mitt ? `${RUOLO_COLORE[mitt.ruolo] ?? 'var(--gray)'}22` : '#1a1a1a', border: `1px solid ${mitt ? RUOLO_COLORE[mitt.ruolo] ?? 'var(--border-solid)' : 'var(--border-solid)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 13, color: mitt ? RUOLO_COLORE[mitt.ruolo] ?? 'var(--white)' : 'var(--white)' }}>
          {mitt ? `${mitt.nome?.[0] ?? ''}${mitt.cognome?.[0] ?? ''}` : '?'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
            {mitt && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--white)' }}>{mitt.nome} {mitt.cognome}</span>}
            {mitt && <span style={{ fontSize: 10, color: 'var(--gray)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{mitt.ruolo}</span>}
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: tb.color, background: `${tb.color}18`, padding: '2px 6px', borderRadius: 2 }}>{tb.label}</span>
            {m.fissato && <span>📌</span>}
            {inScadenza && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#f97316', background: 'rgba(249,115,22,0.1)', padding: '2px 6px', borderRadius: 2 }}>⏳ scade {new Date(m.data_scadenza_post!).toLocaleDateString('it-IT')}</span>}
          </div>
          <div style={{ fontSize: 11, color: '#555' }}>{new Date(m.inviato_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => onFix(m.id, m.fissato)} title={m.fissato ? 'Rimuovi pin' : 'Fissa'} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border-solid)', borderRadius: 2, color: m.fissato ? 'var(--accent)' : 'var(--gray)', fontSize: 12, cursor: 'pointer' }}>📌</button>
          <button onClick={() => onDelete(m.id)} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border-solid)', borderRadius: 2, color: 'var(--gray)', fontSize: 12, cursor: 'pointer' }}>✕</button>
        </div>
      </div>

      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)', marginBottom: 8, lineHeight: 1.3 }}>{m.titolo}</div>
      {corpo && <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.7, margin: '0 0 6px', whiteSpace: 'pre-wrap' }}>{corpo}</p>}
      {(m.corpo?.length ?? 0) > 200 && (
        <button onClick={() => onToggle(m.id)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-mono)', padding: 0 }}>
          {expanded ? '▲ Comprimi' : '▼ Leggi tutto'}
        </button>
      )}

      {m.allegati && m.allegati.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {m.allegati.map((a, i) => (
            <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: '#1a1a1a', border: '1px solid var(--border-solid)', borderRadius: 2, fontSize: 11, color: 'var(--gray)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
              <span>{a.tipo === 'immagine' ? '🖼' : '📎'}</span><span>{a.nome}</span>
            </a>
          ))}
        </div>
      )}

      {m.visibile_a?.[0] && m.visibile_a[0] !== 'tutti' && (
        <div style={{ marginTop: 10, fontSize: 10, color: '#444', fontFamily: 'var(--font-mono)' }}>👁 Visibile a: {m.visibile_a.join(', ')}</div>
      )}
    </div>
  )
}
