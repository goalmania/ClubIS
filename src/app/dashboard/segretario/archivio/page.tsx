'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

const BUCKET = 'club-assets'
const CATEGORIE_DEFAULT = ['fiscale', 'federale', 'sanitario', 'contratti', 'verbali', 'altro']
const TIPI_AMMESSI = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_MB = 20

const catIcon: Record<string, string> = {
  fiscale: '💼', federale: '🏅', sanitario: '🏥',
  contratti: '📄', verbali: '📝', altro: '📁',
}

interface Documento {
  id: string
  titolo: string
  categoria: string
  file_url: string
  tag: string[] | null
  data_caricamento: string
  dimensione_kb: number | null
}

interface Toast { id: number; msg: string; ok: boolean }

function fmtKb(kb: number) {
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`
}

export default function SegretarioArchivioPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const [clubId, setClubId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [documenti, setDocumenti] = useState<Documento[]>([])
  const [categorie, setCategorie] = useState<string[]>(CATEGORIE_DEFAULT)
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastRef = useRef(0)

  // Upload modal
  const [showUpload, setShowUpload] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [titolo, setTitolo] = useState('')
  const [categoria, setCategoria] = useState('altro')
  const [nuovaCat, setNuovaCat] = useState('')
  const [tags, setTags] = useState('')
  const [uploading, setUploading] = useState(false)

  // New category modal
  const [showNuovaCatModal, setShowNuovaCatModal] = useState(false)
  const [nuovaCatInput, setNuovaCatInput] = useState('')

  const toast = (msg: string, ok = true) => {
    const id = ++toastRef.current
    setToasts(t => [...t, { id, msg, ok }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }

  const carica = async (cId: string) => {
    const { data } = await supabase
      .from('documenti_archivio')
      .select('id, titolo, categoria, file_url, tag, data_caricamento, dimensione_kb')
      .eq('club_id', cId)
      .order('data_caricamento', { ascending: false })
    setDocumenti(data ?? [])

    // Build category list from DB + defaults
    const dbCats = (data ?? []).map((d: Documento) => d.categoria).filter(Boolean)
    const merged = Array.from(new Set([...CATEGORIE_DEFAULT, ...dbCats]))
    setCategorie(merged)
  }

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: u } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
      if (!u) return
      setClubId(u.club_id)
      await carica(u.club_id)
      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const apriUpload = () => {
    setFile(null)
    setTitolo('')
    setCategoria('altro')
    setNuovaCat('')
    setTags('')
    setShowUpload(true)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    if (f && !titolo) {
      setTitolo(f.name.replace(/\.[^.]+$/, ''))
    }
  }

  const upload = async () => {
    if (!file || !clubId || !userId) return
    if (!TIPI_AMMESSI.includes(file.type)) {
      toast('Tipo file non supportato. Usa PDF, JPEG, PNG o WebP.', false)
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast(`File troppo grande. Massimo ${MAX_MB} MB.`, false)
      return
    }
    const catFinale = nuovaCat.trim() || categoria
    if (!catFinale) { toast('Seleziona una categoria.', false); return }
    if (!titolo.trim()) { toast('Inserisci un titolo.', false); return }

    setUploading(true)
    try {
      const ts = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `archivio/${clubId}/${ts}_${safeName}`

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type })
      if (uploadErr) throw new Error(uploadErr.message)

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const fileUrl = urlData.publicUrl

      const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean)
      const { error: insertErr } = await supabase.from('documenti_archivio').insert({
        club_id: clubId,
        titolo: titolo.trim(),
        categoria: catFinale,
        file_url: fileUrl,
        tag: tagArr.length ? tagArr : null,
        data_caricamento: new Date().toISOString().slice(0, 10),
        dimensione_kb: Math.round(file.size / 1024),
        caricato_da: userId,
      })
      if (insertErr) throw new Error(insertErr.message)

      // Add new category to list if custom
      if (nuovaCat.trim() && !categorie.includes(nuovaCat.trim())) {
        setCategorie(c => [...c, nuovaCat.trim()])
      }

      await carica(clubId)
      setShowUpload(false)
      toast('Documento caricato con successo.')
    } catch (e: unknown) {
      toast((e as Error).message, false)
    } finally {
      setUploading(false)
    }
  }

  const aggiungiCategoria = () => {
    const nome = nuovaCatInput.trim()
    if (!nome) return
    if (!categorie.includes(nome)) setCategorie(c => [...c, nome])
    setCategoria(nome)
    setNuovaCatInput('')
    setShowNuovaCatModal(false)
  }

  const byCat: Record<string, Documento[]> = {}
  documenti.forEach(d => {
    const c = d.categoria ?? 'altro'
    ;(byCat[c] ||= []).push(d)
  })

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Toasts */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.ok ? 'var(--success, #22c55e)' : 'var(--error, #ef4444)',
            color: '#fff', padding: '10px 16px', borderRadius: 8,
            fontSize: 13, fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>{t.msg}</div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Archivio documenti</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            Documenti ufficiali, verbali e archivio fiscale
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowNuovaCatModal(true)}>
            + Categoria
          </button>
          <button className="btn btn-primary btn-sm" onClick={apriUpload}>
            + Carica documento
          </button>
        </div>
      </div>

      {/* Document list */}
      {loading ? (
        <div className="card" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Caricamento...
        </div>
      ) : Object.keys(byCat).length === 0 ? (
        <div className="card" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Nessun documento in archivio
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(byCat).map(([cat, docs]) => (
            <div key={cat}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{catIcon[cat] ?? '📁'}</span>
                <span>{cat} ({docs.length})</span>
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {docs.map(d => (
                  <div key={d.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      📄
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{d.titolo}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(d.data_caricamento).toLocaleDateString('it-IT')}
                        {d.dimensione_kb != null && <> · {fmtKb(d.dimensione_kb)}</>}
                        {d.tag && d.tag.length > 0 && <> · {d.tag.join(', ')}</>}
                      </div>
                    </div>
                    {d.file_url && (
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                        Apri
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <Link href="/dashboard/segretario" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, padding: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--white)', marginBottom: 20 }}>Carica documento</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* File picker */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  File <span style={{ color: 'var(--error, #ef4444)' }}>*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={onFileChange}
                  style={{ fontSize: 13, color: 'var(--text-primary)', width: '100%' }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  PDF, JPEG, PNG, WebP · max {MAX_MB} MB
                </div>
              </div>

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Titolo <span style={{ color: 'var(--error, #ef4444)' }}>*</span>
                </label>
                <input
                  className="input"
                  value={titolo}
                  onChange={e => setTitolo(e.target.value)}
                  placeholder="Es. Verbale assemblea 2026"
                />
              </div>

              {/* Category */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Categoria
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    className="select"
                    style={{ flex: 1 }}
                    value={nuovaCat ? '__nuova__' : categoria}
                    onChange={e => {
                      if (e.target.value === '__nuova__') {
                        setNuovaCat('')
                      } else {
                        setCategoria(e.target.value)
                        setNuovaCat('')
                      }
                    }}
                  >
                    {categorie.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__nuova__">+ Nuova categoria...</option>
                  </select>
                </div>
                {(categoria === '__nuova__' || nuovaCat !== '') && (
                  <input
                    className="input"
                    style={{ marginTop: 8 }}
                    value={nuovaCat}
                    onChange={e => setNuovaCat(e.target.value)}
                    placeholder="Nome nuova categoria"
                  />
                )}
              </div>

              {/* Tags */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tag (separati da virgola)
                </label>
                <input
                  className="input"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  placeholder="Es. 2026, assemblea, bilancio"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowUpload(false)} disabled={uploading}>
                Annulla
              </button>
              <button className="btn btn-primary btn-sm" onClick={upload} disabled={uploading || !file}>
                {uploading ? 'Caricamento...' : 'Carica'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New category modal */}
      {showNuovaCatModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 360, padding: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--white)', marginBottom: 20 }}>Nuova categoria</h2>
            <input
              className="input"
              value={nuovaCatInput}
              onChange={e => setNuovaCatInput(e.target.value)}
              placeholder="Nome categoria"
              onKeyDown={e => e.key === 'Enter' && aggiungiCategoria()}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowNuovaCatModal(false); setNuovaCatInput('') }}>
                Annulla
              </button>
              <button className="btn btn-primary btn-sm" onClick={aggiungiCategoria} disabled={!nuovaCatInput.trim()}>
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
