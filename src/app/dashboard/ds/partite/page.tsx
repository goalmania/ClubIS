'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSharedData } from '@/hooks/useSharedData'
import { Modal, Toast } from '@/components/ui'

/* ─── Tipi ───────────────────────────────────────────────────────── */

type Tab = 'risultati' | 'statistiche' | 'manuale'
type StatoPartita = 'programmata' | 'giocata' | 'annullata' | 'rinviata'

interface Partita {
  id: string; avversario: string; data_ora: string; tipo: string
  casa_trasferta: 'casa' | 'trasferta' | 'neutro'
  gol_fatti: number | null; gol_subiti: number | null
  stato: StatoPartita; giornata: number | null; squadra_id: string
  squadre: { nome: string } | null
}

interface SquadraStats {
  id: string; nome: string; categoria_eta: string
  v: number; p: number; s: number; gf: number; gs: number
  vCasa: number; pCasa: number; sCasa: number
  vTrasf: number; pTrasf: number; sTrasf: number
  lista: Partita[]
}

type TipoPartita = 'campionato' | 'coppa' | 'amichevole'
type CasaTrasferta = 'casa' | 'trasferta'

interface FormState {
  squadraId: string; avversario: string; data: string
  gf: number; gs: number; ct: CasaTrasferta; tipo: TipoPartita
  competizione: string; giornata: string
}

const FORM_INIT: FormState = {
  squadraId: '', avversario: '', data: new Date().toISOString().split('T')[0],
  gf: 0, gs: 0, ct: 'casa', tipo: 'campionato', competizione: '', giornata: '',
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function perc(n: number, tot: number) { return tot === 0 ? 0 : Math.round(n / tot * 100) }

function PercBar({ p, c }: { p: number; c: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: 'var(--grigio-5)', borderRadius: 3 }}>
        <div style={{ width: `${p}%`, height: '100%', background: c, borderRadius: 3 }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grigio-3)', width: 30, textAlign: 'right' }}>{p}%</span>
    </div>
  )
}

function GruppoHeader({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grigio-3)', fontFamily: 'var(--font-display)' }}>{label}</span>
      <span style={{ fontSize: 10, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)' }}>({count})</span>
      <div style={{ flex: 1, height: 1, background: 'var(--grigio-5)' }} />
    </div>
  )
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 18px', fontFamily: 'var(--font-display)', fontSize: 12,
      textTransform: 'uppercase' as const, letterSpacing: '0.08em',
      fontWeight: active ? 700 : 500,
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? 'var(--black)' : 'var(--grigio-3)',
      border: active ? 'none' : '1px solid var(--grigio-5)', cursor: 'pointer',
    }}>
      {label}
    </button>
  )
}

/* ─── Pagina principale ──────────────────────────────────────────── */

export default function DSPartitePage() {
  const supabase = createClient()

  const [tab, setTab]             = useState<Tab>('risultati')
  const [clubId, setClubId]       = useState<string | null>(null)
  const [partite, setPartite]     = useState<Partita[]>([])
  const [squadre, setSquadre]     = useState<{ id: string; nome: string }[]>([])
  const [bySquadra, setBySquadra] = useState<Record<string, SquadraStats>>({})

  // Inline editing
  const [editId, setEditId]   = useState<string | null>(null)
  const [editVal, setEditVal] = useState<{ gf: string; gs: string; stato: StatoPartita }>({ gf: '', gs: '', stato: 'giocata' })
  const [salvando, setSalvando] = useState(false)

  // Manuale
  const [form, setForm]         = useState<FormState>(FORM_INIT)
  const [salvandoM, setSalvandoM] = useState(false)
  const [duplicate, setDuplicate] = useState<any | null>(null)

  const [toast, setToast]       = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  /* ── Load ────────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
    if (!utente) return
    setClubId(utente.club_id)

    const { data: sq } = await supabase.from('squadre').select('id, nome, categoria_eta').eq('club_id', utente.club_id).eq('attiva', true)
    const sqList = sq ?? []
    setSquadre(sqList)
    setForm(prev => ({ ...prev, squadraId: prev.squadraId || sqList[0]?.id || '' }))

    const ids = sqList.map((s: any) => s.id)
    const { data: p } = await supabase
      .from('partite').select('*, squadre(nome)')
      .in('squadra_id', ids.length ? ids : ['none'])
      .order('data_ora', { ascending: false }).limit(80)
    const lista = (p ?? []) as Partita[]
    setPartite(lista)

    const result: Record<string, SquadraStats> = {}
    sqList.forEach((s: any) => {
      result[s.id] = { id: s.id, nome: s.nome, categoria_eta: s.categoria_eta ?? '', v: 0, p: 0, s: 0, gf: 0, gs: 0, vCasa: 0, pCasa: 0, sCasa: 0, vTrasf: 0, pTrasf: 0, sTrasf: 0, lista: [] }
    })
    lista.filter(p => p.stato === 'giocata').forEach(p => {
      if (!result[p.squadra_id]) return
      const gf = p.gol_fatti ?? 0, gs = p.gol_subiti ?? 0
      result[p.squadra_id].gf += gf; result[p.squadra_id].gs += gs
      result[p.squadra_id].lista.push(p)
      const isCasa = p.casa_trasferta === 'casa'
      if (gf > gs) { result[p.squadra_id].v++; isCasa ? result[p.squadra_id].vCasa++ : result[p.squadra_id].vTrasf++ }
      else if (gf === gs) { result[p.squadra_id].p++; isCasa ? result[p.squadra_id].pCasa++ : result[p.squadra_id].pTrasf++ }
      else { result[p.squadra_id].s++; isCasa ? result[p.squadra_id].sCasa++ : result[p.squadra_id].sTrasf++ }
    })
    setBySquadra(result)
  }, [])

  useSharedData(load)

  /* ── Inline edit ─────────────────────────────────────────────── */

  function avviaEdit(p: Partita) {
    setEditId(p.id)
    setEditVal({ gf: p.gol_fatti !== null ? String(p.gol_fatti) : '', gs: p.gol_subiti !== null ? String(p.gol_subiti) : '', stato: p.stato })
  }

  async function salvaEdit() {
    if (!editId) return
    setSalvando(true)
    const payload: any = { stato: editVal.stato }
    if (editVal.gf !== '') payload.gol_fatti = parseInt(editVal.gf, 10)
    if (editVal.gs !== '') payload.gol_subiti = parseInt(editVal.gs, 10)
    if (editVal.gf !== '' && editVal.gs !== '') payload.stato = 'giocata'
    const { error } = await supabase.from('partite').update(payload).eq('id', editId)
    setSalvando(false); setEditId(null)
    if (error) { setToast({ msg: 'Errore salvataggio', tipo: 'error' }); return }
    setToast({ msg: 'Risultato aggiornato', tipo: 'success' })
    await load()
  }

  /* ── Inserimento manuale ─────────────────────────────────────── */

  function setF<K extends keyof FormState>(k: K, v: FormState[K]) { setForm(prev => ({ ...prev, [k]: v })) }

  async function inserisci(forza = false) {
    if (!form.squadraId || !form.avversario.trim()) { setToast({ msg: 'Avversario e squadra obbligatori', tipo: 'error' }); return }
    setSalvandoM(true)
    if (!forza) {
      const { data: existing } = await supabase.from('partite')
        .select('id, avversario, gol_fatti, gol_subiti').eq('squadra_id', form.squadraId)
        .gte('data_ora', `${form.data}T00:00:00`).lte('data_ora', `${form.data}T23:59:59`)
      const dup = existing?.find(e =>
        e.avversario.toLowerCase().includes(form.avversario.toLowerCase().slice(0, 5)) ||
        form.avversario.toLowerCase().includes(e.avversario.toLowerCase().slice(0, 5))
      )
      if (dup) { setSalvandoM(false); setDuplicate(dup); return }
    }
    const { error } = await supabase.from('partite').insert({
      squadra_id: form.squadraId, club_id: clubId, avversario: form.avversario.trim(),
      data_ora: `${form.data}T15:00:00`, gol_fatti: form.gf, gol_subiti: form.gs,
      casa_trasferta: form.ct, tipo: form.tipo, competizione: form.competizione.trim() || null,
      giornata: form.giornata ? parseInt(form.giornata) : null, stato: 'giocata',
    })
    setSalvandoM(false); setDuplicate(null)
    if (error) { setToast({ msg: 'Errore salvataggio', tipo: 'error' }); return }
    setToast({ msg: 'Risultato inserito', tipo: 'success' })
    setForm(prev => ({ ...FORM_INIT, squadraId: prev.squadraId }))
    await load(); setTab('risultati')
  }

  /* ── Render ──────────────────────────────────────────────────── */

  const sqStats = Object.values(bySquadra)
  const sqStatsPS   = sqStats.filter(s => s.categoria_eta === 'prima_squadra')
  const sqStatsGiov = sqStats.filter(s => s.categoria_eta !== 'prima_squadra')
  const hasBothGroups = sqStatsPS.length > 0 && sqStatsGiov.length > 0

  const isPrima = (squadra_id: string) => sqStatsPS.some(s => s.id === squadra_id)
  const partitePS   = partite.filter(p => isPrima(p.squadra_id))
  const partiteGiov = partite.filter(p => !isPrima(p.squadra_id))

  const giocate = partite.filter(p => p.stato === 'giocata')
  const programmate = partite.filter(p => p.stato === 'programmata')

  const esitoColore = (p: Partita) => {
    if (p.gol_fatti === null) return undefined
    if (p.gol_fatti > (p.gol_subiti ?? 0)) return 'var(--verde)'
    if (p.gol_fatti < (p.gol_subiti ?? 0)) return 'var(--rosso)'
    return 'var(--ambra)'
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Partite</h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
            {programmate.length} programmate · {giocate.length} giocate
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <TabBtn label="Risultati"   active={tab === 'risultati'}   onClick={() => setTab('risultati')} />
          <TabBtn label="Statistiche" active={tab === 'statistiche'} onClick={() => setTab('statistiche')} />
          <TabBtn label="Aggiungi"    active={tab === 'manuale'}     onClick={() => setTab('manuale')} />
        </div>
      </div>

      {/* ── Tab 1: Risultati con editing inline ──────────────────── */}
      {tab === 'risultati' && (
        <>
          {partite.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>Nessuna partita</div>
          ) : (
            <>
              {[
                { label: 'Prima Squadra', rows: partitePS },
                { label: 'Settore Giovanile', rows: partiteGiov },
              ].filter(g => g.rows.length > 0).map(gruppo => (
                <div key={gruppo.label} style={{ marginBottom: 24 }}>
                  {hasBothGroups && <GruppoHeader label={gruppo.label} count={gruppo.rows.length} />}
                  <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Data</th><th>Avversario</th><th>Squadra</th><th>Tipo</th><th>G</th><th>Risultato</th><th>Stato</th><th style={{ width: 110 }}>Azioni</th></tr>
              </thead>
              <tbody>
                {gruppo.rows.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(p.data_ora).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                    </td>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>
                      {p.casa_trasferta === 'trasferta' && <span style={{ fontSize: 10, color: 'var(--grigio-4)', marginRight: 4 }}>@</span>}
                      {p.avversario}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--grigio-4)' }}>{(p.squadre as any)?.nome}</td>
                    <td><span className="badge badge-grigio" style={{ fontSize: 10 }}>{p.tipo}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--grigio-4)' }}>{p.giornata ? `G${p.giornata}` : '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: esitoColore(p) }}>
                      {editId === p.id ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input type="number" min={0} max={20} value={editVal.gf} onChange={e => setEditVal(v => ({ ...v, gf: e.target.value }))}
                            style={{ width: 36, padding: '2px 4px', fontFamily: 'var(--font-mono)', fontSize: 13, textAlign: 'center', background: 'var(--grigio-6)', border: '1px solid var(--grigio-4)', color: 'var(--white)' }} />
                          <span>–</span>
                          <input type="number" min={0} max={20} value={editVal.gs} onChange={e => setEditVal(v => ({ ...v, gs: e.target.value }))}
                            style={{ width: 36, padding: '2px 4px', fontFamily: 'var(--font-mono)', fontSize: 13, textAlign: 'center', background: 'var(--grigio-6)', border: '1px solid var(--grigio-4)', color: 'var(--white)' }} />
                        </span>
                      ) : (
                        p.gol_fatti !== null ? `${p.gol_fatti} – ${p.gol_subiti}` : '—'
                      )}
                    </td>
                    <td>
                      {editId === p.id ? (
                        <select value={editVal.stato} onChange={e => setEditVal(v => ({ ...v, stato: e.target.value as StatoPartita }))}
                          style={{ fontSize: 11, padding: '2px 4px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-4)', color: 'var(--white)' }}>
                          <option value="programmata">Programmata</option>
                          <option value="giocata">Giocata</option>
                          <option value="rinviata">Rinviata</option>
                          <option value="annullata">Annullata</option>
                        </select>
                      ) : (
                        <span className={`badge ${p.stato === 'giocata' ? 'badge-verde' : p.stato === 'annullata' ? 'badge-rosso' : p.stato === 'rinviata' ? 'badge-ambra' : 'badge-grigio'}`} style={{ fontSize: 10 }}>
                          {p.stato}
                        </span>
                      )}
                    </td>
                    <td>
                      {editId === p.id ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: '3px 8px' }} onClick={salvaEdit} disabled={salvando}>{salvando ? '…' : '✓'}</button>
                          <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setEditId(null)}>✕</button>
                        </div>
                      ) : (
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => avviaEdit(p)}>Modifica</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* ── Tab 2: Statistiche ───────────────────────────────────── */}
      {tab === 'statistiche' && (
        <>
          {sqStats.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>Nessuna squadra attiva</div>
          ) : (
            <>
              {[
                { label: 'Prima Squadra', squads: sqStatsPS },
                { label: 'Settore Giovanile', squads: sqStatsGiov },
              ].filter(g => g.squads.length > 0).map(gruppo => (
                <div key={gruppo.label} style={{ marginBottom: 32 }}>
                  {hasBothGroups && <GruppoHeader label={gruppo.label} count={gruppo.squads.length} />}
                  {gruppo.squads.map(sq => {
            const tot = sq.v + sq.p + sq.s
            if (tot === 0) return (
              <div key={sq.id} className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--grigio-4)', marginBottom: 6 }}>{sq.nome}</div>
                <div style={{ color: 'var(--grigio-4)', fontSize: 13 }}>Nessuna partita giocata</div>
              </div>
            )
            const totCasa = sq.vCasa + sq.pCasa + sq.sCasa
            const totTrasf = sq.vTrasf + sq.pTrasf + sq.sTrasf
            const cleanSheet = sq.lista.filter(p => (p.gol_subiti ?? 0) === 0).length
            const forma = sq.lista.slice(0, 5).map(p => {
              const gf = p.gol_fatti ?? 0, gs = p.gol_subiti ?? 0
              return gf > gs ? 'V' : gf < gs ? 'S' : 'P'
            })
            return (
              <div key={sq.id} style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grigio-4)', fontFamily: 'var(--font-display)', marginBottom: 12 }}>{sq.nome}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 14 }}>
                  {[
                    { l: 'Giocate', v: tot },
                    { l: 'Punti',   v: sq.v * 3 + sq.p, c: 'var(--verde)' },
                    { l: 'Media Gol +', v: (sq.gf / tot).toFixed(2), c: 'var(--verde)' },
                    { l: 'Media Gol –', v: (sq.gs / tot).toFixed(2), c: 'var(--rosso)' },
                    { l: 'Clean Sheet', v: cleanSheet, c: cleanSheet > 0 ? 'var(--verde)' : undefined },
                  ].map(s => (
                    <div key={s.l} className="stat-card" style={{ padding: '10px 12px' }}>
                      <div className="stat-label" style={{ fontSize: 10 }}>{s.l}</div>
                      <div className="stat-value" style={{ fontSize: 20, color: (s as any).c }}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  {[
                    { titolo: 'Casa', tot: totCasa, v: sq.vCasa, p: sq.pCasa, s: sq.sCasa },
                    { titolo: 'Trasferta', tot: totTrasf, v: sq.vTrasf, p: sq.pTrasf, s: sq.sTrasf },
                  ].map(col => (
                    <div key={col.titolo} className="card" style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grigio-4)', marginBottom: 12 }}>
                        {col.titolo} · {col.tot} partite
                      </div>
                      {[
                        { l: 'Vittorie',  n: col.v, c: 'var(--verde)' },
                        { l: 'Pareggi',   n: col.p, c: 'var(--ambra)' },
                        { l: 'Sconfitte', n: col.s, c: 'var(--rosso)' },
                      ].map(r => (
                        <div key={r.l} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{r.l}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: r.c, fontWeight: 700 }}>{r.n}</span>
                          </div>
                          <PercBar p={perc(r.n, col.tot)} c={r.c} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {forma.length > 0 && (
                  <div className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grigio-4)', fontWeight: 600 }}>Forma recente</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {forma.map((e, i) => {
                        const cfg: Record<string, { bg: string; c: string }> = {
                          V: { bg: 'var(--verde-lt)', c: 'var(--verde)' },
                          P: { bg: 'var(--ambra-lt)', c: 'var(--ambra)' },
                          S: { bg: 'var(--rosso-lt)', c: 'var(--rosso)' },
                        }
                        const s = cfg[e]
                        return <span key={i} style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: 4, alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: s.bg, color: s.c }}>{e}</span>
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* ── Tab 3: Inserimento manuale ────────────────────────────── */}
      {tab === 'manuale' && (
        <div className="card" style={{ padding: 24, maxWidth: 640 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 14, letterSpacing: '0.06em', marginBottom: 20, color: 'var(--white)' }}>
            Inserisci risultato manualmente
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {squadre.length > 1 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lblStyle}>Squadra</label>
                <select className="input" value={form.squadraId} onChange={e => setF('squadraId', e.target.value)} style={{ width: '100%' }}>
                  {squadre.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lblStyle}>Avversario *</label>
              <input className="input" value={form.avversario} onChange={e => setF('avversario', e.target.value)} placeholder="Es. ASD Virtus Calcio" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={lblStyle}>Data *</label>
              <input className="input" type="date" value={form.data} onChange={e => setF('data', e.target.value)} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={lblStyle}>Casa / Trasferta</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                {(['casa', 'trasferta'] as CasaTrasferta[]).map(opt => (
                  <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="radio" name="ct-ds" value={opt} checked={form.ct === opt} onChange={() => setF('ct', opt)} style={{ accentColor: 'var(--accent)' }} />
                    <span style={{ textTransform: 'capitalize', color: 'var(--grigio-2)' }}>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={lblStyle}>Gol fatti</label>
              <input className="input" type="number" min={0} max={20} value={form.gf} onChange={e => setF('gf', parseInt(e.target.value) || 0)} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={lblStyle}>Gol subiti</label>
              <input className="input" type="number" min={0} max={20} value={form.gs} onChange={e => setF('gs', parseInt(e.target.value) || 0)} style={{ width: '100%' }} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, letterSpacing: '0.05em', color: form.gf > form.gs ? 'var(--verde)' : form.gf < form.gs ? 'var(--rosso)' : 'var(--ambra)' }}>
                {form.gf} – {form.gs}
              </div>
            </div>
            <div>
              <label style={lblStyle}>Tipo</label>
              <select className="input" value={form.tipo} onChange={e => setF('tipo', e.target.value as TipoPartita)} style={{ width: '100%' }}>
                {(['campionato', 'coppa', 'amichevole'] as TipoPartita[]).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lblStyle}>Giornata</label>
              <input className="input" type="number" min={1} value={form.giornata} onChange={e => setF('giornata', e.target.value)} placeholder="Es. 12" style={{ width: '100%' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lblStyle}>Competizione</label>
              <input className="input" value={form.competizione} onChange={e => setF('competizione', e.target.value)} placeholder="Es. Eccellenza Puglia" style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => inserisci(false)} disabled={salvandoM || !form.avversario.trim() || !form.squadraId}>
              {salvandoM ? 'Salvo…' : 'Salva risultato'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setForm(prev => ({ ...FORM_INIT, squadraId: prev.squadraId }))}>Reset</button>
          </div>
        </div>
      )}

      <Modal open={!!duplicate} onClose={() => setDuplicate(null)} title="Partita già presente" width={440}>
        {duplicate && (
          <div style={{ padding: 20 }}>
            <p style={{ fontSize: 14, color: 'var(--grigio-2)', marginBottom: 16 }}>Esiste già una partita nella stessa data con avversario simile:</p>
            <div className="card" style={{ padding: '12px 16px', marginBottom: 20, background: 'var(--grigio-6)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{duplicate.avversario}</div>
              <div style={{ fontSize: 12, color: 'var(--grigio-4)', marginTop: 4 }}>{duplicate.gol_fatti} – {duplicate.gol_subiti}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setDuplicate(null)}>Annulla</button>
              <button className="btn btn-primary btn-sm" onClick={() => inserisci(true)} disabled={salvandoM}>{salvandoM ? 'Salvo…' : 'Inserisci comunque'}</button>
            </div>
          </div>
        )}
      </Modal>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

const lblStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontFamily: 'var(--font-display)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  color: 'var(--grigio-3)', marginBottom: 6, fontWeight: 600,
}
