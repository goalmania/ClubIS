'use client'
import { useState, useEffect, useCallback } from 'react'
import { PageHeader, TabBar, Modal, FormField, Select, Toast, EmptyState } from '@/components/ui'
import { stagioneCorrente } from '@/lib/helpers'

const STATI_PRATICA = {
  da_avviare: { label: 'Da avviare', colore: '#888888' },
  in_corso:   { label: 'In corso',   colore: '#ff9900' },
  bloccata:   { label: 'Bloccata',   colore: '#ff4444' },
  completata: { label: 'Completata', colore: '#c8f000' },
} as const

const TIPI_PRATICA = [
  { value: 'nuovo',    label: 'Nuovo tesseramento' },
  { value: 'rinnovo',  label: 'Rinnovo' },
  { value: 'cessione', label: 'Cessione' },
  { value: 'svincolo', label: 'Svincolo' },
  { value: 'prestito', label: 'Prestito' },
]

function generaStagioni(): string[] {
  const corrente = stagioneCorrente()
  const annoBase = parseInt(corrente.split('-')[0], 10)
  const stagioni: string[] = []
  for (let a = annoBase + 1; a >= annoBase - 2; a--) {
    stagioni.push(`${a}-${String(a + 1).slice(-2)}`)
  }
  return stagioni
}
const STAGIONI = generaStagioni()

interface Pratica {
  id: string
  tipo_pratica: string
  stato_pratica: string
  motivo_blocco: string | null
  documenti_mancanti: string[] | null
  note_figc: string | null
  stagione: string
  data_inizio: string | null
  giocatori: {
    id: string
    nome: string
    cognome: string
    ruolo_principale: string | null
    codice_fiscale: string | null
  } | null
}

export default function PraticheTesseramentoPage() {
  const [pratiche, setPratiche] = useState<Pratica[]>([])
  const [loading, setLoading] = useState(true)
  const [tabAttivo, setTabAttivo] = useState('tutte')
  const [stagione, setStagione] = useState(() => stagioneCorrente())
  const [modalEdit, setModalEdit] = useState<Pratica | null>(null)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' | 'info' } | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Form modifica
  const [statoForm, setStatoForm] = useState('')
  const [motivoBlocco, setMotivoBlocco] = useState('')
  const [docMancanti, setDocMancanti] = useState('')
  const [noteFigc, setNoteFigc] = useState('')

  const carica = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ stagione })
    if (tabAttivo !== 'tutte') params.set('stato_pratica', tabAttivo)
    const res = await fetch(`/api/tesseramenti/pratiche?${params}`)
    const d = await res.json()
    setPratiche(d.pratiche ?? [])
    setLoading(false)
  }, [tabAttivo, stagione])

  useEffect(() => { carica() }, [carica])

  const apriEdit = (p: Pratica) => {
    setModalEdit(p)
    setStatoForm(p.stato_pratica ?? 'da_avviare')
    setMotivoBlocco(p.motivo_blocco ?? '')
    setDocMancanti((p.documenti_mancanti ?? []).join(', '))
    setNoteFigc(p.note_figc ?? '')
  }

  const salva = async () => {
    if (!modalEdit) return
    setSalvando(true)
    const res = await fetch('/api/tesseramenti/pratiche', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: modalEdit.id,
        stato_pratica: statoForm,
        motivo_blocco: motivoBlocco.trim() || null,
        documenti_mancanti: docMancanti
          ? docMancanti.split(',').map(d => d.trim()).filter(Boolean)
          : [],
        note_figc: noteFigc.trim() || null,
      }),
    })
    if (res.ok) {
      setToast({ msg: 'Pratica aggiornata', tipo: 'success' })
      setModalEdit(null)
      carica()
    } else {
      setToast({ msg: 'Errore aggiornamento', tipo: 'error' })
    }
    setSalvando(false)
  }

  // Conti per tab (usando tutti i dati caricati, indipendente dal filtro attivo)
  const [tuttiDati, setTuttiDati] = useState<Pratica[]>([])
  useEffect(() => {
    fetch(`/api/tesseramenti/pratiche?stagione=${stagione}`)
      .then(r => r.json())
      .then(d => setTuttiDati(d.pratiche ?? []))
  }, [stagione])

  const counts = {
    tutte:      tuttiDati.length,
    da_avviare: tuttiDati.filter(p => p.stato_pratica === 'da_avviare').length,
    in_corso:   tuttiDati.filter(p => p.stato_pratica === 'in_corso').length,
    bloccata:   tuttiDati.filter(p => p.stato_pratica === 'bloccata').length,
    completata: tuttiDati.filter(p => p.stato_pratica === 'completata').length,
  }

  const blocate = counts.bloccata

  return (
    <div>
      <PageHeader
        title="Pratiche Tesseramento"
        subtitle="Stato delle pratiche FIGC per ogni giocatore"
        actions={
          <Select
            value={stagione}
            onChange={setStagione}
            options={STAGIONI.map(s => ({ value: s, label: `Stagione ${s}` }))}
          />
        }
      />

      {/* Alert bloccate */}
      {blocate > 0 && (
        <div style={{
          padding: '12px 16px', marginBottom: 16,
          background: 'rgba(255,68,68,0.08)',
          border: '1px solid rgba(255,68,68,0.25)',
          borderLeft: '4px solid #ff4444',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>🚫</span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              textTransform: 'uppercase', fontSize: 13, color: '#ff4444', marginBottom: 2,
            }}>
              {blocate} {blocate === 1 ? 'pratica bloccata' : 'pratiche bloccate'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--grigio-4)' }}>
              Richiedono intervento immediato per sbloccare i tesseramenti
            </div>
          </div>
          <button
            onClick={() => setTabAttivo('bloccata')}
            style={{
              padding: '6px 14px', background: '#ff4444', color: 'white',
              border: 'none', borderRadius: 2, cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}
          >
            Vedi subito →
          </button>
        </div>
      )}

      <TabBar
        tabs={[
          { key: 'tutte',      label: 'Tutte',        count: counts.tutte },
          { key: 'da_avviare', label: 'Da avviare',   count: counts.da_avviare },
          { key: 'in_corso',   label: 'In corso',     count: counts.in_corso },
          { key: 'bloccata',   label: '🔴 Bloccate',  count: counts.bloccata },
          { key: 'completata', label: '✓ Completate', count: counts.completata },
        ]}
        active={tabAttivo}
        onChange={setTabAttivo}
      />

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
          Caricamento pratiche…
        </div>
      ) : pratiche.length === 0 ? (
        <EmptyState
          icon="🪪"
          title="Nessuna pratica"
          subtitle="Non ci sono pratiche di tesseramento in questo stato"
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {pratiche.map((p, idx) => {
            const g = p.giocatori
            const statoMeta = STATI_PRATICA[p.stato_pratica as keyof typeof STATI_PRATICA] ?? STATI_PRATICA.da_avviare
            const tipoLabel = TIPI_PRATICA.find(t => t.value === p.tipo_pratica)?.label ?? p.tipo_pratica

            return (
              <div
                key={p.id}
                style={{
                  padding: '14px 20px',
                  borderBottom: idx < pratiche.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  borderLeft: `4px solid ${statoMeta.colore}`,
                  display: 'flex', alignItems: 'center', gap: 14,
                }}
              >
                {/* Giocatore */}
                <div style={{ width: 200, flexShrink: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                    textTransform: 'uppercase', fontSize: 12, marginBottom: 2, color: 'var(--white)',
                  }}>
                    {g?.cognome} {g?.nome}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)' }}>
                    {g?.ruolo_principale?.replace(/_/g, ' ') ?? '—'}
                  </div>
                </div>

                {/* Tipo e info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 11, color: 'var(--white)',
                    fontFamily: 'var(--font-display)', fontWeight: 600,
                    textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.04em',
                  }}>
                    {tipoLabel} — {p.stagione}
                  </div>
                  {p.motivo_blocco && (
                    <div style={{ fontSize: 11, color: '#ff4444', fontFamily: 'var(--font-mono)' }}>
                      ⛔ {p.motivo_blocco}
                    </div>
                  )}
                  {p.documenti_mancanti && p.documenti_mancanti.length > 0 && (
                    <div style={{ fontSize: 10, color: '#ff9900', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      📋 Mancano: {p.documenti_mancanti.join(', ')}
                    </div>
                  )}
                  {p.note_figc && (
                    <div style={{ fontSize: 10, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      📝 {p.note_figc.slice(0, 70)}{p.note_figc.length > 70 ? '…' : ''}
                    </div>
                  )}
                </div>

                {/* Badge stato */}
                <div style={{ flexShrink: 0 }}>
                  <span style={{
                    fontSize: 10, padding: '3px 8px',
                    background: `${statoMeta.colore}22`,
                    border: `1px solid ${statoMeta.colore}55`,
                    color: statoMeta.colore,
                    fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>
                    {statoMeta.label}
                  </span>
                </div>

                {/* Azione */}
                <button
                  onClick={() => apriEdit(p)}
                  style={{
                    padding: '6px 12px', background: 'transparent',
                    color: 'var(--grigio-3)', border: '1px solid var(--border-solid)',
                    borderRadius: 2, cursor: 'pointer', fontSize: 11, flexShrink: 0,
                    fontFamily: 'var(--font-display)', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}
                >
                  Aggiorna
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal modifica pratica ───────────────────────────────────────── */}
      {modalEdit && (() => {
        const g = modalEdit.giocatori
        return (
          <Modal
            open
            title={`Pratica — ${g?.cognome ?? '?'} ${g?.nome ?? '?'}`}
            onClose={() => setModalEdit(null)}
            width={480}
          >
            <div style={{
              padding: '10px 14px', background: '#111',
              border: '1px solid var(--border-solid)',
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--grigio-4)', marginBottom: 20,
            }}>
              {TIPI_PRATICA.find(t => t.value === modalEdit.tipo_pratica)?.label ?? modalEdit.tipo_pratica}
              {' — stagione '}{modalEdit.stagione}
              {g?.codice_fiscale && ` · CF: ${g.codice_fiscale}`}
            </div>

            <FormField label="Stato pratica">
              <Select
                value={statoForm}
                onChange={setStatoForm}
                options={Object.entries(STATI_PRATICA).map(([k, v]) => ({ value: k, label: v.label }))}
              />
            </FormField>

            {statoForm === 'bloccata' && (
              <FormField label="Motivo blocco" required>
                <input
                  className="input"
                  value={motivoBlocco}
                  onChange={e => setMotivoBlocco(e.target.value)}
                  placeholder="Es. Manca certificato medico, CF errato…"
                />
              </FormField>
            )}

            <FormField label="Documenti mancanti" hint="Separati da virgola">
              <input
                className="input"
                value={docMancanti}
                onChange={e => setDocMancanti(e.target.value)}
                placeholder="Es. certificato medico, passaporto"
              />
            </FormField>

            <FormField label="Note FIGC">
              <textarea
                className="input" rows={3}
                value={noteFigc}
                onChange={e => setNoteFigc(e.target.value)}
                placeholder="Note interne per la segreteria…"
                style={{ resize: 'vertical' }}
              />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setModalEdit(null)}
                style={{
                  padding: '9px 20px', background: 'transparent',
                  color: 'var(--grigio-3)', border: '1px solid var(--border-solid)',
                  borderRadius: 2, cursor: 'pointer',
                  fontFamily: 'var(--font-display)', fontSize: 11, textTransform: 'uppercase',
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
                {salvando ? 'Salvataggio…' : 'Aggiorna pratica →'}
              </button>
            </div>
          </Modal>
        )
      })()}

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
