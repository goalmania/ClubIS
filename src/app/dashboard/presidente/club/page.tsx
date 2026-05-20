'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { safeUpdatePayload } from '@/lib/supabase/db'

type Club = {
  id: string
  // Generale
  nome: string
  nome_esteso: string | null
  categoria: string | null
  anno_fondazione: number | null
  logo_url: string | null
  colori_sociali: string | null
  colore_primario: string | null
  colore_secondario: string | null
  colori_maglia_principale: string | null
  colori_maglia_portiere: string | null
  email_ufficiale: string | null
  telefono: string | null
  sito_web: string | null
  note_interne: string | null
  // Dati fiscali
  forma_giuridica: string | null
  codice_fiscale: string | null
  partita_iva: string | null
  pec: string | null
  sdi: string | null
  iban: string | null
  bic: string | null
  intestatario_conto: string | null
  // Indirizzo
  via: string | null
  cap: string | null
  citta: string | null
  provincia: string | null
  regione: string | null
  // Federazioni
  figc_codice: string | null
  coni_codice: string | null
  csi_codice: string | null
  uisp_codice: string | null
  altra_federazione_nome: string | null
  altra_federazione_codice: string | null
  // Legale rappresentante
  legale_rappresentante_nome: string | null
  legale_rappresentante_cf: string | null
  legale_rappresentante_ruolo: string | null
  firma_presidente_url: string | null
  // Social
  social_instagram: string | null
  social_facebook: string | null
  social_twitter: string | null
  social_youtube: string | null
  social_tiktok: string | null
  social_linkedin: string | null
  // Sponsor
  sponsor_principale: string | null
  sponsor_logo_url: string | null
  sponsor_sito: string | null
  sponsor_secondari: { nome: string; sito?: string; logo_url?: string }[]
  // Piano
  piano_abbonamento: string | null
  abbonamento_scadenza: string | null
}

const TABS = [
  { key: 'generale',    label: 'Generale' },
  { key: 'fiscale',     label: 'Dati fiscali' },
  { key: 'indirizzo',   label: 'Indirizzo' },
  { key: 'federazioni', label: 'Federazioni' },
  { key: 'legale',      label: 'Legale & Firma' },
  { key: 'social',      label: 'Social' },
  { key: 'sponsor',     label: 'Sponsor' },
  { key: 'piano',       label: 'Piano ClubIS' },
] as const

type TabKey = typeof TABS[number]['key']

const FORMA_GIURIDICA = [
  { key: 'asd',              label: 'Associazione Sportiva Dilettantistica (ASD)' },
  { key: 'ssd',              label: 'Società Sportiva Dilettantistica (SSD)' },
  { key: 'associazione',     label: 'Associazione Sportiva' },
  { key: 'societa_sportiva', label: 'Società Sportiva' },
  { key: 'altro',            label: 'Altro' },
]

const CATEGORIA_LABEL: Record<string, string> = {
  calcio_11: 'Calcio 11', calcio_5: 'Calcio a 5', calcio_8: 'Calcio a 8',
  basket: 'Basket', pallavolo: 'Pallavolo', tennis: 'Tennis',
  nuoto: 'Nuoto', atletica: 'Atletica', altro: 'Altro',
}

const PIANO_LABEL: Record<string, string> = { base: 'Base', pro: 'Pro', elite: 'Elite' }
const PIANO_COLOR: Record<string, string> = { base: 'var(--gray)', pro: 'var(--accent)', elite: '#88aaff' }

function F({ label, hint, children, full }: { label: string; hint?: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div style={{ marginBottom: 16, gridColumn: full ? '1 / -1' : undefined }}>
      <label className="label">{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{hint}</div>}
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>{children}</div>
  )
}

export default function InfoClubPage() {
  const supabase = createClient()
  const [clubId,   setClubId]   = useState<string | null>(null)
  const [club,     setClub]     = useState<Club | null>(null)
  const [tab,      setTab]      = useState<TabKey>('generale')
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [errore,   setErrore]   = useState('')
  const [canEdit,  setCanEdit]  = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [form,     setForm]     = useState<Partial<Club>>({})
  const fileInput  = useRef<HTMLInputElement>(null)
  const firmaInput = useRef<HTMLInputElement>(null)
  const logoInput  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: u } = await supabase.from('utenti').select('club_id, ruolo').eq('id', user.id).single()
      if (!u) return
      setClubId(u.club_id)
      setCanEdit(['presidente', 'ds', 'segretario'].includes(u.ruolo))
      const { data: c } = await supabase.from('clubs').select('*').eq('id', u.club_id).single()
      if (c) { setClub(c as Club); setForm(c as Club) }
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const salva = async () => {
    if (!clubId) return
    setSaving(true)
    setErrore('')
    const { error } = await supabase.from('clubs').update(safeUpdatePayload(form as Record<string, unknown>)).eq('id', clubId)
    if (error) { setErrore(error.message); setSaving(false); return }
    const { data: c } = await supabase.from('clubs').select('*').eq('id', clubId).single()
    if (c) { setClub(c as Club); setForm(c as Club) }
    setSaving(false)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const ext  = file.name.split('.').pop()
    const name = `${path}/${clubId}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('club-assets').upload(name, file, { upsert: true })
    if (error) return null
    const { data: { publicUrl } } = supabase.storage.from('club-assets').getPublicUrl(name)
    return publicUrl
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validazione client-side rapida
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      alert('Formato non supportato. Usa JPG, PNG, WEBP o SVG')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('File troppo grande. Dimensione massima: 2 MB')
      return
    }

    // Upload via API server-side (bypass RLS storage)
    const form = new FormData()
    form.append('file', file)
    try {
      const res  = await fetch('/api/upload/logo-club', { method: 'POST', body: form })
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      setForm(p => ({ ...p, logo_url: data.url }))
    } catch {
      // Fallback: upload diretto browser
      const url = await uploadFile(file, 'logos')
      if (url) setForm(p => ({ ...p, logo_url: url }))
    }
  }

  const handleFirmaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      alert('Formato non supportato. Usa PNG (consigliato), JPG, WEBP o SVG')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('File troppo grande. Dimensione massima: 2 MB')
      return
    }

    // Upload via API server-side (bypassa RLS storage)
    const form = new FormData()
    form.append('file', file)
    try {
      const res  = await fetch('/api/upload/firma-presidente', { method: 'POST', body: form })
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      setForm(p => ({ ...p, firma_presidente_url: data.url }))
    } catch {
      // Fallback diretto (richiede bucket pubblico già attivo)
      const url = await uploadFile(file, 'firme')
      if (url) setForm(p => ({ ...p, firma_presidente_url: url }))
    }
  }

  const handleSponsorLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadFile(file, 'sponsor')
    if (url) setForm(p => ({ ...p, sponsor_logo_url: url }))
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--gray)' }}>Caricamento...</div>

  const ro = (value: string | number | null | undefined, fallback = '—') =>
    value != null && value !== '' ? String(value) : fallback

  const ReadRow = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-solid)' }}>
      <span style={{ fontSize: 12, color: 'var(--gray)' }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--white)', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' }}>{ro(value)}</span>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {(editing ? form.logo_url : club?.logo_url) ? (
            <img src={(editing ? form.logo_url : club?.logo_url) ?? ''} alt="" style={{ width: 52, height: 52, borderRadius: 4, objectFit: 'contain', background: '#1a1a1a' }} />
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: 4, background: 'rgba(200,240,0,0.15)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--accent)' }}>
              {club?.nome?.[0] ?? '?'}
            </div>
          )}
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)', marginBottom: 2 }}>
              {club?.nome ?? 'Info Club'}
            </h1>
            <p style={{ fontSize: 12, color: 'var(--gray)' }}>
              {club?.forma_giuridica ? FORMA_GIURIDICA.find(f => f.key === club.forma_giuridica)?.label : ''}
              {club?.citta ? ` · ${club.citta}` : ''}
              {club?.anno_fondazione ? ` · Fond. ${club.anno_fondazione}` : ''}
            </p>
          </div>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {saved && <span style={{ fontSize: 12, color: 'var(--verde)', fontFamily: 'var(--font-mono)' }}>✓ Salvato</span>}
            {editing ? (
              <>
                <button onClick={() => { setForm(club ? club : {}); setEditing(false); setErrore('') }} className="btn btn-secondary btn-sm">Annulla</button>
                <button onClick={salva} disabled={saving} className="btn btn-primary btn-sm">
                  {saving ? 'Salvataggio...' : 'Salva'}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="btn btn-secondary btn-sm">Modifica</button>
            )}
          </div>
        )}
      </div>

      {errore && <div style={{ background: 'rgba(255,60,60,0.1)', border: '1px solid var(--rosso)', borderRadius: 2, padding: '10px 14px', fontSize: 13, color: 'var(--rosso)', marginBottom: 16 }}>{errore}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-solid)', marginBottom: 24, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`,
            color: tab === t.key ? 'var(--accent)' : 'var(--gray)', fontSize: 12,
            fontWeight: tab === t.key ? 700 : 400, textTransform: 'uppercase', letterSpacing: '0.06em',
            fontFamily: 'var(--font-mono)', transition: 'color 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 720 }}>
        {/* ── TAB GENERALE ── */}
        {tab === 'generale' && (editing ? (
          <div>
            <div style={{ display: 'flex', gap: 20, marginBottom: 20, alignItems: 'flex-start' }}>
              <div>
                {form.logo_url ? (
                  <img
                    src={form.logo_url} alt="Logo club"
                    style={{ width: 80, height: 80, borderRadius: 4, objectFit: 'contain', background: '#1a1a1a', border: '1px solid var(--border-solid)' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: 4, background: '#1a1a1a', border: '2px dashed var(--border-solid)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray)', fontSize: 24 }}>🏟</div>
                )}
                <input ref={logoInput} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                <button onClick={() => logoInput.current?.click()} style={{ marginTop: 6, padding: '4px 10px', background: 'transparent', border: '1px solid var(--border-solid)', borderRadius: 2, color: 'var(--gray)', fontSize: 10, cursor: 'pointer', width: 80, textAlign: 'center' }}>Cambia logo</button>
              </div>
              <div style={{ flex: 1 }}>
                <Grid>
                  <F label="Nome breve *"><input className="input" value={form.nome ?? ''} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></F>
                  <F label="Nome esteso"><input className="input" value={form.nome_esteso ?? ''} onChange={e => setForm(p => ({ ...p, nome_esteso: e.target.value || null }))} /></F>
                </Grid>
              </div>
            </div>
            <Grid>
              <F label="Forma giuridica">
                <select className="input" value={form.forma_giuridica ?? ''} onChange={e => setForm(p => ({ ...p, forma_giuridica: e.target.value || null }))} style={{ background: '#1a1a1a', color: 'var(--white)' }}>
                  <option value="">— Seleziona —</option>
                  {FORMA_GIURIDICA.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </F>
              <F label="Sport / Categoria">
                <input className="input" value={form.categoria ?? ''} onChange={e => setForm(p => ({ ...p, categoria: e.target.value || null }))} placeholder="es. calcio_11" />
              </F>
              <F label="Anno fondazione">
                <input className="input" type="number" value={form.anno_fondazione ?? ''} onChange={e => setForm(p => ({ ...p, anno_fondazione: parseInt(e.target.value) || null }))} placeholder="es. 1985" />
              </F>
              <F label="Colori sociali">
                <input className="input" value={form.colori_sociali ?? ''} onChange={e => setForm(p => ({ ...p, colori_sociali: e.target.value || null }))} placeholder="es. Blu e Giallo" />
              </F>
              <F label="Colore primario (hex)">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="color" value={form.colore_primario ?? '#1a1a2e'} onChange={e => setForm(p => ({ ...p, colore_primario: e.target.value }))} style={{ width: 44, height: 38, padding: 2, borderRadius: 6, border: '1px solid var(--grigio-5)', cursor: 'pointer' }} />
                  <input className="input" value={form.colore_primario ?? ''} onChange={e => setForm(p => ({ ...p, colore_primario: e.target.value || null }))} placeholder="#1a1a2e" style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 13 }} />
                </div>
              </F>
              <F label="Colore secondario (hex)">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="color" value={form.colore_secondario ?? '#ffffff'} onChange={e => setForm(p => ({ ...p, colore_secondario: e.target.value }))} style={{ width: 44, height: 38, padding: 2, borderRadius: 6, border: '1px solid var(--grigio-5)', cursor: 'pointer' }} />
                  <input className="input" value={form.colore_secondario ?? ''} onChange={e => setForm(p => ({ ...p, colore_secondario: e.target.value || null }))} placeholder="#ffffff" style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 13 }} />
                </div>
              </F>
              <F label="Email ufficiale">
                <input className="input" type="email" value={form.email_ufficiale ?? ''} onChange={e => setForm(p => ({ ...p, email_ufficiale: e.target.value || null }))} />
              </F>
              <F label="Telefono">
                <input className="input" type="tel" value={form.telefono ?? ''} onChange={e => setForm(p => ({ ...p, telefono: e.target.value || null }))} />
              </F>
              <F label="Sito web" full>
                <input className="input" value={form.sito_web ?? ''} onChange={e => setForm(p => ({ ...p, sito_web: e.target.value || null }))} placeholder="https://..." />
              </F>
              <F label="Note interne" full>
                <textarea className="input" rows={3} value={form.note_interne ?? ''} onChange={e => setForm(p => ({ ...p, note_interne: e.target.value || null }))} />
              </F>
            </Grid>
          </div>
        ) : (
          <div>
            {club?.logo_url && (
              <div style={{ marginBottom: 20 }}>
                <img src={club.logo_url} alt="" style={{ width: 80, height: 80, objectFit: 'contain', background: '#1a1a1a', borderRadius: 4, border: '1px solid var(--border-solid)' }} />
              </div>
            )}
            <ReadRow label="Nome"            value={club?.nome} />
            <ReadRow label="Nome esteso"     value={club?.nome_esteso} />
            <ReadRow label="Forma giuridica" value={FORMA_GIURIDICA.find(f => f.key === club?.forma_giuridica)?.label} />
            <ReadRow label="Categoria"       value={CATEGORIA_LABEL[club?.categoria ?? ''] ?? club?.categoria} />
            <ReadRow label="Anno fondazione" value={club?.anno_fondazione} />
            <ReadRow label="Colori sociali"  value={club?.colori_sociali} />
            <ReadRow label="Email ufficiale" value={club?.email_ufficiale} />
            <ReadRow label="Telefono"        value={club?.telefono} />
            <ReadRow label="Sito web"        value={club?.sito_web} />
            {club?.note_interne && (
              <div style={{ marginTop: 12, background: '#1a1a1a', borderRadius: 2, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--gray)', marginBottom: 4 }}>Note interne</div>
                <div style={{ fontSize: 12, color: 'var(--white)', lineHeight: 1.6 }}>{club.note_interne}</div>
              </div>
            )}
          </div>
        ))}

        {/* ── TAB DATI FISCALI ── */}
        {tab === 'fiscale' && (editing ? (
          <Grid>
            <F label="Codice Fiscale"><input className="input" value={form.codice_fiscale ?? ''} onChange={e => setForm(p => ({ ...p, codice_fiscale: e.target.value.toUpperCase() || null }))} placeholder="CF / P.IVA dell'ente" /></F>
            <F label="Partita IVA"><input className="input" value={form.partita_iva ?? ''} onChange={e => setForm(p => ({ ...p, partita_iva: e.target.value || null }))} /></F>
            <F label="PEC" full><input className="input" type="email" value={form.pec ?? ''} onChange={e => setForm(p => ({ ...p, pec: e.target.value || null }))} placeholder="indirizzo@pec.it" /></F>
            <F label="Codice SDI / CodDest"><input className="input" value={form.sdi ?? ''} onChange={e => setForm(p => ({ ...p, sdi: e.target.value.toUpperCase() || null }))} placeholder="es. M5UXCR1" maxLength={7} /></F>
            <F label="IBAN" full><input className="input" value={form.iban ?? ''} onChange={e => setForm(p => ({ ...p, iban: e.target.value || null }))} placeholder="IT00 X000 0000 0000 0000 0000 000" /></F>
            <F label="BIC/SWIFT"><input className="input" value={form.bic ?? ''} onChange={e => setForm(p => ({ ...p, bic: e.target.value.toUpperCase() || null }))} /></F>
            <F label="Intestatario conto"><input className="input" value={form.intestatario_conto ?? ''} onChange={e => setForm(p => ({ ...p, intestatario_conto: e.target.value || null }))} /></F>
          </Grid>
        ) : (
          <div>
            <ReadRow label="Codice Fiscale"     value={club?.codice_fiscale} />
            <ReadRow label="Partita IVA"         value={club?.partita_iva} />
            <ReadRow label="PEC"                 value={club?.pec} />
            <ReadRow label="Codice SDI"          value={club?.sdi} />
            <ReadRow label="IBAN"                value={club?.iban} />
            <ReadRow label="BIC/SWIFT"           value={club?.bic} />
            <ReadRow label="Intestatario conto"  value={club?.intestatario_conto} />
          </div>
        ))}

        {/* ── TAB INDIRIZZO ── */}
        {tab === 'indirizzo' && (editing ? (
          <Grid>
            <F label="Via / Indirizzo" full><input className="input" value={form.via ?? ''} onChange={e => setForm(p => ({ ...p, via: e.target.value || null }))} placeholder="Via Roma, 1" /></F>
            <F label="CAP"><input className="input" value={form.cap ?? ''} onChange={e => setForm(p => ({ ...p, cap: e.target.value || null }))} maxLength={5} /></F>
            <F label="Città"><input className="input" value={form.citta ?? ''} onChange={e => setForm(p => ({ ...p, citta: e.target.value || null }))} /></F>
            <F label="Provincia (sigla)"><input className="input" value={form.provincia ?? ''} onChange={e => setForm(p => ({ ...p, provincia: e.target.value.toUpperCase() || null }))} maxLength={2} /></F>
            <F label="Regione"><input className="input" value={form.regione ?? ''} onChange={e => setForm(p => ({ ...p, regione: e.target.value || null }))} /></F>
          </Grid>
        ) : (
          <div>
            <ReadRow label="Via"       value={club?.via} />
            <ReadRow label="CAP"       value={club?.cap} />
            <ReadRow label="Città"     value={club?.citta} />
            <ReadRow label="Provincia" value={club?.provincia} />
            <ReadRow label="Regione"   value={club?.regione} />
            {(club?.via || club?.citta) && (
              <div style={{ marginTop: 14 }}>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent([club?.via, club?.citta, club?.provincia].filter(Boolean).join(', '))}`}
                  target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
                >
                  📍 Apri in Google Maps →
                </a>
              </div>
            )}
          </div>
        ))}

        {/* ── TAB FEDERAZIONI ── */}
        {tab === 'federazioni' && (editing ? (
          <Grid>
            <F label="Codice FIGC"><input className="input" value={form.figc_codice ?? ''} onChange={e => setForm(p => ({ ...p, figc_codice: e.target.value || null }))} /></F>
            <F label="Codice CONI"><input className="input" value={form.coni_codice ?? ''} onChange={e => setForm(p => ({ ...p, coni_codice: e.target.value || null }))} /></F>
            <F label="Codice CSI"><input className="input" value={form.csi_codice ?? ''} onChange={e => setForm(p => ({ ...p, csi_codice: e.target.value || null }))} /></F>
            <F label="Codice UISP"><input className="input" value={form.uisp_codice ?? ''} onChange={e => setForm(p => ({ ...p, uisp_codice: e.target.value || null }))} /></F>
            <F label="Altra federazione – Nome"><input className="input" value={form.altra_federazione_nome ?? ''} onChange={e => setForm(p => ({ ...p, altra_federazione_nome: e.target.value || null }))} /></F>
            <F label="Altra federazione – Codice"><input className="input" value={form.altra_federazione_codice ?? ''} onChange={e => setForm(p => ({ ...p, altra_federazione_codice: e.target.value || null }))} /></F>
          </Grid>
        ) : (
          <div>
            <ReadRow label="FIGC"                    value={club?.figc_codice} />
            <ReadRow label="CONI"                    value={club?.coni_codice} />
            <ReadRow label="CSI"                     value={club?.csi_codice} />
            <ReadRow label="UISP"                    value={club?.uisp_codice} />
            <ReadRow label="Altra federazione"       value={club?.altra_federazione_nome} />
            <ReadRow label="Codice altra federazione" value={club?.altra_federazione_codice} />
          </div>
        ))}

        {/* ── TAB LEGALE & FIRMA ── */}
        {tab === 'legale' && (editing ? (
          <div>
            <Grid>
              <F label="Nome Legale Rappresentante">
                <input className="input" value={form.legale_rappresentante_nome ?? ''} onChange={e => setForm(p => ({ ...p, legale_rappresentante_nome: e.target.value || null }))} placeholder="Nome e Cognome" />
              </F>
              <F label="Codice Fiscale">
                <input className="input" value={form.legale_rappresentante_cf ?? ''} onChange={e => setForm(p => ({ ...p, legale_rappresentante_cf: e.target.value.toUpperCase() || null }))} />
              </F>
              <F label="Ruolo / Carica" full>
                <input className="input" value={form.legale_rappresentante_ruolo ?? ''} onChange={e => setForm(p => ({ ...p, legale_rappresentante_ruolo: e.target.value || null }))} placeholder="es. Presidente" />
              </F>
            </Grid>
            <F label="Firma del Presidente" full>
              <input
                ref={firmaInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFirmaUpload}
                style={{ display: 'none' }}
              />

              {form.firma_presidente_url ? (
                /* ── Preview firma esistente ── */
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                    Firma attuale
                  </div>
                  <div style={{ background: '#ffffff', padding: '16px 24px', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 220, marginBottom: 12 }}>
                    <img
                      src={form.firma_presidente_url}
                      alt="Firma presidente"
                      style={{ maxHeight: 80, maxWidth: 300, objectFit: 'contain', display: 'block' }}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => firmaInput.current?.click()}>
                      ✏️ Sostituisci firma
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--rosso)' }}
                      onClick={() => setForm(p => ({ ...p, firma_presidente_url: null }))}
                    >
                      Rimuovi
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Drop zone upload ── */
                <div>
                  <div
                    style={{ padding: '32px 24px', border: '2px dashed var(--border)', textAlign: 'center', cursor: 'pointer', marginBottom: 12, transition: 'border-color 0.15s' }}
                    onClick={() => firmaInput.current?.click()}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)' }}
                    onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                    onDrop={e => {
                      e.preventDefault()
                      e.currentTarget.style.borderColor = 'var(--border)'
                      const f = e.dataTransfer.files[0]
                      if (f) handleFirmaUpload({ target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>)
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>✍️</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 12, color: 'var(--white)', marginBottom: 4 }}>
                      Trascina qui la firma
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)' }}>
                      oppure clicca per scegliere il file · PNG, JPG, SVG, WEBP · Max 2 MB
                    </div>
                  </div>
                </div>
              )}

              {/* Tip PNG trasparente */}
              <div style={{ padding: '10px 14px', background: 'rgba(200,240,0,0.05)', border: '1px solid rgba(200,240,0,0.15)', fontSize: 11, color: 'var(--gray)', lineHeight: 1.7, marginTop: 8 }}>
                <strong style={{ color: 'var(--accent)' }}>💡 Come creare una firma PNG con sfondo trasparente:</strong>
                <br />1. Firma su un foglio bianco con penna nera
                <br />2. Fotografa o scansiona ad alta risoluzione
                <br />3. Usa <strong>remove.bg</strong> o Photoshop per rimuovere lo sfondo
                <br />4. Salva come <strong>PNG</strong> e carica qui · La resa sui documenti sarà perfetta
              </div>
            </F>
          </div>
        ) : (
          <div>
            <ReadRow label="Legale Rappresentante" value={club?.legale_rappresentante_nome} />
            <ReadRow label="Codice Fiscale"         value={club?.legale_rappresentante_cf} />
            <ReadRow label="Ruolo / Carica"         value={club?.legale_rappresentante_ruolo} />
            <div style={{ marginTop: 16 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                Firma Presidente
              </div>
              {club?.firma_presidente_url ? (
                <div style={{ background: '#ffffff', padding: '16px 24px', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={club.firma_presidente_url}
                    alt="Firma Presidente"
                    style={{ maxHeight: 80, maxWidth: 280, objectFit: 'contain', display: 'block' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              ) : (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', fontStyle: 'italic' }}>
                  Firma non ancora caricata. Clicca Modifica per aggiungerla.
                </div>
              )}
            </div>
          </div>
        ))}

        {/* ── TAB SOCIAL ── */}
        {tab === 'social' && (editing ? (
          <Grid>
            {[
              { key: 'social_instagram', label: 'Instagram', placeholder: 'https://instagram.com/nomeclubsportivo' },
              { key: 'social_facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/nomeclubsportivo' },
              { key: 'social_twitter',   label: 'X (Twitter)', placeholder: 'https://x.com/nomeclubsportivo' },
              { key: 'social_youtube',   label: 'YouTube',   placeholder: 'https://youtube.com/@nomeclubsportivo' },
              { key: 'social_tiktok',    label: 'TikTok',    placeholder: 'https://tiktok.com/@nomeclubsportivo' },
              { key: 'social_linkedin',  label: 'LinkedIn',  placeholder: 'https://linkedin.com/company/nomeclub' },
            ].map(s => (
              <F key={s.key} label={s.label}>
                <input className="input" value={(form as any)[s.key] ?? ''} onChange={e => setForm(p => ({ ...p, [s.key]: e.target.value || null }))} placeholder={s.placeholder} />
              </F>
            ))}
          </Grid>
        ) : (
          <div>
            {[
              { key: 'social_instagram', label: 'Instagram', icon: '📸' },
              { key: 'social_facebook',  label: 'Facebook',  icon: '👤' },
              { key: 'social_twitter',   label: 'X (Twitter)', icon: '𝕏' },
              { key: 'social_youtube',   label: 'YouTube',   icon: '▶' },
              { key: 'social_tiktok',    label: 'TikTok',    icon: '🎵' },
              { key: 'social_linkedin',  label: 'LinkedIn',  icon: '💼' },
            ].map(s => {
              const val = (club as any)?.[s.key]
              return (
                <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-solid)' }}>
                  <span style={{ fontSize: 13, color: 'var(--gray)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{s.icon}</span>{s.label}
                  </span>
                  {val ? (
                    <a href={val} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', maxWidth: '60%', textAlign: 'right' }}>
                      {val.replace('https://', '')} →
                    </a>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--gray)' }}>—</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* ── TAB SPONSOR ── */}
        {tab === 'sponsor' && (editing ? (
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--accent)', marginBottom: 14 }}>Sponsor principale</div>
            <Grid>
              <F label="Nome sponsor principale">
                <input className="input" value={form.sponsor_principale ?? ''} onChange={e => setForm(p => ({ ...p, sponsor_principale: e.target.value || null }))} />
              </F>
              <F label="Sito sponsor">
                <input className="input" value={form.sponsor_sito ?? ''} onChange={e => setForm(p => ({ ...p, sponsor_sito: e.target.value || null }))} placeholder="https://..." />
              </F>
            </Grid>
            <F label="Logo sponsor principale" hint="PNG o JPG">
              {form.sponsor_logo_url && (
                <div style={{ marginBottom: 8, background: '#fff', padding: 8, borderRadius: 2, display: 'inline-block' }}>
                  <img src={form.sponsor_logo_url} alt="" style={{ maxHeight: 60, maxWidth: 200, objectFit: 'contain' }} />
                </div>
              )}
              <div>
                <input ref={fileInput} type="file" accept="image/*" onChange={handleSponsorLogoUpload} style={{ display: 'none' }} />
                <button onClick={() => fileInput.current?.click()} className="btn btn-secondary btn-sm">
                  {form.sponsor_logo_url ? 'Cambia logo' : 'Carica logo'}
                </button>
              </div>
            </F>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--gray)', marginBottom: 10 }}>
                Sponsor secondari
              </div>
              {(form.sponsor_secondari ?? []).map((sp, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input className="input" value={sp.nome} onChange={e => {
                    const arr = [...(form.sponsor_secondari ?? [])]
                    arr[i] = { ...arr[i], nome: e.target.value }
                    setForm(p => ({ ...p, sponsor_secondari: arr }))
                  }} placeholder="Nome" style={{ flex: 2 }} />
                  <input className="input" value={sp.sito ?? ''} onChange={e => {
                    const arr = [...(form.sponsor_secondari ?? [])]
                    arr[i] = { ...arr[i], sito: e.target.value }
                    setForm(p => ({ ...p, sponsor_secondari: arr }))
                  }} placeholder="Sito (opz.)" style={{ flex: 3 }} />
                  <button onClick={() => {
                    const arr = (form.sponsor_secondari ?? []).filter((_, j) => j !== i)
                    setForm(p => ({ ...p, sponsor_secondari: arr }))
                  }} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--border-solid)', borderRadius: 2, color: 'var(--gray)', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>✕</button>
                </div>
              ))}
              <button
                onClick={() => setForm(p => ({ ...p, sponsor_secondari: [...(p.sponsor_secondari ?? []), { nome: '', sito: '' }] }))}
                style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border-solid)', borderRadius: 2, color: 'var(--gray)', fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', marginTop: 4 }}
              >
                + Aggiungi sponsor
              </button>
            </div>
          </div>
        ) : (
          <div>
            {!club?.sponsor_principale && !club?.sponsor_secondari?.length && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray)', fontSize: 13 }}>
                Nessuno sponsor configurato.
              </div>
            )}
            {club?.sponsor_principale && (
              <div style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                {club.sponsor_logo_url && (
                  <div style={{ background: '#fff', padding: 6, borderRadius: 2 }}>
                    <img src={club.sponsor_logo_url} alt="" style={{ maxHeight: 50, maxWidth: 160, objectFit: 'contain' }} />
                  </div>
                )}
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 4 }}>Sponsor principale</div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--white)' }}>{club.sponsor_principale}</div>
                  {club.sponsor_sito && (
                    <a href={club.sponsor_sito} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
                      {club.sponsor_sito} →
                    </a>
                  )}
                </div>
              </div>
            )}
            {(club?.sponsor_secondari ?? []).length > 0 && (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--gray)', marginBottom: 10 }}>Sponsor secondari</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(club?.sponsor_secondari ?? []).map((sp, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2 }}>
                      <span style={{ fontSize: 13, color: 'var(--white)' }}>{sp.nome}</span>
                      {sp.sito && <a href={sp.sito} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>{sp.sito} →</a>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* ── TAB PIANO CLUBIS ── */}
        {tab === 'piano' && (
          <div>
            <div style={{ background: '#111', border: `2px solid ${PIANO_COLOR[club?.piano_abbonamento ?? ''] ?? 'var(--border-solid)'}`, borderRadius: 2, padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--gray)', marginBottom: 8 }}>Piano attivo</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, textTransform: 'uppercase', color: PIANO_COLOR[club?.piano_abbonamento ?? ''] ?? 'var(--white)' }}>
                {PIANO_LABEL[club?.piano_abbonamento ?? ''] ?? club?.piano_abbonamento ?? '—'}
              </div>
              {club?.abbonamento_scadenza && (
                <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
                  Scadenza: {new Date(club.abbonamento_scadenza).toLocaleDateString('it-IT')}
                  {new Date(club.abbonamento_scadenza) < new Date(Date.now() + 30 * 86400000) && (
                    <span style={{ color: 'var(--rosso)', marginLeft: 8 }}>⚠ In scadenza</span>
                  )}
                </div>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.8 }}>
              Per modificare il piano ClubIS contatta il supporto a <a href="mailto:support@clubis.app" style={{ color: 'var(--accent)', textDecoration: 'none' }}>support@clubis.app</a>.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
