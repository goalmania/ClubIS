'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { Toast } from '@/components/ui'

/* ─── Tipi ───────────────────────────────────────────────────────── */

interface Scadenza {
  id: string
  tipo: string
  categoria_scadenza: string
  descrizione: string
  data_scadenza: string
  stato: string
  attestazione_caricata: boolean
  attestazione_url: string | null
  note: string | null
  importo_coinvolto: number | null
  stagione: string
}

type RischioLivello = 'verde' | 'giallo' | 'rosso'

/* ─── Costanti ────────────────────────────────────────────────────── */

const CATEGORIE_COLOR: Record<string, string> = {
  STIPENDI:   '#c8f000',
  COVISOC:    '#388bfd',
  ISCRIZIONE: '#ff9900',
  MERCATO:    '#00c8a0',
}

const STAGIONI = ['2026/27', '2027/28', '2025/26']

/* ─── Helpers ─────────────────────────────────────────────────────── */

function giorniA(data: string): number {
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  const d = new Date(data); d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - oggi.getTime()) / 86400000)
}

function fmtData(d: string): string {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtEuro(v: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

function calcolaRischio(scadenze: Scadenza[]): RischioLivello {
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  const scaduteNoAtt = scadenze.filter(s =>
    s.stato !== 'completata' && new Date(s.data_scadenza) < oggi
  )
  if (scaduteNoAtt.length > 0) return 'rosso'
  const critiche = scadenze.filter(s =>
    s.stato !== 'completata' && giorniA(s.data_scadenza) <= 30
  )
  if (critiche.length > 0) return 'giallo'
  return 'verde'
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function RischioIndicatore({ livello }: { livello: RischioLivello }) {
  const cfg = {
    verde:  { color: '#4cff88', bg: 'rgba(76,255,136,0.08)', border: 'rgba(76,255,136,0.25)', label: 'NESSUN RISCHIO', sub: 'Tutte le scadenze nei tempi' },
    giallo: { color: '#ffd600', bg: 'rgba(255,214,0,0.08)',  border: 'rgba(255,214,0,0.25)',  label: 'ATTENZIONE',    sub: 'Una o più scadenze entro 30 giorni' },
    rosso:  { color: '#ff4444', bg: 'rgba(255,68,68,0.08)',  border: 'rgba(255,68,68,0.25)',  label: 'RISCHIO PENALIZZAZIONE', sub: 'Scadenze scadute senza attestazione' },
  }[livello]

  return (
    <div style={{ padding: '20px 24px', background: cfg.bg, border: `1px solid ${cfg.border}`, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: cfg.color, flexShrink: 0, boxShadow: `0 0 10px ${cfg.color}` }} />
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: cfg.color }}>{cfg.label}</div>
        <div style={{ fontSize: 12, color: 'var(--grigio-3)', marginTop: 2 }}>{cfg.sub}</div>
      </div>
    </div>
  )
}

function Countdown({ scadenze }: { scadenze: Scadenza[] }) {
  const prossima = scadenze
    .filter(s => s.stato !== 'completata' && giorniA(s.data_scadenza) >= 0)
    .sort((a, b) => new Date(a.data_scadenza).getTime() - new Date(b.data_scadenza).getTime())[0]

  if (!prossima) return null

  const giorni = giorniA(prossima.data_scadenza)
  const color = giorni <= 2 ? '#ff4444' : giorni <= 7 ? '#ffd600' : 'var(--accent)'

  return (
    <div style={{ padding: '20px 24px', background: 'var(--grigio-7)', border: '1px solid var(--grigio-5)', marginBottom: 24, display: 'flex', gap: 24, alignItems: 'center' }}>
      <div style={{ textAlign: 'center', minWidth: 70 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700, color, lineHeight: 1 }}>{giorni}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grigio-3)', marginTop: 4 }}>giorni</div>
      </div>
      <div style={{ borderLeft: '1px solid var(--grigio-5)', paddingLeft: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grigio-3)', marginBottom: 4 }}>Prossima scadenza critica</div>
        <div style={{ fontWeight: 600, color: 'var(--white)', fontSize: 14 }}>{prossima.descrizione}</div>
        <div style={{ fontSize: 12, color: 'var(--grigio-3)', marginTop: 4 }}>
          {fmtData(prossima.data_scadenza)} &nbsp;·&nbsp;
          <span style={{ color: CATEGORIE_COLOR[prossima.categoria_scadenza] ?? 'var(--grigio-2)', fontFamily: 'var(--font-display)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {prossima.categoria_scadenza}
          </span>
        </div>
      </div>
    </div>
  )
}

function StatoIcona({ scadenza }: { scadenza: Scadenza }) {
  if (scadenza.stato === 'completata') {
    return <span title="Completata" style={{ color: '#4cff88', fontSize: 16 }}>✓</span>
  }
  const giorni = giorniA(scadenza.data_scadenza)
  if (giorni < 0) return <span title="Scaduta" style={{ color: '#ff4444', fontSize: 16 }}>✕</span>
  if (giorni <= 2) return <span title="Urgente" style={{ color: '#ff4444', fontSize: 16 }}>⚠</span>
  if (giorni <= 7) return <span title="In scadenza" style={{ color: '#ffd600', fontSize: 14 }}>⏱</span>
  return <span title="Futura" style={{ color: 'var(--grigio-4)', fontSize: 14 }}>◦</span>
}

function ScadenzaCard({
  s,
  onComplete,
  onUpdate,
  onDelete,
}: {
  s: Scadenza
  onComplete: (id: string, note: string) => void
  onUpdate: (id: string, fields: Partial<Scadenza>) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen]     = useState(false)
  const [nota, setNota]     = useState(s.note ?? '')
  const [importo, setImporto] = useState(String(s.importo_coinvolto ?? ''))
  const giorni = giorniA(s.data_scadenza)
  const isScaduta = giorni < 0 && s.stato !== 'completata'
  const isUrgente = giorni <= 7 && giorni >= 0 && s.stato !== 'completata'

  const rowBg = s.stato === 'completata'
    ? 'rgba(76,255,136,0.03)'
    : isScaduta ? 'rgba(255,68,68,0.05)'
    : isUrgente ? 'rgba(255,214,0,0.04)'
    : 'transparent'

  const borderLeft = s.stato === 'completata'
    ? '3px solid rgba(76,255,136,0.3)'
    : isScaduta ? '3px solid rgba(255,68,68,0.5)'
    : isUrgente ? '3px solid rgba(255,214,0,0.5)'
    : '3px solid transparent'

  return (
    <div style={{ background: rowBg, borderLeft, borderBottom: '1px solid var(--grigio-6)', opacity: s.stato === 'completata' ? 0.65 : 1 }}>
      {/* Row principale */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto auto 120px', gap: 12, padding: '12px 16px', alignItems: 'center', cursor: 'pointer' }}
      >
        <StatoIcona scadenza={s} />
        <div>
          <div style={{ fontWeight: 600, color: 'var(--white)', fontSize: 13 }}>{s.descrizione}</div>
          <div style={{ fontSize: 11, color: 'var(--grigio-3)', marginTop: 2 }}>
            <span style={{ color: CATEGORIE_COLOR[s.categoria_scadenza] ?? 'var(--grigio-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10, marginRight: 8 }}>
              {s.categoria_scadenza}
            </span>
            {s.importo_coinvolto ? fmtEuro(s.importo_coinvolto) + ' ·' : ''} {fmtData(s.data_scadenza)}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: isScaduta ? '#ff4444' : isUrgente ? '#ffd600' : 'var(--grigio-3)' }}>
          {giorni < 0 ? `${Math.abs(giorni)}gg scaduta` : giorni === 0 ? 'OGGI' : `${giorni}gg`}
        </div>
        <div>
          {s.attestazione_caricata && (
            <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: '#4cff88', background: 'rgba(76,255,136,0.1)', padding: '2px 6px' }}>ATT. ✓</span>
          )}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grigio-3)', textAlign: 'right' }}>
          {open ? '▲ chiudi' : '▼ dettagli'}
        </div>
      </div>

      {/* Espanso */}
      {open && (
        <div style={{ padding: '0 16px 16px 56px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grigio-3)', marginBottom: 4 }}>Note</label>
              <textarea
                value={nota}
                onChange={e => setNota(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '6px 10px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)', resize: 'none', fontFamily: 'inherit', fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grigio-3)', marginBottom: 4 }}>Importo coinvolto (€)</label>
              <input
                type="number"
                value={importo}
                onChange={e => setImporto(e.target.value)}
                placeholder="Facoltativo"
                style={{ width: '100%', padding: '6px 10px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)', fontSize: 12 }}
              />
            </div>
          </div>

          {s.attestazione_url && (
            <a href={s.attestazione_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
              📎 Attestazione caricata — visualizza
            </a>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {s.stato !== 'completata' && (
              <button
                onClick={() => onComplete(s.id, nota)}
                style={{ padding: '6px 16px', background: 'rgba(76,255,136,0.1)', border: '1px solid rgba(76,255,136,0.3)', color: '#4cff88', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
              >
                ✓ Segna come completata
              </button>
            )}
            <button
              onClick={() => onUpdate(s.id, { note: nota, importo_coinvolto: importo ? Number(importo) : null } as any)}
              style={{ padding: '6px 16px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)', cursor: 'pointer', fontSize: 12 }}
            >
              Salva note
            </button>
            <button
              onClick={() => onDelete(s.id)}
              style={{ padding: '6px 14px', background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', color: '#f66', cursor: 'pointer', fontSize: 12 }}
            >
              Elimina
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Componente principale ──────────────────────────────────────── */

export default function ComplianceProView() {
  const [scadenze, setScadenze]     = useState<Scadenza[]>([])
  const [loading, setLoading]       = useState(true)
  const [stagione, setStagione]     = useState(STAGIONI[0])
  const [seeding, setSeeding]       = useState(false)
  const [filtroCateg, setFiltroCateg] = useState<string>('TUTTE')
  const [filtroStato, setFiltroStato] = useState<string>('TUTTE')
  const [toast, setToast]           = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const notifDispatchedRef          = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/scadenze-pro')
    if (res.ok) setScadenze(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Dispatch notifiche una volta per sessione
  useEffect(() => {
    if (notifDispatchedRef.current) return
    notifDispatchedRef.current = true
    fetch('/api/scadenze-pro/notifiche', { method: 'POST' }).catch(() => {})
  }, [])

  async function seed() {
    if (!confirm(`Caricare le scadenze standard Serie C per la stagione ${stagione}? Le scadenze esistenti per questa stagione saranno sostituite.`)) return
    setSeeding(true)
    const res = await fetch('/api/scadenze-pro/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stagione }),
    })
    const data = await res.json()
    if (res.ok) {
      setToast({ msg: `Caricate ${data.inserite} scadenze standard per ${stagione}`, tipo: 'success' })
      load()
    } else {
      setToast({ msg: data.error ?? 'Errore', tipo: 'error' })
    }
    setSeeding(false)
  }

  async function complete(id: string, note: string) {
    const res = await fetch(`/api/scadenze-pro/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'completata', attestazione_caricata: false, note }),
    })
    if (res.ok) { setToast({ msg: 'Scadenza completata', tipo: 'success' }); load() }
    else setToast({ msg: 'Errore', tipo: 'error' })
  }

  async function update(id: string, fields: Partial<Scadenza>) {
    const current = scadenze.find(s => s.id === id)
    if (!current) return
    const res = await fetch(`/api/scadenze-pro/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: current.stato, attestazione_caricata: current.attestazione_caricata, ...fields }),
    })
    if (res.ok) { setToast({ msg: 'Aggiornato', tipo: 'success' }); load() }
    else setToast({ msg: 'Errore', tipo: 'error' })
  }

  async function elimina(id: string) {
    if (!confirm('Eliminare questa scadenza?')) return
    const res = await fetch(`/api/scadenze-pro/${id}`, { method: 'DELETE' })
    if (res.ok) { setToast({ msg: 'Eliminata', tipo: 'success' }); load() }
    else setToast({ msg: 'Errore', tipo: 'error' })
  }

  // Filtri
  const scadenzeStagione = scadenze.filter(s => s.stagione === stagione)
  const categorie = Array.from(new Set(scadenzeStagione.map(s => s.categoria_scadenza)))
  const scadenzeFiltrate = scadenzeStagione.filter(s => {
    if (filtroCateg !== 'TUTTE' && s.categoria_scadenza !== filtroCateg) return false
    if (filtroStato === 'DA_FARE') return s.stato !== 'completata'
    if (filtroStato === 'COMPLETATE') return s.stato === 'completata'
    if (filtroStato === 'URGENTI') return s.stato !== 'completata' && giorniA(s.data_scadenza) <= 7
    return true
  })

  const rischio = calcolaRischio(scadenzeStagione)

  // Stats
  const totale      = scadenzeStagione.length
  const completate  = scadenzeStagione.filter(s => s.stato === 'completata').length
  const urgenti     = scadenzeStagione.filter(s => s.stato !== 'completata' && giorniA(s.data_scadenza) <= 7 && giorniA(s.data_scadenza) >= 0).length
  const scadute     = scadenzeStagione.filter(s => s.stato !== 'completata' && giorniA(s.data_scadenza) < 0).length

  return (
    <>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
          Compliance COVISOC
        </h1>
        <p style={{ fontSize: 13, color: 'var(--grigio-3)', marginTop: 4 }}>
          Scadenze federali professionistiche — monitoraggio e attestazioni
        </p>
      </div>

      {/* Indicatore rischio */}
      <RischioIndicatore livello={rischio} />

      {/* Countdown prossima scadenza */}
      <Countdown scadenze={scadenzeStagione} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Totale', v: totale, color: 'var(--white)' },
          { label: 'Completate', v: completate, color: '#4cff88' },
          { label: 'Urgenti (≤7gg)', v: urgenti, color: '#ffd600' },
          { label: 'Scadute', v: scadute, color: '#ff4444' },
        ].map(({ label, v, color }) => (
          <div key={label} style={{ padding: '14px 18px', background: 'var(--grigio-7)', border: '1px solid var(--grigio-5)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grigio-3)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Stagione */}
        <select value={stagione} onChange={e => setStagione(e.target.value)} style={{ padding: '7px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)', fontSize: 12 }}>
          {STAGIONI.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Filtro categoria */}
        <select value={filtroCateg} onChange={e => setFiltroCateg(e.target.value)} style={{ padding: '7px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)', fontSize: 12 }}>
          <option value="TUTTE">Tutte le categorie</option>
          {categorie.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Filtro stato */}
        <select value={filtroStato} onChange={e => setFiltroStato(e.target.value)} style={{ padding: '7px 12px', background: 'var(--grigio-6)', border: '1px solid var(--grigio-5)', color: 'var(--white)', fontSize: 12 }}>
          <option value="TUTTE">Tutti gli stati</option>
          <option value="DA_FARE">Da completare</option>
          <option value="URGENTI">Urgenti (≤7gg)</option>
          <option value="COMPLETATE">Completate</option>
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={seed}
            disabled={seeding}
            style={{ padding: '7px 16px', background: 'rgba(200,240,0,0.08)', border: '1px solid rgba(200,240,0,0.2)', color: 'var(--accent)', cursor: seeding ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: seeding ? 0.6 : 1 }}
          >
            {seeding ? 'Caricamento…' : `⟳ Carica standard ${stagione}`}
          </button>
        </div>
      </div>

      {/* Lista scadenze */}
      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--grigio-3)', fontSize: 13 }}>Caricamento…</div>
      ) : scadenzeFiltrate.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--grigio-3)', fontFamily: 'var(--font-display)', fontSize: 13 }}>
          {totale === 0
            ? `Nessuna scadenza per la stagione ${stagione}. Clicca "Carica standard" per generarle.`
            : 'Nessuna scadenza corrisponde ai filtri selezionati.'}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--grigio-5)' }}>
          {scadenzeFiltrate.map(s => (
            <ScadenzaCard
              key={s.id}
              s={s}
              onComplete={complete}
              onUpdate={update}
              onDelete={elimina}
            />
          ))}
        </div>
      )}
    </>
  )
}
