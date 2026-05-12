'use client'
import FeatureGate from '@/components/FeatureGate'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Toast } from '@/components/ui'
import Link from 'next/link'

/* ─── Types ─────────────────────────────────────────── */
interface GiocatoreRosa {
  id: string
  nome: string
  cognome: string
  numero_maglia: number | null
  ruolo_principale: string | null
}

interface SqualificaComunicato {
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
}

interface Comunicato {
  id: string
  comitato_regionale: string
  numero_comunicato: string | null
  data_comunicato: string
  processato: boolean
  created_at: string
  squalifiche: SqualificaComunicato[]
}

interface SqualificaAttiva {
  id: string
  giocatore_id: string
  partite_restanti: number
  tipo?: string
}

interface Infortunio {
  giocatore_id: string
}

const TIPO_COLOR: Record<string, string> = {
  squalifica: 'badge-rosso',
  diffida: 'badge-ambra',
  ammenda: 'badge-grigio',
}

const fmt = (d: string) => new Date(d).toLocaleDateString('it-IT')

/* ─── Component ──────────────────────────────────────── */
export default function FigcSqualifichePage() {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [clubId, setClubId] = useState<string | null>(null)
  const [rosa, setRosa] = useState<GiocatoreRosa[]>([])
  const [comunicati, setComunicati] = useState<Comunicato[]>([])
  const [squalificheAttive, setSqualificheAttive] = useState<SqualificaAttiva[]>([])
  const [infortuni, setInfortuni] = useState<Infortunio[]>([])
  const [loading, setLoading] = useState(true)

  // Upload form
  const [uploading, setUploading] = useState(false)
  const [comitato, setComitato] = useState('LND Puglia')
  const [numeroComun, setNumeroComun] = useState('')
  const [dataComun, setDataComun] = useState(new Date().toISOString().split('T')[0])

  // Review: override manuale giocatore_id per squalifica non matchata
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [confermando, setConfermando] = useState<Record<string, boolean>>({})
  const [dataInizioMap, setDataInizioMap] = useState<Record<string, string>>({})

  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
    if (!utente) return
    const cid = utente.club_id
    setClubId(cid)

    const today = new Date().toISOString().split('T')[0]

    const [
      { data: tessData },
      { data: communData },
      { data: sqData },
      { data: infData },
    ] = await Promise.all([
      supabase
        .from('tesseramenti')
        .select('numero_maglia, giocatori(id, nome, cognome, ruolo_principale)')
        .eq('club_id', cid)
        .eq('stato', 'attivo'),
      supabase
        .from('comunicati_figc')
        .select('id, comitato_regionale, numero_comunicato, data_comunicato, processato, created_at')
        .eq('club_id', cid)
        .order('data_comunicato', { ascending: false })
        .limit(10),
      supabase
        .from('squalifiche')
        .select('id, giocatore_id, partite_restanti')
        .eq('club_id', cid)
        .gt('partite_restanti', 0),
      supabase
        .from('infortuni')
        .select('giocatore_id')
        .eq('club_id', cid)
        .is('data_rientro_effettiva', null),
    ])

    setRosa(
      (tessData ?? []).map((t: any) => ({
        id: t.giocatori?.id,
        nome: t.giocatori?.nome ?? '',
        cognome: t.giocatori?.cognome ?? '',
        numero_maglia: t.numero_maglia ?? null,
        ruolo_principale: t.giocatori?.ruolo_principale ?? null,
      })).filter(g => g.id)
    )

    // Carica squalifiche_comunicato per ogni comunicato
    const ids = (communData ?? []).map((c: any) => c.id)
    let sqComData: any[] = []
    if (ids.length > 0) {
      const { data } = await supabase
        .from('squalifiche_comunicato')
        .select('*')
        .in('comunicato_id', ids)
      sqComData = data ?? []
    }

    const sqByComm = new Map<string, SqualificaComunicato[]>()
    for (const s of sqComData) {
      if (!sqByComm.has(s.comunicato_id)) sqByComm.set(s.comunicato_id, [])
      sqByComm.get(s.comunicato_id)!.push(s)
    }

    setComunicati(
      (communData ?? []).map((c: any) => ({
        ...c,
        squalifiche: sqByComm.get(c.id) ?? [],
      }))
    )
    setSqualificheAttive(sqData ?? [])
    setInfortuni(infData ?? [])
    setLoading(false)
  }

  async function uploadPdf(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) { setToast({ msg: 'Seleziona un PDF', tipo: 'error' }); return }
    setUploading(true)

    const fd = new FormData()
    fd.append('pdf', file)
    fd.append('comitato', comitato)
    fd.append('numero_comunicato', numeroComun)
    fd.append('data_comunicato', dataComun)

    try {
      const res = await fetch('/api/figc/comunicati/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Errore upload')
      setToast({ msg: `PDF analizzato: ${json.rilevanti ?? json.trovate} sanzioni del tuo club (su ${json.trovate} totali), ${json.matchate} abbinate alla rosa`, tipo: 'success' })
      if (fileRef.current) fileRef.current.value = ''
      await init()
    } catch (err: any) {
      setToast({ msg: err.message, tipo: 'error' })
    } finally {
      setUploading(false)
    }
  }

  async function conferma(sq: SqualificaComunicato, comunicatoRef: string | null) {
    const gId = overrides[sq.id] ?? sq.giocatore_id
    if (!gId) { setToast({ msg: 'Associa prima un giocatore', tipo: 'error' }); return }
    const dataInizio = dataInizioMap[sq.id] ?? new Date().toISOString().split('T')[0]

    setConfermando(p => ({ ...p, [sq.id]: true }))
    try {
      const res = await fetch(`/api/figc/comunicati/${sq.id}/conferma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          giocatore_id: gId,
          tipo_sanzione: sq.tipo_sanzione,
          durata: sq.durata,
          data_inizio: dataInizio,
          comunicato_ref: comunicatoRef,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setToast({ msg: `Squalifica confermata${json.data_fine ? ` — fine il ${fmt(json.data_fine)}` : ''}`, tipo: 'success' })
      await init()
    } catch (err: any) {
      setToast({ msg: err.message, tipo: 'error' })
    } finally {
      setConfermando(p => ({ ...p, [sq.id]: false }))
    }
  }

  // Stato griglia rosa
  const squalificatiSet = new Set(squalificheAttive.map(s => s.giocatore_id))
  const infortunatiSet = new Set(infortuni.map(i => i.giocatore_id))
  const sqMap = new Map(squalificheAttive.map(s => [s.giocatore_id, s]))

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--grigio-4)' }}>Caricamento...</div>

  return (
    <FeatureGate feature="monitor_squalifiche" featureLabel="Monitor Squalifiche">
        <div>
          <PageHeader
            title="Monitor Squalifiche"
            subtitle="Analisi comunicati LND — stato disponibilità rosa"
            actions={
              <Link href="/dashboard/allenatore/indisponibili" className="btn btn-secondary btn-sm">
                Vista allenatore
              </Link>
            }
          />

          {/* ─── SEZIONE 1: Upload comunicato ─── */}
          <div className="card" style={{ marginBottom: 24, padding: '20px 24px' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>1 — Carica comunicato ufficiale</div>
            <form onSubmit={uploadPdf}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
                <div>
                  <label className="label">Comitato regionale</label>
                  <input
                    className="input"
                    style={{ width: '100%', marginTop: 4 }}
                    value={comitato}
                    onChange={e => setComitato(e.target.value)}
                    placeholder="es. LND Puglia"
                  />
                </div>
                <div>
                  <label className="label">N° comunicato</label>
                  <input
                    className="input"
                    style={{ width: '100%', marginTop: 4 }}
                    value={numeroComun}
                    onChange={e => setNumeroComun(e.target.value)}
                    placeholder="es. 45/2026"
                  />
                </div>
                <div>
                  <label className="label">Data comunicato</label>
                  <input
                    className="input"
                    type="date"
                    style={{ width: '100%', marginTop: 4 }}
                    value={dataComun}
                    onChange={e => setDataComun(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div>
                    <label className="label">File PDF</label>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf"
                      style={{ marginTop: 4, fontSize: 12, color: 'var(--grigio-4)' }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={uploading}
                    style={{ flexShrink: 0, height: 38 }}
                  >
                    {uploading ? 'Analisi...' : 'Analizza PDF'}
                  </button>
                </div>
              </div>
            </form>

            {comunicati.length > 0 && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--grigio-4)', marginBottom: 8 }}>Comunicati caricati</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {comunicati.map(c => (
                    <span key={c.id} style={{
                      fontSize: 11, background: 'var(--grigio-6)', borderRadius: 4,
                      padding: '3px 10px', color: 'var(--grigio-3)',
                    }}>
                      {c.comitato_regionale} {c.numero_comunicato && `n. ${c.numero_comunicato}`} — {fmt(c.data_comunicato)}
                      <span style={{ marginLeft: 6, color: 'var(--verde)' }}>
                        ({c.squalifiche.length} sanzioni)
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── SEZIONE 2: Monitor Squalifiche + Review ─── */}
          {comunicati.length > 0 && (() => {
            // Solo sanzioni effettivamente del club:
            //   • ammende (nessun giocatore, riguardano la società)
            //   • squalifiche/diffide dove il giocatore abbinato è nella nostra rosa
            // Questo filtra anche i falsi positivi già salvati nel DB (vecchi upload)
            // dove la sola similarità di nome aveva incluso giocatori di altri club.
            const rosaIds = new Set(rosa.map(g => g.id))
            const tutteSanzioni = comunicati.flatMap(c =>
              c.squalifiche
                .filter(s =>
                  s.tipo_sanzione === 'ammenda' ||
                  (s.giocatore_id != null && rosaIds.has(s.giocatore_id))
                )
                .map(s => ({ ...s, _comunicato: c }))
            )
            if (tutteSanzioni.length === 0) return null

            const daConfermare = tutteSanzioni.filter(s => !s.confermato)
            const confermate   = tutteSanzioni.filter(s => s.confermato)

            return (
              <div className="card" style={{ marginBottom: 24, padding: '20px 24px' }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>2 — Sanzioni rilevate per la tua squadra</div>
                <div style={{ fontSize: 12, color: 'var(--grigio-4)', marginBottom: 18 }}>
                  Solo sanzioni estratte dai comunicati che riguardano il tuo club o i tuoi giocatori
                </div>

                {/* ── Da confermare ── */}
                {daConfermare.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ambra)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      ⚠ Da confermare ({daConfermare.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                      {daConfermare.map(sq => {
                        const c = sq._comunicato
                        const gId = overrides[sq.id] ?? sq.giocatore_id
                        const giocatoreMatch = rosa.find(g => g.id === gId)
                        const autoMatch = sq.match_score >= 0.72

                        return (
                          <div key={sq.id} style={{
                            border: `1px solid ${autoMatch ? 'var(--verde)' : 'var(--ambra)'}`,
                            borderRadius: 8,
                            padding: '14px 16px',
                            background: autoMatch ? 'rgba(34,197,94,0.04)' : 'rgba(245,158,11,0.04)',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr auto',
                            gap: 12,
                            alignItems: 'center',
                          }}>
                            {/* Info sanzione */}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>
                                {sq.cognome_raw} {sq.nome_raw}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--grigio-4)', marginBottom: 4 }}>
                                {sq.societa_raw}
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                <span className={`badge ${TIPO_COLOR[sq.tipo_sanzione] ?? 'badge-grigio'}`}>
                                  {sq.tipo_sanzione}
                                </span>
                                <span className="badge badge-grigio">{sq.durata}</span>
                                {autoMatch && (
                                  <span className="badge badge-verde" style={{ fontSize: 10 }}>
                                    match {Math.round(sq.match_score * 100)}%
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--grigio-4)', marginTop: 6 }}>
                                CU {c.comitato_regionale}{c.numero_comunicato ? ` n. ${c.numero_comunicato}` : ''} — {fmt(c.data_comunicato)}
                              </div>
                            </div>

                            {/* Associazione giocatore + data inizio */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {autoMatch && giocatoreMatch && (
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--verde)' }}>
                                  → {giocatoreMatch.cognome} {giocatoreMatch.nome}
                                </div>
                              )}
                              <select
                                className="input"
                                style={{ width: '100%', fontSize: 12 }}
                                value={overrides[sq.id] ?? sq.giocatore_id ?? ''}
                                onChange={e => setOverrides(p => ({ ...p, [sq.id]: e.target.value }))}
                              >
                                <option value="">
                                  {autoMatch && giocatoreMatch
                                    ? `✓ ${giocatoreMatch.cognome} ${giocatoreMatch.nome}`
                                    : 'Seleziona giocatore...'}
                                </option>
                                {[...rosa]
                                  .sort((a, b) => a.cognome.localeCompare(b.cognome))
                                  .map(g => (
                                    <option key={g.id} value={g.id}>
                                      {g.cognome} {g.nome}
                                      {g.numero_maglia != null ? ` (#${g.numero_maglia})` : ''}
                                    </option>
                                  ))}
                              </select>
                              <div>
                                <label className="label" style={{ fontSize: 11 }}>Data inizio</label>
                                <input
                                  className="input"
                                  type="date"
                                  style={{ width: '100%', marginTop: 2, fontSize: 12 }}
                                  value={dataInizioMap[sq.id] ?? new Date().toISOString().split('T')[0]}
                                  onChange={e => setDataInizioMap(p => ({ ...p, [sq.id]: e.target.value }))}
                                />
                              </div>
                            </div>

                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => conferma(sq, c.numero_comunicato)}
                              disabled={confermando[sq.id] || (!gId && !overrides[sq.id])}
                              style={{ flexShrink: 0 }}
                            >
                              {confermando[sq.id] ? '...' : 'Conferma'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* ── Confermate ── */}
                {confermate.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--grigio-4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      ✓ Confermate ({confermate.length})
                    </div>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: 'var(--grigio-6)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--grigio-4)' }}>Giocatore</th>
                            <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--grigio-4)' }}>Tipo</th>
                            <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--grigio-4)' }}>Durata</th>
                            <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--grigio-4)' }}>Comunicato</th>
                          </tr>
                        </thead>
                        <tbody>
                          {confermate.map((sq, i) => {
                            const giocatore = rosa.find(g => g.id === sq.giocatore_id)
                            const c = sq._comunicato
                            return (
                              <tr
                                key={sq.id}
                                style={{
                                  borderBottom: i < confermate.length - 1 ? '1px solid var(--border)' : 'none',
                                  background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                                }}
                              >
                                <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                                  {giocatore
                                    ? `${giocatore.cognome} ${giocatore.nome}`
                                    : <span style={{ color: 'var(--grigio-4)', fontWeight: 400 }}>{sq.cognome_raw} {sq.nome_raw}</span>
                                  }
                                  <div style={{ fontSize: 10, color: 'var(--grigio-4)', fontWeight: 400 }}>{sq.societa_raw}</div>
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <span className={`badge ${TIPO_COLOR[sq.tipo_sanzione] ?? 'badge-grigio'}`}>
                                    {sq.tipo_sanzione}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 14px', color: 'var(--grigio-3)' }}>{sq.durata}</td>
                                <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--grigio-4)' }}>
                                  {c.comitato_regionale}{c.numero_comunicato ? ` n. ${c.numero_comunicato}` : ''}<br />
                                  {fmt(c.data_comunicato)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )
          })()}

          {/* ─── SEZIONE 3: Griglia disponibilità rosa ─── */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>3 — Disponibilità attuale della rosa</div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--grigio-4)' }}>
                <span><span style={{ color: 'var(--verde)' }}>●</span> Disponibile</span>
                <span><span style={{ color: 'var(--rosso)' }}>●</span> Squalificato</span>
                <span><span style={{ color: 'var(--ambra)' }}>●</span> Diffidato</span>
                <span><span style={{ color: 'var(--grigio-4)' }}>●</span> Infortunato</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {[...rosa].sort((a, b) => a.cognome.localeCompare(b.cognome)).map(g => {
                const isSq = squalificatiSet.has(g.id)
                const isInf = infortunatiSet.has(g.id)
                const sq = sqMap.get(g.id)

                // Verifica diffida dal comunicato più recente
                const isDiff = comunicati.some(c =>
                  c.squalifiche.some(s =>
                    s.giocatore_id === g.id && s.tipo_sanzione === 'diffida' && s.confermato
                  )
                )

                let pallino = 'var(--verde)'
                let statoLabel = 'Disponibile'
                let sottotitolo: string | null = null

                if (isSq) {
                  pallino = 'var(--rosso)'
                  statoLabel = 'Squalificato'
                  sottotitolo = `${sq?.partite_restanti ?? '?'} gior. rimanenti`
                } else if (isInf) {
                  pallino = 'var(--grigio-4)'
                  statoLabel = 'Infortunato'
                } else if (isDiff) {
                  pallino = 'var(--ambra)'
                  statoLabel = 'Diffidato'
                  sottotitolo = 'Salterà la prossima in caso di ammonizione'
                }

                return (
                  <div key={g.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: isSq ? 'rgba(220,38,38,0.04)' : isInf ? 'rgba(100,100,100,0.04)' : isDiff ? 'rgba(245,158,11,0.04)' : 'transparent',
                  }}>
                    <div style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: pallino,
                      flexShrink: 0,
                    }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {g.numero_maglia != null ? <span style={{ fontSize: 10, color: 'var(--grigio-4)', marginRight: 4 }}>#{g.numero_maglia}</span> : null}
                        {g.cognome} {g.nome}
                      </div>
                      <div style={{ fontSize: 11, color: isSq ? 'var(--rosso)' : isDiff ? 'var(--ambra)' : 'var(--grigio-4)' }}>
                        {sottotitolo ?? statoLabel}
                      </div>
                    </div>
                  </div>
                )
              })}

              {rosa.length === 0 && (
                <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
                  Nessun giocatore tesserato attivo.{' '}
                  <Link href="/dashboard/segretario/tesseramenti" style={{ color: 'var(--accent)' }}>
                    Vai ai tesseramenti →
                  </Link>
                </div>
              )}
            </div>

            {/* Legenda riepilogo */}
            {rosa.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', gap: 20, fontSize: 12 }}>
                <span><strong style={{ color: 'var(--verde)' }}>{rosa.filter(g => !squalificatiSet.has(g.id) && !infortunatiSet.has(g.id)).length}</strong> disponibili</span>
                <span><strong style={{ color: 'var(--rosso)' }}>{squalificheAttive.length}</strong> squalificati</span>
                <span><strong style={{ color: 'var(--grigio-4)' }}>{infortuni.length}</strong> infortunati</span>
              </div>
            )}
          </div>

          {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
        </div>
    </FeatureGate>
  )
}
