'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type StatoPresenza = 'presente' | 'assente' | 'non_registrato'
type MotivoAssenza = 'infortunio' | 'malattia' | 'lavoro' | 'squalifica' | 'non_giustificata' | 'personale'

interface GiocatorePresenza {
  id: string
  giocatore_id: string
  nome: string
  cognome: string
  ruolo: string | null
  numero_maglia: number | null
  foto_url: string | null
  stato: StatoPresenza
  motivo_assenza: MotivoAssenza | null
  presence_id: string | null
}

const ruoloShort: Record<string, string> = {
  portiere: 'POR', difensore_centrale: 'DC', terzino: 'TRZ',
  centrocampista_difensivo: 'CDM', centrocampista: 'CEN',
  trequartista: 'TRQ', ala: 'ALA', seconda_punta: '2AP', centravanti: 'ATT',
}

const motivi: { value: MotivoAssenza; label: string }[] = [
  { value: 'infortunio',       label: 'Infortunio' },
  { value: 'malattia',         label: 'Malattia' },
  { value: 'lavoro',           label: 'Lavoro/Studio' },
  { value: 'squalifica',       label: 'Squalifica' },
  { value: 'personale',        label: 'Motivo personale' },
  { value: 'non_giustificata', label: 'Non giustificata' },
]

interface Props {
  sessioneId: string
  /** se true non mostra i pulsanti ✓/✕ (sola lettura) */
  readonly?: boolean
}

export default function PresenzeSessioneDetail({ sessioneId, readonly = false }: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const [sessione,    setSessione]   = useState<any>(null)
  const [giocatori,   setGiocatori]  = useState<GiocatorePresenza[]>([])
  const [loading,     setLoading]    = useState(true)
  const [saving,      setSaving]     = useState<string | null>(null)
  const [salvato,     setSalvato]    = useState(false)
  const [motipoOpen,  setMotivoOpen] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'tutti' | 'presenti' | 'assenti' | 'da_registrare'>('tutti')

  useEffect(() => {
    async function load() {
      const { data: sess } = await supabase
        .from('sessioni_allenamento')
        .select('id, data_ora, tipologia, campo, durata_minuti, stato, squadra_id, squadre(nome, categoria_eta)')
        .eq('id', sessioneId)
        .single()
      setSessione(sess)
      if (!sess) { setLoading(false); return }

      const { data: tesserati } = await supabase
        .from('tesseramenti')
        .select('numero_maglia, giocatori(id, nome, cognome, ruolo_principale, foto_url)')
        .eq('squadra_id', sess.squadra_id)
        .eq('stato', 'attivo')

      const { data: presenze } = await supabase
        .from('presenze')
        .select('id, giocatore_id, presente, motivo_assenza')
        .eq('sessione_id', sessioneId)

      const presenzeMap = new Map(presenze?.map(p => [p.giocatore_id, p]) ?? [])

      const lista: GiocatorePresenza[] = (tesserati ?? [])
        .filter(t => t.giocatori)
        .map(t => {
          const g = t.giocatori as any
          const p = presenzeMap.get(g.id)
          return {
            id: g.id, giocatore_id: g.id,
            nome: g.nome, cognome: g.cognome,
            ruolo: g.ruolo_principale, numero_maglia: t.numero_maglia, foto_url: g.foto_url,
            stato: p ? (p.presente ? 'presente' : 'assente') : 'non_registrato',
            motivo_assenza: p?.motivo_assenza ?? null,
            presence_id: p?.id ?? null,
          }
        })
        .sort((a, b) => a.cognome.localeCompare(b.cognome))

      setGiocatori(lista)
      setLoading(false)
    }
    load()
  }, [sessioneId]) // eslint-disable-line react-hooks/exhaustive-deps

  const aggiornaPresenza = useCallback(async (
    giocatoreId: string,
    stato: 'presente' | 'assente',
    motivo?: MotivoAssenza | null
  ) => {
    if (readonly) return
    setSaving(giocatoreId)
    const { data: { user } } = await supabase.auth.getUser()
    const esistente = giocatori.find(g => g.giocatore_id === giocatoreId)

    if (esistente?.presence_id) {
      await supabase.from('presenze').update({
        presente: stato === 'presente',
        motivo_assenza: stato === 'presente' ? null : (motivo ?? null),
      }).eq('id', esistente.presence_id)
    } else {
      const { data: nuovo } = await supabase.from('presenze').insert({
        sessione_id: sessioneId, giocatore_id: giocatoreId,
        presente: stato === 'presente',
        motivo_assenza: stato === 'presente' ? null : (motivo ?? null),
        registrato_da: user?.id,
      }).select('id').single()
      setGiocatori(prev => prev.map(g =>
        g.giocatore_id === giocatoreId ? { ...g, presence_id: nuovo?.id ?? null } : g
      ))
    }

    setGiocatori(prev => prev.map(g =>
      g.giocatore_id === giocatoreId
        ? { ...g, stato, motivo_assenza: stato === 'presente' ? null : (motivo ?? g.motivo_assenza) }
        : g
    ))
    setSaving(null); setMotivoOpen(null); setSalvato(true)
    setTimeout(() => setSalvato(false), 2000)
  }, [giocatori, sessioneId, supabase, readonly])

  const segnaConfermaSessione = async () => {
    await supabase.from('sessioni_allenamento').update({ stato: 'effettuato' }).eq('id', sessioneId)
    setSessione((prev: any) => ({ ...prev, stato: 'effettuato' }))
  }

  const presenti = giocatori.filter(g => g.stato === 'presente').length
  const assenti  = giocatori.filter(g => g.stato === 'assente').length
  const daReg    = giocatori.filter(g => g.stato === 'non_registrato').length
  const perc     = giocatori.length > 0 ? Math.round((presenti / giocatori.length) * 100) : 0

  const filtrati = giocatori.filter(g => {
    if (filtro === 'presenti')      return g.stato === 'presente'
    if (filtro === 'assenti')       return g.stato === 'assente'
    if (filtro === 'da_registrare') return g.stato === 'non_registrato'
    return true
  })

  if (loading) return <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--grigio-4)' }}>Caricamento sessione...</div>
  if (!sessione) return <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--grigio-4)' }}>Sessione non trovata.</div>

  const sq = sessione.squadre as any

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grigio-3)', fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Torna indietro
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)', marginBottom: 4 }}>
              Presenze — {sessione.tipologia.charAt(0).toUpperCase() + sessione.tipologia.slice(1)}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--grigio-3)' }}>
              {new Date(sessione.data_ora).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}{new Date(sessione.data_ora).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              {sessione.campo && ` · ${sessione.campo}`}
              {sq?.nome && ` · ${sq.nome}`}
            </p>
          </div>
          <span className={`badge ${sessione.stato === 'effettuato' ? 'badge-verde' : 'badge-ambra'}`}>{sessione.stato}</span>
        </div>
      </div>

      {/* Contatori */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 20 }}>
            <Counter label="Presenti"     value={presenti} colore="verde" />
            <Counter label="Assenti"      value={assenti}  colore="rosso" />
            <Counter label="Da registrare" value={daReg}   colore="ambra" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, color: perc >= 80 ? 'var(--verde)' : perc >= 60 ? 'var(--ambra)' : 'var(--rosso)' }}>
            {perc}%
          </div>
        </div>
        <div className="progress">
          <div className="progress-fill" style={{ width: `${perc}%`, background: perc >= 80 ? 'var(--verde)' : perc >= 60 ? 'var(--ambra)' : 'var(--rosso)' }} />
        </div>
      </div>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {([
          { v: 'tutti'         as const, l: `Tutti (${giocatori.length})` },
          { v: 'presenti'      as const, l: `Presenti (${presenti})` },
          { v: 'assenti'       as const, l: `Assenti (${assenti})` },
          { v: 'da_registrare' as const, l: `Da fare (${daReg})` },
        ]).map(f => (
          <button key={f.v} onClick={() => setFiltro(f.v)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
            border: filtro === f.v ? '1px solid var(--verde)' : '1px solid var(--grigio-5)',
            background: filtro === f.v ? 'var(--verde-lt)' : 'white',
            color: filtro === f.v ? 'var(--verde)' : 'var(--grigio-3)',
            fontWeight: filtro === f.v ? 500 : 400,
          }}>{f.l}</button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {filtrati.map(g => {
          const iniziali    = `${g.nome[0]}${g.cognome[0]}`.toUpperCase()
          const isSaving    = saving === g.giocatore_id
          const motipoIsOpen = motipoOpen === g.giocatore_id

          return (
            <div key={g.giocatore_id}>
              <div className="card" style={{
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14,
                borderLeft: `3px solid ${g.stato === 'presente' ? 'var(--verde)' : g.stato === 'assente' ? 'var(--rosso)' : 'var(--grigio-5)'}`,
                opacity: isSaving ? 0.6 : 1, transition: 'opacity 0.15s, border-color 0.2s',
              }}>
                {g.foto_url
                  ? <img src={g.foto_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  : <div className="avatar" style={{ width: 40, height: 40, fontSize: 14, flexShrink: 0 }}>{iniziali}</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{g.cognome} {g.nome}</span>
                    {g.numero_maglia && <span style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)' }}>#{g.numero_maglia}</span>}
                    {g.ruolo && <span className="badge badge-grigio" style={{ fontSize: 10 }}>{ruoloShort[g.ruolo] ?? g.ruolo}</span>}
                  </div>
                  {g.stato === 'assente' && g.motivo_assenza && (
                    <div style={{ fontSize: 12, color: 'var(--rosso)', marginTop: 2 }}>
                      {motivi.find(m => m.value === g.motivo_assenza)?.label ?? g.motivo_assenza}
                    </div>
                  )}
                </div>

                {!readonly && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => aggiornaPresenza(g.giocatore_id, 'presente')} disabled={isSaving} title="Presente" style={{
                      width: 40, height: 40, borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: g.stato === 'presente' ? 'var(--verde)' : 'var(--grigio-6)',
                      color: g.stato === 'presente' ? 'white' : 'var(--grigio-4)',
                      fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                    }}>{isSaving ? '…' : '✓'}</button>
                    <button onClick={() => setMotivoOpen(motipoIsOpen ? null : g.giocatore_id)} disabled={isSaving} title="Assente" style={{
                      width: 40, height: 40, borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: g.stato === 'assente' ? 'var(--rosso)' : 'var(--grigio-6)',
                      color: g.stato === 'assente' ? 'white' : 'var(--grigio-4)',
                      fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                    }}>✕</button>
                  </div>
                )}

                {readonly && (
                  <span className={`badge ${g.stato === 'presente' ? 'badge-verde' : g.stato === 'assente' ? 'badge-rosso' : 'badge-grigio'}`} style={{ fontSize: 11 }}>
                    {g.stato === 'presente' ? 'Presente' : g.stato === 'assente' ? 'Assente' : '—'}
                  </span>
                )}
              </div>

              {!readonly && motipoIsOpen && (
                <div className="card" style={{ padding: '12px 16px', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: '1px solid var(--grigio-5)', background: 'var(--rosso-lt)' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--rosso)', marginBottom: 10 }}>
                    Motivo assenza per {g.cognome}:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {motivi.map(m => (
                      <button key={m.value} onClick={() => aggiornaPresenza(g.giocatore_id, 'assente', m.value)} style={{
                        padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                        border: g.motivo_assenza === m.value ? '1px solid var(--rosso)' : '1px solid var(--grigio-5)',
                        background: g.motivo_assenza === m.value ? 'var(--rosso)' : 'white',
                        color: g.motivo_assenza === m.value ? 'white' : 'var(--grigio-2)', fontWeight: 500,
                      }}>{m.label}</button>
                    ))}
                    <button onClick={() => aggiornaPresenza(g.giocatore_id, 'assente', null)} style={{
                      padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                      border: '1px solid var(--grigio-5)', background: 'white', color: 'var(--grigio-3)',
                    }}>Senza motivo</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filtrati.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
            Nessun giocatore in questa categoria
          </div>
        )}
      </div>

      {!readonly && (
        <div style={{ position: 'sticky', bottom: 16, background: 'white', border: '1px solid var(--grigio-5)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 13, color: salvato ? 'var(--verde)' : 'var(--grigio-3)' }}>
            {salvato ? '✓ Salvato automaticamente' : daReg > 0 ? `${daReg} giocatori da registrare` : '✓ Tutti registrati'}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {sessione.stato !== 'effettuato' && daReg === 0 && (
              <button className="btn btn-primary btn-sm" onClick={segnaConfermaSessione}>Conferma sessione ✓</button>
            )}
            {sessione.stato === 'effettuato' && (
              <span className="badge badge-verde">Sessione confermata</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Counter({ label, value, colore }: { label: string; value: number; colore: 'verde' | 'rosso' | 'ambra' }) {
  const c = colore === 'verde' ? 'var(--verde)' : colore === 'rosso' ? 'var(--rosso)' : 'var(--ambra)'
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 600, color: c, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--grigio-4)', marginTop: 2 }}>{label}</div>
    </div>
  )
}
