'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Toast } from '@/components/ui'
import { ProOnlyFeature } from '@/components/ProOnlyFeature'
import Link from 'next/link'

/* ─── Tipi ───────────────────────────────────────────────────── */

interface GiocatoreRosa {
  id: string
  nome: string
  cognome: string
  numero_maglia: number | null
}

interface SanzioneParsed {
  id: string
  comunicato_id: string
  cognome_raw: string
  nome_raw: string
  societa_raw: string
  tipo_sanzione: string
  durata: string
  giocatore_id: string | null
  match_score: number
  confermato: boolean
  lega: string
}

interface Comunicato {
  id: string
  numero_comunicato: string | null
  data_comunicato: string
  processato: boolean
  created_at: string
  sanzioni: SanzioneParsed[]
}

const TIPO_BADGE: Record<string, { label: string; cls: string }> = {
  squalifica:  { label: 'SQUALIFICA',  cls: 'badge-rosso'  },
  diffida:     { label: 'DIFFIDA',     cls: 'badge-ambra'  },
  ammonizione: { label: 'AMMONIZIONE', cls: 'badge-grigio' },
  ammenda:     { label: 'AMMENDA',     cls: 'badge-grigio' },
}

const fmt = (d: string) => new Date(d).toLocaleDateString('it-IT')

/* ─── Componente ─────────────────────────────────────────────── */

function ComunicatiLegaProContent() {
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [clubId, setClubId]       = useState<string | null>(null)
  const [rosa, setRosa]           = useState<GiocatoreRosa[]>([])
  const [comunicati, setComunicati] = useState<Comunicato[]>([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)

  const [numeroCom, setNumeroCom] = useState('')
  const [dataCom, setDataCom]     = useState(new Date().toISOString().split('T')[0])
  const [dataInizioMap, setDataInizioMap] = useState<Record<string, string>>({})
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [confermando, setConfermando] = useState<Record<string, boolean>>({})

  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const showToast = (msg: string, tipo: 'success' | 'error' = 'success') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const ctxRes = await fetch('/api/user-context')
    if (!ctxRes.ok) { setLoading(false); return }
    const ctx = await ctxRes.json()
    const cid: string = ctx.clubId
    if (!cid) { setLoading(false); return }
    setClubId(cid)

    const [{ data: tessData }, { data: commData }] = await Promise.all([
      supabase
        .from('tesseramenti')
        .select('numero_maglia, giocatori(id, nome, cognome)')
        .eq('club_id', cid)
        .eq('stato', 'attivo'),
      supabase
        .from('comunicati_figc')
        .select('id, numero_comunicato, data_comunicato, processato, created_at')
        .eq('club_id', cid)
        .eq('lega', 'LegaPro')
        .order('data_comunicato', { ascending: false })
        .limit(15),
    ])

    setRosa(
      (tessData ?? []).map((t: any) => ({
        id: t.giocatori?.id,
        nome: t.giocatori?.nome ?? '',
        cognome: t.giocatori?.cognome ?? '',
        numero_maglia: t.numero_maglia ?? null,
      })).filter(g => g.id).sort((a, b) => a.cognome.localeCompare(b.cognome))
    )

    const ids = (commData ?? []).map((c: any) => c.id)
    let sanzioniData: any[] = []
    if (ids.length > 0) {
      const { data } = await supabase
        .from('squalifiche_comunicato')
        .select('*')
        .eq('club_id', cid)
        .in('comunicato_id', ids)
        .eq('lega', 'LegaPro')
      sanzioniData = data ?? []
    }

    const sanzioniByComm = new Map<string, SanzioneParsed[]>()
    for (const s of sanzioniData) {
      if (!sanzioniByComm.has(s.comunicato_id)) sanzioniByComm.set(s.comunicato_id, [])
      sanzioniByComm.get(s.comunicato_id)!.push(s)
    }

    setComunicati(
      (commData ?? []).map((c: any) => ({
        ...c,
        sanzioni: sanzioniByComm.get(c.id) ?? [],
      }))
    )
    setLoading(false)
  }

  async function uploadPdf(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) { showToast('Seleziona un PDF Lega Pro', 'error'); return }
    setUploading(true)

    const fd = new FormData()
    fd.append('pdf', file)
    fd.append('numero_comunicato', numeroCom)
    fd.append('data_comunicato', dataCom)

    try {
      const res  = await fetch('/api/figc/comunicati/upload-legapro', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Errore upload')
      showToast(
        `PDF analizzato: ${json.rilevanti ?? 0} sanzioni del tuo club (${json.trovate} totali), ${json.matchate} abbinate alla rosa`,
        'success',
      )
      if (fileRef.current) fileRef.current.value = ''
      await init()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  async function conferma(sq: SanzioneParsed, comunicatoRef: string | null) {
    const gId      = overrides[sq.id] ?? sq.giocatore_id
    const isAmmenda = sq.tipo_sanzione === 'ammenda'
    if (!isAmmenda && !gId) { showToast('Associa prima un giocatore', 'error'); return }

    const dataInizio = dataInizioMap[sq.id] ?? new Date().toISOString().split('T')[0]
    setConfermando(p => ({ ...p, [sq.id]: true }))

    try {
      const res  = await fetch(`/api/figc/comunicati/${sq.id}/conferma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          giocatore_id:  gId,
          tipo_sanzione: sq.tipo_sanzione,
          durata:        sq.durata,
          data_inizio:   dataInizio,
          comunicato_ref: comunicatoRef ? `Lega Pro n. ${comunicatoRef}` : 'Lega Pro',
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast(`Sanzione confermata${json.data_fine ? ` — fine il ${fmt(json.data_fine)}` : ''}`)
      await init()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setConfermando(p => ({ ...p, [sq.id]: false }))
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray)' }}>Caricamento...</div>

  const tutteSanzioni = comunicati.flatMap(c => {
    const rosaIds = new Set(rosa.map(g => g.id))
    return c.sanzioni
      .filter(s => s.tipo_sanzione === 'ammenda' || s.giocatore_id === null || rosaIds.has(s.giocatore_id!))
      .map(s => ({ ...s, _comunicato: c }))
  })
  const daConfermare = tutteSanzioni.filter(s => !s.confermato)
  const confermate   = tutteSanzioni.filter(s => s.confermato)

  return (
    <div>
      <PageHeader
        title="Comunicati Lega Pro"
        subtitle="Giudice Sportivo Serie C — carica il PDF per estrarre i provvedimenti"
        actions={
          <Link href="/dashboard/segretario/figc/squalifiche" className="btn btn-secondary btn-sm">
            Monitor squalifiche →
          </Link>
        }
      />

      {/* Badge lega */}
      <div style={{ marginBottom: 20 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          background: 'rgba(0,112,243,0.12)', color: '#60a5fa',
          border: '1px solid rgba(0,112,243,0.3)',
          borderRadius: 4, padding: '4px 10px',
        }}>
          LEGA PRO — SERIE C
        </span>
      </div>

      {/* ─── Upload PDF ─── */}
      <div className="card" style={{ marginBottom: 24, padding: '20px 24px' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
          Carica Comunicato Ufficiale Giudice Sportivo
        </div>
        <form onSubmit={uploadPdf}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 160px 1fr auto', gap: 12, alignItems: 'flex-end' }}>
            <div>
              <label className="label">N° comunicato</label>
              <input
                className="input"
                style={{ width: '100%', marginTop: 4 }}
                value={numeroCom}
                onChange={e => setNumeroCom(e.target.value)}
                placeholder="es. 59/PR4"
              />
            </div>
            <div>
              <label className="label">Data comunicato</label>
              <input
                className="input"
                type="date"
                style={{ width: '100%', marginTop: 4 }}
                value={dataCom}
                onChange={e => setDataCom(e.target.value)}
              />
            </div>
            <div>
              <label className="label">File PDF (C.U. Giudice Sportivo Lega Pro)</label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                style={{ marginTop: 4, fontSize: 12, color: 'var(--gray)' }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={uploading}
              style={{ height: 38, flexShrink: 0 }}
            >
              {uploading ? 'Analisi...' : 'Analizza PDF'}
            </button>
          </div>
        </form>

        {comunicati.length > 0 && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 8 }}>Comunicati Lega Pro caricati</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {comunicati.map(c => (
                <span key={c.id} style={{
                  fontSize: 11, background: 'rgba(0,112,243,0.08)',
                  border: '1px solid rgba(0,112,243,0.2)',
                  borderRadius: 4, padding: '3px 10px', color: '#60a5fa',
                }}>
                  Lega Pro {c.numero_comunicato ? `n. ${c.numero_comunicato}` : ''} — {fmt(c.data_comunicato)}
                  <span style={{ marginLeft: 6, color: 'var(--accent)' }}>
                    ({c.sanzioni.length} sanzioni)
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Sanzioni da confermare ─── */}
      {daConfermare.length > 0 && (
        <div className="card" style={{ marginBottom: 24, padding: '20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
            Sanzioni rilevate — da confermare ({daConfermare.length})
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 18 }}>
            Solo sanzioni che riguardano il tuo club o i tuoi giocatori
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {daConfermare.map(sq => {
              const c         = sq._comunicato
              const gId       = overrides[sq.id] ?? sq.giocatore_id
              const autoMatch = sq.match_score >= 0.72
              const gMatch    = rosa.find(g => g.id === gId)
              const cfg       = TIPO_BADGE[sq.tipo_sanzione] ?? { label: sq.tipo_sanzione.toUpperCase(), cls: 'badge-grigio' }

              return (
                <div key={sq.id} style={{
                  border: `1px solid ${autoMatch ? 'rgba(200,240,0,0.2)' : 'rgba(245,158,11,0.3)'}`,
                  borderLeft: `3px solid ${autoMatch ? 'var(--accent)' : 'var(--ambra)'}`,
                  borderRadius: 6,
                  padding: '14px 16px',
                  display: 'grid',
                  gridTemplateColumns: '130px 1fr 220px auto',
                  gap: 14,
                  alignItems: 'center',
                }}>
                  {/* Tipo + durata */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className={`badge ${cfg.cls}`} style={{ alignSelf: 'flex-start' }}>{cfg.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)' }}>
                      {sq.durata}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
                      color: '#60a5fa', letterSpacing: '0.08em',
                    }}>
                      LEGA PRO
                    </span>
                  </div>

                  {/* Nome + società */}
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700 }}>
                      {sq.cognome_raw} {sq.nome_raw}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>
                      {sq.societa_raw}
                      {autoMatch && sq.match_score > 0 && (
                        <span style={{ marginLeft: 8, color: 'var(--accent)' }}>
                          · match {Math.round(sq.match_score * 100)}%
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--gray)', marginTop: 4 }}>
                      C.U. Lega Pro{c.numero_comunicato ? ` n. ${c.numero_comunicato}` : ''} — {fmt(c.data_comunicato)}
                    </div>
                  </div>

                  {/* Associazione */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {sq.tipo_sanzione === 'ammenda' ? (
                      <div style={{ fontSize: 12, color: 'var(--gray)', fontStyle: 'italic' }}>
                        Ammenda società
                      </div>
                    ) : (
                      <>
                        {autoMatch && gMatch && (
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                            → {gMatch.cognome} {gMatch.nome}
                          </div>
                        )}
                        <select
                          className="input"
                          style={{ width: '100%', fontSize: 12 }}
                          value={overrides[sq.id] ?? sq.giocatore_id ?? ''}
                          onChange={e => setOverrides(p => ({ ...p, [sq.id]: e.target.value }))}
                        >
                          <option value="">
                            {autoMatch && gMatch ? `✓ ${gMatch.cognome} ${gMatch.nome}` : 'Seleziona giocatore...'}
                          </option>
                          {rosa.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.cognome} {g.nome}{g.numero_maglia != null ? ` (#${g.numero_maglia})` : ''}
                            </option>
                          ))}
                        </select>
                        <div>
                          <label className="label" style={{ fontSize: 10 }}>Decorrenza</label>
                          <input
                            className="input"
                            type="date"
                            style={{ width: '100%', marginTop: 2, fontSize: 12 }}
                            value={dataInizioMap[sq.id] ?? new Date().toISOString().split('T')[0]}
                            onChange={e => setDataInizioMap(p => ({ ...p, [sq.id]: e.target.value }))}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Tasto conferma */}
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => conferma(sq, c.numero_comunicato)}
                    disabled={confermando[sq.id] || (sq.tipo_sanzione !== 'ammenda' && !gId && !overrides[sq.id])}
                    style={{ flexShrink: 0 }}
                  >
                    {confermando[sq.id] ? '...' : 'Conferma'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── Sanzioni confermate ─── */}
      {confermate.length > 0 && (
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
            Sanzioni confermate ({confermate.length})
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--gray-light)', borderBottom: '1px solid var(--border)' }}>
                  {['Giocatore / Società', 'Tipo', 'Durata', 'Comunicato'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--gray)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {confermate.map((sq, i) => {
                  const giocatore = rosa.find(g => g.id === sq.giocatore_id)
                  const cfg       = TIPO_BADGE[sq.tipo_sanzione] ?? { label: sq.tipo_sanzione.toUpperCase(), cls: 'badge-grigio' }
                  return (
                    <tr key={sq.id} style={{
                      borderBottom: i < confermate.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                        {giocatore
                          ? `${giocatore.cognome} ${giocatore.nome}`
                          : <span style={{ color: 'var(--gray)', fontWeight: 400 }}>{sq.cognome_raw || sq.societa_raw}</span>
                        }
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--gray)' }}>{sq.durata}</td>
                      <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--gray)' }}>
                        Lega Pro{sq._comunicato.numero_comunicato ? ` n. ${sq._comunicato.numero_comunicato}` : ''}<br />
                        {fmt(sq._comunicato.data_comunicato)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {comunicati.length === 0 && !loading && (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--gray)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 8 }}>
            Nessun comunicato Lega Pro caricato
          </div>
          <div style={{ fontSize: 13 }}>
            Carica il PDF del Comunicato Ufficiale del Giudice Sportivo di Lega Pro per estrarre i provvedimenti.
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

export default function ComunicatiLegaProPage() {
  return (
    <ProOnlyFeature
      fallback={
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--gray)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 8 }}>
            Funzione disponibile per club di Serie C e superiori
          </div>
        </div>
      }
    >
      <ComunicatiLegaProContent />
    </ProOnlyFeature>
  )
}
