'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  PageHeader, Modal, FormField, FormGrid, Select, Toast, EmptyState,
} from '@/components/ui'
import {
  TIPI_SCADENZA_FIGC, STATO_SCADENZA,
  coloreCountdown, labelCountdown,
  type TipoScadenzaFIGC,
} from '@/lib/scadenze-figc'
import { formatEuro } from '@/lib/helpers'

interface Scadenza {
  id: string
  titolo: string
  data_scadenza: string
  tipo: string
  importo_previsto: number | null
  stato: string
  note: string | null
  link_riferimento: string | null
  alert_giorni_prima: number
}

interface FormState {
  titolo: string
  data_scadenza: string
  tipo: TipoScadenzaFIGC
  importo_previsto: string
  note: string
  link_riferimento: string
  alert_giorni_prima: number
}

const FORM_VUOTO: FormState = {
  titolo: '', data_scadenza: '', tipo: 'altro',
  importo_previsto: '', note: '', link_riferimento: '', alert_giorni_prima: 30,
}

export default function ScadenzeFIGCPage() {
  const [scadenze, setScadenze] = useState<Scadenza[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAperto, setModalAperto] = useState(false)
  const [scadenzaInEdit, setScadenzaInEdit] = useState<Scadenza | null>(null)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' | 'info' } | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [filtroStato, setFiltroStato] = useState<'attive' | 'urgenti' | 'completate' | 'tutte'>('attive')
  const [form, setForm] = useState<FormState>(FORM_VUOTO)

  const carica = useCallback(async () => {
    const res = await fetch('/api/scadenze-figc')
    const d = await res.json()
    setScadenze(d.scadenze ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { carica() }, [carica])

  const giorniA = (data: string) =>
    Math.ceil((new Date(data).getTime() - Date.now()) / 86400000)

  // KPI
  const urgenti  = scadenze.filter(s => { const g = giorniA(s.data_scadenza); return s.stato !== 'completata' && g >= 0 && g <= 10 })
  const scadute  = scadenze.filter(s => s.stato === 'scaduta')
  const complete = scadenze.filter(s => s.stato === 'completata')
  const attive   = scadenze.filter(s => s.stato !== 'completata')
  const prossima = attive[0] ?? null

  // Filtro
  const lista: Scadenza[] = (() => {
    switch (filtroStato) {
      case 'attive':    return scadenze.filter(s => s.stato !== 'completata')
      case 'urgenti':   return scadenze.filter(s => { const g = giorniA(s.data_scadenza); return s.stato !== 'completata' && g >= 0 && g <= 30 })
      case 'completate': return scadenze.filter(s => s.stato === 'completata')
      default:          return scadenze
    }
  })()

  const apriNuova = () => {
    setScadenzaInEdit(null)
    setForm(FORM_VUOTO)
    setModalAperto(true)
  }

  const apriEdit = (s: Scadenza) => {
    setScadenzaInEdit(s)
    setForm({
      titolo: s.titolo,
      data_scadenza: s.data_scadenza,
      tipo: s.tipo as TipoScadenzaFIGC,
      importo_previsto: s.importo_previsto != null ? String(s.importo_previsto) : '',
      note: s.note ?? '',
      link_riferimento: s.link_riferimento ?? '',
      alert_giorni_prima: s.alert_giorni_prima ?? 30,
    })
    setModalAperto(true)
  }

  const chiudiModal = () => { setModalAperto(false); setScadenzaInEdit(null) }

  const salva = async () => {
    if (!form.titolo.trim() || !form.data_scadenza) {
      setToast({ msg: 'Titolo e data sono obbligatori', tipo: 'error' }); return
    }
    setSalvando(true)
    const payload = {
      ...(scadenzaInEdit ? { id: scadenzaInEdit.id, stato: scadenzaInEdit.stato } : {}),
      titolo: form.titolo.trim(),
      data_scadenza: form.data_scadenza,
      tipo: form.tipo,
      importo_previsto: form.importo_previsto ? parseFloat(form.importo_previsto) : null,
      note: form.note.trim() || null,
      link_riferimento: form.link_riferimento.trim() || null,
      alert_giorni_prima: form.alert_giorni_prima,
    }
    const res = await fetch('/api/scadenze-figc', {
      method: scadenzaInEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      setToast({ msg: scadenzaInEdit ? 'Scadenza aggiornata' : 'Scadenza aggiunta', tipo: 'success' })
      chiudiModal()
      carica()
    } else {
      const d = await res.json()
      setToast({ msg: d.error ?? 'Errore', tipo: 'error' })
    }
    setSalvando(false)
  }

  const segnaCompletata = async (s: Scadenza) => {
    const nuovoStato = s.stato === 'completata' ? 'da_fare' : 'completata'
    await fetch('/api/scadenze-figc', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, stato: nuovoStato }),
    })
    carica()
    setToast({ msg: nuovoStato === 'completata' ? '✓ Segnata come completata' : 'Riapertata', tipo: 'success' })
  }

  const elimina = async (id: string) => {
    if (!confirm('Eliminare questa scadenza?')) return
    await fetch(`/api/scadenze-figc?id=${id}`, { method: 'DELETE' })
    carica()
    setToast({ msg: 'Scadenza eliminata', tipo: 'info' })
  }

  const seedDefault = async () => {
    const res = await fetch('/api/scadenze-figc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed: true }),
    })
    const d = await res.json()
    if (!res.ok) {
      setToast({ msg: d.error ?? 'Errore nel caricamento delle scadenze', tipo: 'error' })
      return
    }
    if ((d.creati ?? 0) > 0) {
      setToast({ msg: `${d.creati} scadenze standard caricate`, tipo: 'success' })
      carica()
    } else {
      setToast({ msg: d.msg ?? 'Scadenze già presenti', tipo: 'info' })
    }
  }

  // Input style riutilizzabile
  const inp = {
    width: '100%', padding: '9px 12px',
    background: '#1a1a1a', border: '1px solid var(--border-solid)',
    borderRadius: 2, color: 'var(--white)', fontSize: 13,
    fontFamily: 'var(--font-sans)', outline: 'none',
  } as const

  return (
    <div>
      <PageHeader
        title="Scadenziario FIGC"
        subtitle="Iscrizioni campionato, tasse federali, tesseramenti, visite mediche"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            {scadenze.length === 0 && !loading && (
              <button
                onClick={seedDefault}
                style={{
                  padding: '9px 18px', background: 'transparent',
                  color: 'var(--grigio-3)', border: '1px solid var(--border-solid)',
                  borderRadius: 2, cursor: 'pointer',
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
                }}
              >
                Carica standard 2026/27
              </button>
            )}
            <button
              onClick={apriNuova}
              style={{
                padding: '9px 18px', background: 'var(--accent)', color: '#0a0a0a',
                border: 'none', borderRadius: 2, cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}
            >
              + Nuova scadenza
            </button>
          </div>
        }
      />

      {/* ── Banner prossima scadenza ─────────────────────────────────────── */}
      {prossima && (() => {
        const giorni = giorniA(prossima.data_scadenza)
        const col = coloreCountdown(giorni)
        const tipoMeta = TIPI_SCADENZA_FIGC[prossima.tipo as TipoScadenzaFIGC]
        return (
          <div style={{
            padding: '16px 20px', marginBottom: 20,
            background: `${col}10`,
            border: `1px solid ${col}44`,
            borderLeft: `4px solid ${col}`,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 900,
              fontSize: 42, color: col, lineHeight: 1, flexShrink: 0, minWidth: 52, textAlign: 'center',
            }}>
              {giorni >= 0 ? giorni : '!'}
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
                letterSpacing: '0.2em', textTransform: 'uppercase', color: col, marginBottom: 4,
              }}>
                {giorni < 0 ? 'SCADENZA SUPERATA'
                  : giorni === 0 ? 'SCADE OGGI'
                  : giorni === 1 ? 'SCADE DOMANI'
                  : `PROSSIMA SCADENZA — ${giorni} GIORNI`}
              </div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 900,
                textTransform: 'uppercase', fontSize: 16, color: 'var(--white)',
              }}>
                {tipoMeta?.icona} {prossima.titolo}
              </div>
              <div style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>
                {new Date(prossima.data_scadenza).toLocaleDateString('it-IT', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
                {prossima.importo_previsto != null && ` · Importo: ${formatEuro(Number(prossima.importo_previsto))}`}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── KPI ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 1, background: 'var(--border-solid)', marginBottom: 20,
      }}>
        {[
          { label: 'TOTALI',         value: scadenze.length,  color: 'var(--grigio-3)' },
          { label: 'URGENTI ≤10GG',  value: urgenti.length,   color: urgenti.length  > 0 ? '#ff4444' : '#c8f000' },
          { label: 'SCADUTE',        value: scadute.length,   color: scadute.length  > 0 ? '#ff4444' : '#c8f000' },
          { label: 'COMPLETATE',     value: complete.length,  color: '#c8f000' },
        ].map(k => (
          <div key={k.label} style={{ background: '#111', padding: '12px 18px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: k.color, lineHeight: 1 }}>
              {k.value}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#444', marginTop: 4 }}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtri ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {([
          { key: 'attive',     label: 'Attive' },
          { key: 'urgenti',    label: '⚠️ Urgenti ≤30gg' },
          { key: 'completate', label: '✓ Completate' },
          { key: 'tutte',      label: 'Tutte' },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setFiltroStato(f.key)}
            style={{
              padding: '7px 14px',
              background: filtroStato === f.key ? 'var(--accent)' : 'transparent',
              color: filtroStato === f.key ? '#0a0a0a' : 'var(--grigio-3)',
              border: filtroStato === f.key ? 'none' : '1px solid var(--border-solid)',
              borderRadius: 2, cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Lista ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
          Caricamento…
        </div>
      ) : scadenze.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase', fontSize: 18, marginBottom: 10, color: 'var(--white)' }}>
            Nessuna scadenza configurata
          </div>
          <p style={{ fontSize: 13, color: 'var(--grigio-4)', marginBottom: 24, lineHeight: 1.7 }}>
            Carica le scadenze standard per la stagione 2026/27<br />
            o aggiungi manualmente quelle del tuo campionato.
          </p>
          <button
            onClick={seedDefault}
            style={{
              padding: '11px 24px', background: 'var(--accent)', color: '#0a0a0a',
              border: 'none', borderRadius: 2, cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}
          >
            Carica scadenze standard 2026/27 →
          </button>
        </div>
      ) : lista.length === 0 ? (
        <EmptyState icon="✓" title="Nessuna scadenza in questo filtro" subtitle="Cambia il filtro per vedere altre scadenze" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {lista.map(s => {
            const giorni = giorniA(s.data_scadenza)
            const col = coloreCountdown(giorni)
            const tipoMeta = TIPI_SCADENZA_FIGC[s.tipo as TipoScadenzaFIGC]
            const statoMeta = STATO_SCADENZA[s.stato as keyof typeof STATO_SCADENZA]
            const isCompletata = s.stato === 'completata'

            return (
              <div key={s.id} className="card" style={{
                padding: '14px 20px',
                opacity: isCompletata ? 0.5 : 1,
                borderLeft: `4px solid ${isCompletata ? '#333' : col}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

                  {/* Countdown box */}
                  {!isCompletata && (
                    <div style={{ width: 52, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: col, lineHeight: 1 }}>
                        {giorni >= 0 ? giorni : '!'}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: col }}>
                        {giorni >= 0 ? 'giorni' : 'scad.'}
                      </div>
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontWeight: 700,
                        textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.04em',
                        color: 'var(--white)',
                      }}>
                        {tipoMeta?.icona} {s.titolo}
                      </span>
                      <span style={{
                        fontSize: 9, padding: '2px 6px',
                        background: `${statoMeta?.colore}22`,
                        border: `1px solid ${statoMeta?.colore}55`,
                        color: statoMeta?.colore,
                        fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase',
                      }}>
                        {statoMeta?.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>📅 {new Date(s.data_scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      {s.importo_previsto != null && <span>💰 {formatEuro(Number(s.importo_previsto))}</span>}
                      {s.note && <span style={{ color: '#555' }}>📝 {s.note.slice(0, 60)}{s.note.length > 60 ? '…' : ''}</span>}
                    </div>
                  </div>

                  {/* Azioni */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {s.link_riferimento && (
                      <a
                        href={s.link_riferimento} target="_blank" rel="noopener noreferrer"
                        style={{
                          padding: '6px 10px', background: 'transparent',
                          color: 'var(--grigio-3)', border: '1px solid var(--border-solid)',
                          borderRadius: 2, cursor: 'pointer', fontSize: 12, textDecoration: 'none',
                        }}
                        title="Apri link portale"
                      >
                        🔗
                      </a>
                    )}
                    <button
                      onClick={() => apriEdit(s)}
                      style={{
                        padding: '6px 12px', background: 'transparent',
                        color: 'var(--grigio-3)', border: '1px solid var(--border-solid)',
                        borderRadius: 2, cursor: 'pointer', fontSize: 11,
                        fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => segnaCompletata(s)}
                      style={{
                        padding: '6px 12px',
                        background: isCompletata ? 'transparent' : 'var(--accent)',
                        color: isCompletata ? 'var(--grigio-3)' : '#0a0a0a',
                        border: isCompletata ? '1px solid var(--border-solid)' : 'none',
                        borderRadius: 2, cursor: 'pointer', fontSize: 11,
                        fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}
                    >
                      {isCompletata ? '↩ Riapri' : '✓ Fatto'}
                    </button>
                    <button
                      onClick={() => elimina(s.id)}
                      style={{
                        padding: '6px 10px', background: 'transparent',
                        color: '#ff4444', border: '1px solid rgba(255,68,68,0.3)',
                        borderRadius: 2, cursor: 'pointer', fontSize: 12,
                      }}
                      title="Elimina"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal nuova/modifica ──────────────────────────────────────────── */}
      {modalAperto && (
        <Modal
          open
          title={scadenzaInEdit ? 'Modifica scadenza' : 'Nuova scadenza FIGC'}
          onClose={chiudiModal}
          width={520}
        >
          <FormField label="Titolo scadenza" required>
            <input
              className="input"
              value={form.titolo}
              onChange={e => setForm(p => ({ ...p, titolo: e.target.value }))}
              placeholder="Es. Iscrizione campionato Eccellenza 2026/27"
            />
          </FormField>

          <FormGrid cols={2}>
            <FormField label="Data scadenza" required>
              <input
                className="input" type="date"
                value={form.data_scadenza}
                onChange={e => setForm(p => ({ ...p, data_scadenza: e.target.value }))}
              />
            </FormField>
            <FormField label="Tipo">
              <Select
                value={form.tipo}
                onChange={v => setForm(p => ({ ...p, tipo: v as TipoScadenzaFIGC }))}
                options={Object.entries(TIPI_SCADENZA_FIGC).map(([k, v]) => ({
                  value: k, label: `${v.icona} ${v.label}`,
                }))}
              />
            </FormField>
          </FormGrid>

          <FormGrid cols={2}>
            <FormField label="Importo previsto (€)" hint="Lascia vuoto se non noto">
              <input
                className="input" type="number" step="0.01" min="0"
                value={form.importo_previsto}
                onChange={e => setForm(p => ({ ...p, importo_previsto: e.target.value }))}
                placeholder="Es. 800.00"
              />
            </FormField>
            <FormField label="Alert giorni prima">
              <Select
                value={String(form.alert_giorni_prima)}
                onChange={v => setForm(p => ({ ...p, alert_giorni_prima: parseInt(v) }))}
                options={[
                  { value: '7',  label: '7 giorni prima' },
                  { value: '14', label: '14 giorni prima' },
                  { value: '30', label: '30 giorni prima' },
                  { value: '45', label: '45 giorni prima' },
                  { value: '60', label: '60 giorni prima' },
                ]}
              />
            </FormField>
          </FormGrid>

          <FormField label="Link portale FIGC" hint="URL diretto alla pagina sul portale federale">
            <input
              className="input" type="url"
              value={form.link_riferimento}
              onChange={e => setForm(p => ({ ...p, link_riferimento: e.target.value }))}
              placeholder="https://portale.figc.it/..."
            />
          </FormField>

          <FormField label="Note">
            <textarea
              className="input" rows={2}
              value={form.note}
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              placeholder="Istruzioni, documenti necessari…"
              style={{ resize: 'vertical' }}
            />
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              onClick={chiudiModal}
              style={{
                padding: '9px 20px', background: 'transparent',
                color: 'var(--grigio-3)', border: '1px solid var(--border-solid)',
                borderRadius: 2, cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}
            >
              Annulla
            </button>
            <button
              onClick={salva}
              disabled={salvando}
              style={{
                padding: '9px 22px', background: 'var(--accent)', color: '#0a0a0a',
                border: 'none', borderRadius: 2, cursor: salvando ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
                opacity: salvando ? 0.6 : 1,
              }}
            >
              {salvando ? 'Salvataggio…' : scadenzaInEdit ? 'Aggiorna →' : 'Aggiungi →'}
            </button>
          </div>
        </Modal>
      )}

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
