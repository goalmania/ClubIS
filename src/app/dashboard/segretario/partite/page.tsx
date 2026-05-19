'use client'
import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useSharedData } from '@/hooks/useSharedData'
import { Toast } from '@/components/ui'

/* ─── Tipi ───────────────────────────────────────────────────────── */

type Tab = 'calendario' | 'statistiche' | 'importa-pdf'
type StatoPartita = 'programmata' | 'giocata' | 'annullata' | 'rinviata'

interface Partita {
  id: string
  avversario: string
  data_ora: string
  tipo: string
  casa_trasferta: 'casa' | 'trasferta' | 'neutro'
  campo: string | null
  gol_fatti: number | null
  gol_subiti: number | null
  stato: StatoPartita
  giornata: number | null
  competizione: string | null
  squadra_id: string
  squadre: { nome: string } | null
}

interface EditState {
  gf: string
  gs: string
  stato: StatoPartita
}

interface SquadraStats {
  id: string
  nome: string
  categoria_eta: string
  lista: Partita[]
}

interface PartitaEstratta {
  data: string
  ora: string
  squadraCasa: string
  squadraOspite: string
  campo?: string
  giornata?: number
}

/* ─── Helpers stats ──────────────────────────────────────────────── */

function calcolaStats(lista: Partita[]) {
  const giocate = lista.filter(p => p.stato === 'giocata')
  const casa = giocate.filter(p => p.casa_trasferta === 'casa')
  const trasferta = giocate.filter(p => p.casa_trasferta === 'trasferta')

  const esito = (p: Partita) => {
    const gf = p.gol_fatti ?? 0, gs = p.gol_subiti ?? 0
    if (gf > gs) return 'V'
    if (gf < gs) return 'S'
    return 'P'
  }

  const perc = (n: number, tot: number) => tot === 0 ? 0 : Math.round(n / tot * 100)

  const vCasa = casa.filter(p => esito(p) === 'V').length
  const pCasa = casa.filter(p => esito(p) === 'P').length
  const sCasa = casa.filter(p => esito(p) === 'S').length
  const vTrasf = trasferta.filter(p => esito(p) === 'V').length
  const pTrasf = trasferta.filter(p => esito(p) === 'P').length
  const sTrasf = trasferta.filter(p => esito(p) === 'S').length

  const gfTot = giocate.reduce((s, p) => s + (p.gol_fatti ?? 0), 0)
  const gsTot = giocate.reduce((s, p) => s + (p.gol_subiti ?? 0), 0)
  const cleanSheet = giocate.filter(p => (p.gol_subiti ?? 0) === 0).length
  const forma = giocate.slice(0, 5).map(esito)

  return {
    totale: giocate.length,
    v: giocate.filter(p => esito(p) === 'V').length,
    punti: giocate.filter(p => esito(p) === 'V').length * 3 + giocate.filter(p => esito(p) === 'P').length,
    casa: {
      tot: casa.length,
      v: vCasa, p: pCasa, s: sCasa,
      percV: perc(vCasa, casa.length),
      percP: perc(pCasa, casa.length),
      percS: perc(sCasa, casa.length),
    },
    trasferta: {
      tot: trasferta.length,
      v: vTrasf, p: pTrasf, s: sTrasf,
      percV: perc(vTrasf, trasferta.length),
      percP: perc(pTrasf, trasferta.length),
      percS: perc(sTrasf, trasferta.length),
    },
    mediaGF: giocate.length ? (gfTot / giocate.length).toFixed(2) : '0.00',
    mediaGS: giocate.length ? (gsTot / giocate.length).toFixed(2) : '0.00',
    cleanSheet,
    forma,
  }
}

/* ─── Sub-componenti ─────────────────────────────────────────────── */

function FormaBadge({ esito }: { esito: string }) {
  const cfg: Record<string, { bg: string; c: string }> = {
    V: { bg: 'var(--verde-lt)', c: 'var(--verde)' },
    P: { bg: 'var(--ambra-lt)', c: 'var(--ambra)' },
    S: { bg: 'var(--rosso-lt)', c: 'var(--rosso)' },
  }
  const s = cfg[esito] ?? { bg: 'var(--grigio-5)', c: 'var(--grigio-3)' }
  return (
    <span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: 4, alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: s.bg, color: s.c }}>
      {esito}
    </span>
  )
}

function PercBar({ perc, colore }: { perc: number; colore: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--grigio-5)', borderRadius: 3 }}>
        <div style={{ width: `${perc}%`, height: '100%', background: colore, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grigio-3)', width: 32, textAlign: 'right' }}>{perc}%</span>
    </div>
  )
}

function GruppoHeader({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grigio-3)', fontFamily: 'var(--font-display)' }}>
        {label}
      </span>
      <span style={{ fontSize: 10, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)' }}>({count})</span>
      <div style={{ flex: 1, height: 1, background: 'var(--grigio-5)' }} />
    </div>
  )
}

/* ─── Pagina principale ──────────────────────────────────────────── */

export default function SegretarioPartitePage() {
  const supabase = createClient()

  const [tab, setTab]           = useState<Tab>('calendario')
  const [partite, setPartite]   = useState<Partita[]>([])
  const [squadre, setSquadre]   = useState<{ id: string; nome: string; categoria_eta: string }[]>([])
  const [clubId, setClubId]     = useState<string | null>(null)
  const [nomeClub, setNomeClub] = useState('')
  const [filtro, setFiltro]     = useState<'tutte' | 'programmate' | 'giocate'>('tutte')

  // Inline editing
  const [editId, setEditId]     = useState<string | null>(null)
  const [editVal, setEditVal]   = useState<EditState>({ gf: '', gs: '', stato: 'giocata' })
  const [salvando, setSalvando] = useState(false)

  // PDF import
  const fileRef                 = useRef<HTMLInputElement>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfPartite, setPdfPartite] = useState<PartitaEstratta[]>([])
  const [pdfModalita, setPdfModalita] = useState<'salta' | 'sovrascrivi' | 'aggiorna_campo'>('salta')
  const [importando, setImportando] = useState(false)
  const [risultatoImport, setRisultatoImport] = useState<{ importate: number; saltate: number; conflitti: number } | null>(null)

  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  /* ── Load ────────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    const res = await fetch('/api/partite/lista')
    if (!res.ok) return
    const json = await res.json()
    if (json.clubId) setClubId(json.clubId)
    if (json.nomeClub) setNomeClub(json.nomeClub)
    setSquadre(json.squadre ?? [])
    setPartite((json.partite ?? []) as Partita[])
  }, [])

  useSharedData(load)

  /* ── Inline edit ─────────────────────────────────────────────── */

  function avviaEdit(p: Partita) {
    setEditId(p.id)
    setEditVal({
      gf: p.gol_fatti !== null ? String(p.gol_fatti) : '',
      gs: p.gol_subiti !== null ? String(p.gol_subiti) : '',
      stato: p.stato,
    })
  }

  async function salvaEdit() {
    if (!editId) return
    setSalvando(true)
    const payload: any = { stato: editVal.stato }
    if (editVal.gf !== '') payload.gol_fatti = parseInt(editVal.gf, 10)
    if (editVal.gs !== '') payload.gol_subiti = parseInt(editVal.gs, 10)
    if (editVal.gf !== '' && editVal.gs !== '') payload.stato = 'giocata'

    const res = await fetch('/api/partite', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editId, ...payload }),
    })
    const { error } = res.ok ? { error: null } : await res.json()
    setSalvando(false)
    setEditId(null)
    if (error) { setToast({ msg: 'Errore salvataggio', tipo: 'error' }); return }
    setToast({ msg: 'Risultato aggiornato', tipo: 'success' })
    await load()
  }

  /* ── PDF import ──────────────────────────────────────────────── */

  async function handlePdfFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfLoading(true)
    setPdfPartite([])
    setRisultatoImport(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/partite/importa-pdf', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setToast({ msg: data.error ?? 'Errore parsing PDF', tipo: 'error' }); return }
      setPdfPartite(data.partite ?? [])
      if (data.partite?.length === 0) setToast({ msg: 'Nessuna partita rilevata nel PDF', tipo: 'error' })
    } finally {
      setPdfLoading(false)
    }
  }

  async function importaPDF() {
    if (!pdfPartite.length || !squadre.length || !clubId) return
    setImportando(true)
    try {
      const nomeNorm = nomeClub.toLowerCase()
      const partiteConvertite = pdfPartite.map(p => {
        const casaNorm = p.squadraCasa.toLowerCase()
        const ct = casaNorm.includes(nomeNorm.slice(0, 5)) || nomeNorm.includes(casaNorm.slice(0, 5))
          ? 'casa' as const : 'trasferta' as const
        const avversario = ct === 'casa' ? p.squadraOspite : p.squadraCasa
        const [dd, mm, yyyy] = p.data.split('/')
        return {
          data_ora: `${yyyy}-${mm}-${dd}T${p.ora}:00`,
          avversario,
          casa_trasferta: ct,
          campo: p.campo,
          giornata: p.giornata,
        }
      })

      const res = await fetch('/api/figc/import-calendario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partite: partiteConvertite, modalita_conflitto: pdfModalita }),
      })
      const data = await res.json()
      if (!res.ok) { setToast({ msg: data.error ?? 'Errore importazione', tipo: 'error' }); return }
      setRisultatoImport(data)
      setToast({ msg: `Importate ${data.importate} partite`, tipo: 'success' })
      setPdfPartite([])
      await load()
    } finally {
      setImportando(false)
    }
  }

  /* ── Derived data ────────────────────────────────────────────── */

  const oggi = new Date()
  const elenco = filtro === 'programmate'
    ? partite.filter(p => p.stato === 'programmata')
    : filtro === 'giocate'
    ? partite.filter(p => p.stato === 'giocata')
    : partite

  const prossime = partite.filter(p => new Date(p.data_ora) >= oggi && p.stato === 'programmata')

  const squadreMap: Record<string, { nome: string; categoria_eta: string }> = {}
  for (const sq of squadre) squadreMap[sq.id] = { nome: sq.nome, categoria_eta: sq.categoria_eta ?? '' }

  const isPrima = (squadra_id: string) => squadreMap[squadra_id]?.categoria_eta === 'prima_squadra'

  const bySquadra: SquadraStats[] = squadre.map(sq => ({
    id: sq.id,
    nome: sq.nome,
    categoria_eta: sq.categoria_eta ?? '',
    lista: partite.filter(p => p.squadra_id === sq.id && p.stato === 'giocata'),
  }))

  const bySquadraPS   = bySquadra.filter(s => s.categoria_eta === 'prima_squadra')
  const bySquadraGiov = bySquadra.filter(s => s.categoria_eta !== 'prima_squadra')
  const hasBothGroups = bySquadraPS.length > 0 && bySquadraGiov.length > 0

  const prossimePS   = prossime.filter(p => isPrima(p.squadra_id))
  const prossimeGiov = prossime.filter(p => !isPrima(p.squadra_id))

  const elencoPS   = elenco.filter(p => isPrima(p.squadra_id))
  const elencoGiov = elenco.filter(p => !isPrima(p.squadra_id))

  const esitoColore = (p: Partita) => {
    if (p.gol_fatti === null) return undefined
    if (p.gol_fatti > (p.gol_subiti ?? 0)) return 'var(--verde)'
    if (p.gol_fatti < (p.gol_subiti ?? 0)) return 'var(--rosso)'
    return 'var(--ambra)'
  }

  /* ── Row render helper (evita ripetizione) ───────────────────── */

  function PartitaRow({ p }: { p: Partita }) {
    return (
      <tr key={p.id}>
        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, whiteSpace: 'nowrap' }}>
          {new Date(p.data_ora).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
          <span style={{ color: 'var(--grigio-4)', marginLeft: 4 }}>
            {new Date(p.data_ora).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </td>
        <td style={{ fontWeight: 500, fontSize: 13 }}>
          {p.casa_trasferta === 'trasferta' && <span style={{ fontSize: 10, color: 'var(--grigio-4)', marginRight: 4 }}>@</span>}
          {p.avversario}
        </td>
        <td style={{ fontSize: 11, color: 'var(--grigio-4)' }}>{(p.squadre as any)?.nome}</td>
        <td><span className="badge badge-grigio" style={{ fontSize: 10 }}>{p.tipo}</span></td>
        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--grigio-4)' }}>
          {p.giornata ? `G${p.giornata}` : '—'}
        </td>
        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: esitoColore(p) }}>
          {editId === p.id ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number" min={0} max={20}
                value={editVal.gf}
                onChange={e => setEditVal(v => ({ ...v, gf: e.target.value }))}
                style={{ width: 36, padding: '2px 4px', fontFamily: 'var(--font-mono)', fontSize: 13, textAlign: 'center', background: 'var(--grigio-6)', border: '1px solid var(--grigio-4)', color: 'var(--white)' }}
              />
              <span>–</span>
              <input
                type="number" min={0} max={20}
                value={editVal.gs}
                onChange={e => setEditVal(v => ({ ...v, gs: e.target.value }))}
                style={{ width: 36, padding: '2px 4px', fontFamily: 'var(--font-mono)', fontSize: 13, textAlign: 'center', background: 'var(--grigio-6)', border: '1px solid var(--grigio-4)', color: 'var(--white)' }}
              />
            </span>
          ) : (
            p.gol_fatti !== null ? `${p.gol_fatti} – ${p.gol_subiti}` : '—'
          )}
        </td>
        <td>
          {editId === p.id ? (
            <select
              value={editVal.stato}
              onChange={e => setEditVal(v => ({ ...v, stato: e.target.value as StatoPartita }))}
              style={{ fontSize: 11, padding: '2px 4px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-4)', color: 'var(--white)' }}
            >
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
              <button className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: '3px 8px' }} onClick={salvaEdit} disabled={salvando}>
                {salvando ? '…' : '✓'}
              </button>
              <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setEditId(null)}>
                ✕
              </button>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => avviaEdit(p)}>
              Modifica
            </button>
          )}
        </td>
      </tr>
    )
  }

  /* ── Render ──────────────────────────────────────────────────── */

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
            Partite
          </h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
            {prossime.length} programmate · {partite.filter(p => p.stato === 'giocata').length} giocate
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {(['calendario', 'statistiche', 'importa-pdf'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} {...(t === 'importa-pdf' ? { 'data-onboarding': 'btn-importa-calendario' } : {})} style={{
              padding: '8px 16px',
              fontFamily: 'var(--font-display)', fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              fontWeight: tab === t ? 700 : 500,
              background: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? 'var(--black)' : 'var(--grigio-3)',
              border: tab === t ? 'none' : '1px solid var(--grigio-5)',
              cursor: 'pointer',
            }}>
              {t === 'calendario' ? 'Calendario' : t === 'statistiche' ? 'Statistiche' : 'Importa PDF'}
            </button>
          ))}
          <Link href="/dashboard/segretario/partite/nuova" className="btn btn-primary btn-sm" style={{ marginLeft: 8 }}>
            + Nuova
          </Link>
        </div>
      </div>

      {/* ── Tab 1: Calendario ────────────────────────────────────── */}
      {tab === 'calendario' && (
        <>
          {/* Prossime — divise per gruppo */}
          {prossime.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              {[
                { label: 'Prima Squadra — Prossime', list: prossimePS },
                { label: 'Settore Giovanile — Prossime', list: prossimeGiov },
              ].filter(g => g.list.length > 0).map(gruppo => (
                <div key={gruppo.label} style={{ marginBottom: 16 }}>
                  {hasBothGroups
                    ? <GruppoHeader label={gruppo.label} count={gruppo.list.length} />
                    : <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grigio-4)', marginBottom: 10 }}>
                        Prossime ({prossime.length})
                      </div>
                  }
                  {gruppo.list.slice(0, 3).map(p => (
                    <div key={p.id} className="card" style={{ padding: '12px 18px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 3, height: 40, borderRadius: 2, background: 'var(--verde)', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {p.casa_trasferta === 'trasferta' ? '@ ' : 'vs '}{p.avversario}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--grigio-3)', marginTop: 2 }}>
                          {new Date(p.data_ora).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {' · '}{new Date(p.data_ora).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          {p.campo && ` · ${p.campo}`}
                        </div>
                      </div>
                      <span className="badge badge-grigio" style={{ fontSize: 10 }}>{(p.squadre as any)?.nome}</span>
                      <Link href={`/dashboard/segretario/distinte?partita=${p.id}`} className="btn btn-secondary btn-sm">Distinta</Link>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Filtri */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {([['tutte', 'Tutte'], ['programmate', 'Programmate'], ['giocate', 'Giocate']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setFiltro(v)} className={`btn btn-sm ${filtro === v ? 'btn-primary' : 'btn-ghost'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Tabella — divisa per gruppo */}
          {elenco.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>Nessuna partita</div>
          ) : (
            <>
              {[
                { label: 'Prima Squadra', rows: elencoPS },
                { label: 'Settore Giovanile', rows: elencoGiov },
              ].filter(g => g.rows.length > 0).map(gruppo => (
                <div key={gruppo.label} style={{ marginBottom: 24 }}>
                  {hasBothGroups && <GruppoHeader label={gruppo.label} count={gruppo.rows.length} />}
                  <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Data</th><th>Avversario</th><th>Squadra</th><th>Tipo</th>
                            <th>G</th><th>Risultato</th><th>Stato</th><th style={{ width: 110 }}>Azioni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gruppo.rows.map(p => <PartitaRow key={p.id} p={p} />)}
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
          {bySquadra.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
              Nessuna squadra attiva
            </div>
          ) : (
            <>
              {[
                { label: 'Prima Squadra', squads: bySquadraPS },
                { label: 'Settore Giovanile', squads: bySquadraGiov },
              ].filter(g => g.squads.length > 0).map(gruppo => (
                <div key={gruppo.label} style={{ marginBottom: 32 }}>
                  {hasBothGroups && <GruppoHeader label={gruppo.label} count={gruppo.squads.length} />}
                  {gruppo.squads.map(sq => {
                    const s = calcolaStats(sq.lista)
                    if (s.totale === 0) return (
                      <div key={sq.id} className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grigio-4)', marginBottom: 8 }}>{sq.nome}</div>
                        <div style={{ color: 'var(--grigio-4)', fontSize: 13 }}>Nessuna partita giocata</div>
                      </div>
                    )
                    return (
                      <div key={sq.id} style={{ marginBottom: 28 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grigio-4)', fontFamily: 'var(--font-display)', marginBottom: 12 }}>
                          {sq.nome}
                        </div>

                        {/* KPI row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
                          {[
                            { l: 'Giocate', v: s.totale },
                            { l: 'Punti', v: s.punti, c: 'var(--verde)' },
                            { l: 'Media Gol +', v: s.mediaGF, c: 'var(--verde)' },
                            { l: 'Media Gol –', v: s.mediaGS, c: 'var(--rosso)' },
                            { l: 'Clean Sheet', v: s.cleanSheet, c: s.cleanSheet > 0 ? 'var(--verde)' : undefined },
                          ].map(stat => (
                            <div key={stat.l} className="stat-card" style={{ padding: '10px 12px' }}>
                              <div className="stat-label" style={{ fontSize: 10 }}>{stat.l}</div>
                              <div className="stat-value" style={{ fontSize: 20, color: (stat as any).c }}>{stat.v}</div>
                            </div>
                          ))}
                        </div>

                        {/* Casa vs Trasferta */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                          <div className="card" style={{ padding: '16px 20px' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grigio-4)', marginBottom: 12 }}>
                              Casa · {s.casa.tot} partite
                            </div>
                            {[
                              { l: 'Vittorie',  v: s.casa.v, p: s.casa.percV, c: 'var(--verde)' },
                              { l: 'Pareggi',   v: s.casa.p, p: s.casa.percP, c: 'var(--ambra)' },
                              { l: 'Sconfitte', v: s.casa.s, p: s.casa.percS, c: 'var(--rosso)' },
                            ].map(r => (
                              <div key={r.l} style={{ marginBottom: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <span style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{r.l}</span>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: r.c, fontWeight: 700 }}>{r.v}</span>
                                </div>
                                <PercBar perc={r.p} colore={r.c} />
                              </div>
                            ))}
                          </div>
                          <div className="card" style={{ padding: '16px 20px' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grigio-4)', marginBottom: 12 }}>
                              Trasferta · {s.trasferta.tot} partite
                            </div>
                            {[
                              { l: 'Vittorie',  v: s.trasferta.v, p: s.trasferta.percV, c: 'var(--verde)' },
                              { l: 'Pareggi',   v: s.trasferta.p, p: s.trasferta.percP, c: 'var(--ambra)' },
                              { l: 'Sconfitte', v: s.trasferta.s, p: s.trasferta.percS, c: 'var(--rosso)' },
                            ].map(r => (
                              <div key={r.l} style={{ marginBottom: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <span style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{r.l}</span>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: r.c, fontWeight: 700 }}>{r.v}</span>
                                </div>
                                <PercBar perc={r.p} colore={r.c} />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Forma recente */}
                        {s.forma.length > 0 && (
                          <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grigio-4)', fontWeight: 600 }}>
                              Forma recente
                            </span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {s.forma.map((e, i) => <FormaBadge key={i} esito={e} />)}
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

      {/* ── Tab 3: Importa PDF ───────────────────────────────────── */}
      {tab === 'importa-pdf' && (
        <div>
          <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', marginBottom: 4 }}>
              Importa calendario da PDF
            </div>
            <p style={{ fontSize: 13, color: 'var(--grigio-3)', marginBottom: 16 }}>
              Carica il PDF del calendario ufficiale (es. comunicato FIGC). Il sistema estrarrà automaticamente le partite.
              Funziona con i formati più comuni. Per risultati ottimali usa il CSV tramite{' '}
              <Link href="/dashboard/segretario/figc/calendario" style={{ color: 'var(--accent)' }}>Import Calendario FIGC</Link>.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={lblStyle}>Nome club nel PDF</label>
                <input
                  className="input"
                  value={nomeClub}
                  onChange={e => setNomeClub(e.target.value)}
                  placeholder="Come appare nel PDF es. A.S.D. Esempio"
                  style={{ width: '100%' }}
                />
                <div style={{ fontSize: 11, color: 'var(--grigio-4)', marginTop: 4 }}>
                  Usato per rilevare casa/trasferta
                </div>
              </div>
              <div>
                <label style={lblStyle}>Conflitti (stessa data)</label>
                <select className="input" value={pdfModalita} onChange={e => setPdfModalita(e.target.value as typeof pdfModalita)} style={{ width: '100%' }}>
                  <option value="salta">Salta — lascia invariata</option>
                  <option value="aggiorna_campo">Aggiorna solo campo</option>
                  <option value="sovrascrivi">Sovrascrivi</option>
                </select>
              </div>
            </div>

            <div
              style={{ border: '2px dashed var(--grigio-5)', borderRadius: 8, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--grigio-6)' }}
              onClick={() => fileRef.current?.click()}
            >
              {pdfLoading ? (
                <div style={{ fontSize: 14, color: 'var(--grigio-3)' }}>Analisi PDF in corso…</div>
              ) : (
                <>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--grigio)' }}>Clicca per selezionare il PDF</div>
                  <div style={{ fontSize: 12, color: 'var(--grigio-4)', marginTop: 4 }}>Calendario FIGC, comunicati, calendari di campionato</div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={handlePdfFile} />
          </div>

          {pdfPartite.length > 0 && (
            <div className="card" style={{ overflow: 'hidden', padding: 0, marginBottom: 16 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Partite rilevate</span>
                  <span className="badge badge-verde">{pdfPartite.length} trovate</span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={importaPDF} disabled={importando}>
                  {importando ? 'Importazione…' : `Importa ${pdfPartite.length} partite`}
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>G</th><th>Data</th><th>Ora</th><th>Casa</th><th>Ospite</th><th>Campo</th></tr>
                  </thead>
                  <tbody>
                    {pdfPartite.map((p, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--grigio-4)' }}>{p.giornata ?? '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.data}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.ora}</td>
                        <td style={{ fontWeight: 500, fontSize: 13 }}>{p.squadraCasa}</td>
                        <td style={{ fontSize: 13 }}>{p.squadraOspite}</td>
                        <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{p.campo ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {risultatoImport && (
            <div className="card" style={{ padding: '20px 24px', borderLeft: '3px solid var(--verde)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Importazione completata</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { l: 'Importate', v: risultatoImport.importate, c: 'var(--verde)' },
                  { l: 'Saltate', v: risultatoImport.saltate },
                  { l: 'Conflitti', v: risultatoImport.conflitti, c: risultatoImport.conflitti > 0 ? 'var(--ambra)' : undefined },
                ].map(s => (
                  <div key={s.l} className="stat-card" style={{ padding: '10px 14px' }}>
                    <div className="stat-label" style={{ fontSize: 10 }}>{s.l}</div>
                    <div className="stat-value" style={{ fontSize: 24, color: (s as any).c }}>{s.v}</div>
                  </div>
                ))}
              </div>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 14 }} onClick={() => setTab('calendario')}>
                Vedi calendario →
              </button>
            </div>
          )}
        </div>
      )}

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

const lblStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontFamily: 'var(--font-display)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  color: 'var(--grigio-3)', marginBottom: 6, fontWeight: 600,
}
