'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClubId } from '@/lib/club-context'
import { Toast } from '@/components/ui'

type VoceLista = {
  id: string
  tipo_lista: 'lista_a' | 'lista_b'
  tesserato_id: string | null
  nome_tesserato: string
  cognome_tesserato: string
  data_nascita: string | null
  posizione_lista: number
}

type Tesserato = {
  id: string
  nome: string
  cognome: string
  data_nascita: string | null
}

const LISTA_A_MAX = 23
const STAGIONI = ['2026/27', '2025/26', '2027/28']

// Calcola anno minimo nascita per giovani di serie in base alla stagione
// In Serie C i "giovani di serie" devono essere nati dopo il 1° gennaio dell'anno = (primo anno stagione - 22)
// Stagione 2026/27 => nati dal 01/01/2004
function limiteUnder(stagione: string): Date {
  const anno = parseInt(stagione.split('/')[0], 10)
  return new Date(anno - 22, 0, 1)
}

function isUnderLimite(dataNascita: string | null, stagione: string): boolean {
  if (!dataNascita) return false
  const nascita = new Date(dataNascita)
  return nascita >= limiteUnder(stagione)
}

type ToastState = { msg: string; tipo: 'success' | 'error' } | null

function ListaSection({
  tipo,
  voci,
  stagione,
  tesserati,
  onAdd,
  onRemove,
}: {
  tipo: 'lista_a' | 'lista_b'
  voci: VoceLista[]
  stagione: string
  tesserati: Tesserato[]
  onAdd: (t: Tesserato) => void
  onRemove: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  const isA = tipo === 'lista_a'
  const label = isA ? 'Lista A (Over)' : 'Lista B (Under / Giovani di serie)'
  const limite = isA ? LISTA_A_MAX : null
  const voceIds = new Set(voci.map(v => v.tesserato_id).filter(Boolean))

  const candidati = tesserati.filter(t => {
    if (voceIds.has(t.id)) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return t.cognome.toLowerCase().includes(q) || t.nome.toLowerCase().includes(q)
    }
    return true
  })

  const superaLimite = limite !== null && voci.length >= limite

  const limiUnder = limiteUnder(stagione)
  const limiLabel = limiUnder.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
      {/* Header lista */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--white)' }}>
            {label}
          </span>
          {!isA && (
            <span style={{ fontSize: 11, color: 'var(--grigio-3)', marginLeft: 10 }}>
              Nati dal {limiLabel}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {limite !== null && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
              color: superaLimite ? '#ff4444' : voci.length >= limite - 3 ? '#ffd600' : 'var(--accent-green)',
            }}>
              {voci.length}/{limite}
            </span>
          )}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowPicker(v => !v)}
            disabled={superaLimite}
          >
            + Aggiungi
          </button>
        </div>
      </div>

      {superaLimite && (
        <div style={{ padding: '8px 18px', background: 'rgba(255,68,68,0.07)', borderBottom: '1px solid rgba(255,68,68,0.2)', fontSize: 12, color: '#ff6666' }}>
          Limite di {limite} calciatori raggiunto per la Lista A.
        </div>
      )}

      {/* Picker tesserati */}
      {showPicker && (
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <input
            className="form-control"
            style={{ marginBottom: 8 }}
            placeholder="Cerca tesserato..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {candidati.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--grigio-4)', padding: '10px 0' }}>Nessun tesserato disponibile</div>
            )}
            {candidati.map(t => {
              const warning = !isA && t.data_nascita && new Date(t.data_nascita) < limiteUnder(stagione)
              return (
                <div key={t.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}
                  onClick={() => { onAdd(t); setShowPicker(false); setSearch('') }}
                >
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{t.cognome} {t.nome}</span>
                    {t.data_nascita && (
                      <span style={{ fontSize: 11, color: 'var(--grigio-3)', marginLeft: 8 }}>
                        {new Date(t.data_nascita).toLocaleDateString('it-IT')}
                      </span>
                    )}
                  </div>
                  {warning && (
                    <span style={{ fontSize: 11, color: '#ffd600', background: 'rgba(255,214,0,0.1)', padding: '2px 8px' }}>
                      Fuori età Lista B
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabella voci */}
      {voci.length === 0 ? (
        <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
          Nessun calciatore in lista. Usa il pulsante &ldquo;+ Aggiungi&rdquo; per iniziare.
        </div>
      ) : (
        <div>
          {voci.map((v, i) => {
            const overeta = !isA && v.data_nascita && new Date(v.data_nascita) < limiteUnder(stagione)
            return (
              <div key={v.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px',
                borderBottom: '1px solid var(--border-light)',
                background: overeta ? 'rgba(255,214,0,0.04)' : undefined,
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--grigio-3)', width: 24, textAlign: 'right' }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {v.cognome_tesserato} {v.nome_tesserato}
                  </span>
                  {v.data_nascita && (
                    <span style={{ fontSize: 11, color: 'var(--grigio-3)', marginLeft: 10 }}>
                      {new Date(v.data_nascita).toLocaleDateString('it-IT')}
                    </span>
                  )}
                </div>
                {overeta && (
                  <span style={{ fontSize: 11, color: '#ffd600', background: 'rgba(255,214,0,0.1)', padding: '2px 8px' }}>
                    Fuori età
                  </span>
                )}
                <button
                  className="btn btn-sm"
                  style={{ padding: '4px 10px', fontSize: 12, color: 'var(--accent-red)', border: '1px solid rgba(255,68,68,0.3)', background: 'transparent' }}
                  onClick={() => onRemove(v.id)}
                >
                  Rimuovi
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ListeProfessionisticheView() {
  const supabase = createClient()
  const clubId = useClubId()
  const [stagione, setStagione] = useState('2026/27')
  const [voci, setVoci] = useState<VoceLista[]>([])
  const [tesserati, setTesserati] = useState<Tesserato[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<ToastState>(null)

  const fetchListe = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/liste-pro?stagione=${encodeURIComponent(stagione)}`)
    if (res.ok) setVoci(await res.json())
    setLoading(false)
  }, [stagione])

  useEffect(() => {
    if (!clubId) return
    // Fetch tesserati della rosa
    const fetchTesserati = async () => {
      const { data } = await supabase
        .from('tesseramenti')
        .select('giocatore_id, giocatori(id, nome, cognome, data_nascita)')
        .eq('club_id', clubId)
        .eq('stato', 'attivo')
      const mapped: Tesserato[] = (data ?? [])
        .map((t: any) => t.giocatori)
        .filter(Boolean)
        .map((g: any) => ({
          id: g.id,
          nome: g.nome,
          cognome: g.cognome,
          data_nascita: g.data_nascita ?? null,
        }))
      setTesserati(mapped)
    }
    fetchTesserati()
  }, [supabase, clubId])

  useEffect(() => { fetchListe() }, [fetchListe])

  const handleAdd = async (tipo: 'lista_a' | 'lista_b', t: Tesserato) => {
    const res = await fetch('/api/liste-pro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stagione,
        tipo_lista: tipo,
        tesserato_id: t.id,
        nome_tesserato: t.nome,
        cognome_tesserato: t.cognome,
        data_nascita: t.data_nascita,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      setToast({ msg: err.error ?? 'Errore', tipo: 'error' })
      return
    }
    setToast({ msg: 'Calciatore aggiunto alla lista', tipo: 'success' })
    fetchListe()
  }

  const handleRemove = async (id: string) => {
    const res = await fetch(`/api/liste-pro/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setToast({ msg: 'Errore nella rimozione', tipo: 'error' })
      return
    }
    setToast({ msg: 'Calciatore rimosso dalla lista', tipo: 'success' })
    setVoci(prev => prev.filter(v => v.id !== id))
  }

  const listaA = voci.filter(v => v.tipo_lista === 'lista_a')
  const listaB = voci.filter(v => v.tipo_lista === 'lista_b')

  return (
    <div>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
            Liste Campionato
          </h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
            Gestione Lista A e Lista B — Serie C Lega Pro
          </p>
        </div>
        <select
          className="form-control"
          style={{ width: 'auto', minWidth: 120 }}
          value={stagione}
          onChange={e => setStagione(e.target.value)}
        >
          {STAGIONI.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--grigio-3)' }}>Caricamento...</div>
      ) : (
        <>
          <ListaSection
            tipo="lista_a"
            voci={listaA}
            stagione={stagione}
            tesserati={tesserati}
            onAdd={t => handleAdd('lista_a', t)}
            onRemove={handleRemove}
          />
          <ListaSection
            tipo="lista_b"
            voci={listaB}
            stagione={stagione}
            tesserati={tesserati}
            onAdd={t => handleAdd('lista_b', t)}
            onRemove={handleRemove}
          />
        </>
      )}
    </div>
  )
}
