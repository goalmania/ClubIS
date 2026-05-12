'use client'
import FeatureGate from '@/components/FeatureGate'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIA_META, type CategoriaDocumento } from '@/lib/documents/types'
import { CATALOGO_DOCUMENTI, cercaDocumenti } from '@/lib/documents/catalogo'

const LS_KEY = 'cis_doc_preferiti'

function leggiPreferiti(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(LS_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

function salvaPreferiti(ids: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify([...ids]))
}

type FiltroSpeciale = 'preferiti' | 'archiviati'

type DocRow = {
  id: string
  label: string
  descrizione: string | null
  categoria: CategoriaDocumento
  ha_varianti: boolean
  is_verificato: boolean
  documenti_varianti?: { id: string; label: string; descrizione?: string; config: Record<string, unknown> }[]
  stato: { is_preferito: boolean; is_archiviato: boolean; n_generazioni?: number }
}

type CategoriaKey = CategoriaDocumento | FiltroSpeciale | 'tutti'

// ── Definizione campi extra per documento ──────────────────────────────────
type FieldType = 'text' | 'number' | 'date' | 'textarea' | 'month'
type CampoExtra = {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  required?: boolean
  span?: 2  // occupa 2 colonne in una grid 2-col
}

// Campi che dipendono dalla variante selezionata
type CampiVariante = { varianteIds: string[]; campi: CampoExtra[] }

type DocCampiConfig = {
  campi?: CampoExtra[]
  campiPerVariante?: CampiVariante[]
}

const CAMPI_PER_DOCUMENTO: Record<string, DocCampiConfig> = {
  // ── DICHIARAZIONI FISCALI ──────────────────────────────────────────────
  'dichiarazione-730': {
    campiPerVariante: [
      {
        varianteIds: ['730-importo-manuale', '730-split-genitori'],
        campi: [
          { key: 'importo_manuale', label: 'Importo da attestare (€)', type: 'number', placeholder: 'es. 300.00', required: true },
        ],
      },
    ],
  },

  'attestazione-pagamento': {
    campi: [
      { key: 'importo', label: 'Importo (€)', type: 'number', placeholder: 'es. 150.00', required: true },
    ],
  },

  'bando-dote-sport-2025': {
    campi: [
      { key: 'importo', label: 'Importo voucher (€)', type: 'number', placeholder: 'es. 500.00', required: true },
    ],
  },

  'bando-dote-sport-2026': {
    campi: [
      { key: 'importo', label: 'Importo voucher (€)', type: 'number', placeholder: 'es. 500.00', required: true },
    ],
  },

  'bando-lazio': {
    campi: [
      { key: 'importo', label: 'Importo (€)', type: 'number', placeholder: 'es. 200.00', required: true },
    ],
  },

  'fondo-dote-famiglia-2025': {
    campi: [
      { key: 'importo', label: 'Importo contributo (€)', type: 'number', placeholder: 'es. 300.00', required: true },
      { key: 'codice_corso', label: 'Codice corso', type: 'text', placeholder: 'es. CRS-2025-001' },
      { key: 'data_inizio_corso', label: 'Data inizio corso', type: 'date' },
    ],
  },

  'dichiarazione-compensi-anno': {
    campi: [
      { key: 'anno_compenso', label: 'Anno di riferimento', type: 'number', placeholder: 'es. 2025', required: true },
    ],
  },

  // ── RIFORMA SPORT ──────────────────────────────────────────────────────
  'cococo-atleti':
  { campi: cocoCampi() },
  'cococo-figc-atleti':
  { campi: cocoCampi() },
  'cococo-tecnico':
  { campi: cocoCampi() },
  'cococo-figc-tecnico':
  { campi: cocoCampi() },
  'cococo-sport':
  { campi: cocoCampi() },
  'cococo-amministrativo':
  { campi: cocoCampi() },

  'dichiarazione-volontario-dirigente': {
    campi: [
      { key: 'mese', label: 'Mese di riferimento', type: 'month', required: true },
      { key: 'importo', label: 'Importo spese rimborsate (€)', type: 'number', placeholder: 'es. 150.00' },
    ],
  },

  'dichiarazione-volontario-tecnico': {
    campi: [
      { key: 'mese', label: 'Mese di riferimento', type: 'month', required: true },
      { key: 'importo', label: 'Importo spese rimborsate (€)', type: 'number', placeholder: 'es. 150.00' },
    ],
  },

  // ── AUTORIZZAZIONI ─────────────────────────────────────────────────────
  'autorizzazione-uscita-autonoma': {
    campi: [
      { key: 'corso', label: 'Corso / Squadra', type: 'text', placeholder: 'es. Under 14 B', required: true },
    ],
  },

  'modulo-giustificazione-assenza': {
    campi: [
      { key: 'data_inizio', label: 'Data inizio assenza', type: 'date', required: true },
      { key: 'data_fine',   label: 'Data fine assenza',   type: 'date', required: true },
      { key: 'gruppo',      label: 'Gruppo / Squadra',     type: 'text', placeholder: 'es. Under 12' },
    ],
  },

  // ── RICHIESTE ──────────────────────────────────────────────────────────
  'richiesta-iscrizione-scolastica': {
    campi: [
      { key: 'istituto_scolastico', label: 'Istituto scolastico', type: 'text', placeholder: 'es. I.C. G. Leopardi', required: true },
    ],
  },

  'nulla-osta': {
    campi: [
      { key: 'federazione',         label: 'Federazione',           type: 'text', placeholder: 'es. FIGC', required: true },
      { key: 'societa_destinataria', label: 'Società destinataria', type: 'text', placeholder: 'es. A.S.D. Esempio', required: true },
      { key: 'data_inizio',         label: 'Data inizio',           type: 'date' },
      { key: 'data_fine',           label: 'Data fine',             type: 'date' },
    ],
  },

  'certificazione-crediti': {
    campi: [
      { key: 'anno_scolastico', label: 'Anno scolastico', type: 'text', placeholder: 'es. 2024/2025', required: true },
    ],
  },

  // ── MODULI ─────────────────────────────────────────────────────────────
  'convocazione-soci': {
    campi: [
      { key: 'data_assemblea', label: 'Data assemblea',  type: 'date',   required: true },
      { key: 'ora_assemblea',  label: 'Ora',             type: 'text',   placeholder: 'es. 19:00', required: true },
      { key: 'sede_assemblea', label: 'Sede assemblea',  type: 'text',   placeholder: 'es. Sala riunioni, Via Roma 1', required: true },
      { key: 'ordine_del_giorno', label: 'Ordine del giorno', type: 'textarea', placeholder: 'Elenca i punti separati da virgola o a capo', span: 2, required: true },
    ],
  },

  // ── PRIVACY ────────────────────────────────────────────────────────────
  'informativa-gdpr': {
    campi: [
      { key: 'federazione', label: 'Federazione di affiliazione', type: 'text', placeholder: 'es. FIGC' },
    ],
  },
}

function cocoCampi(): CampoExtra[] {
  return [
    { key: 'disciplina',    label: 'Disciplina sportiva', type: 'text',   placeholder: 'es. Calcio' },
    { key: 'compenso_lordo', label: 'Compenso lordo (€)', type: 'number', placeholder: 'opzionale' },
    { key: 'compenso_netto', label: 'Compenso netto (€)', type: 'number', placeholder: 'opzionale' },
  ]
}

// ── Sidebar ────────────────────────────────────────────────────────────────
const SIDEBAR_ITEMS: { key: CategoriaKey | 'sep1' | 'sep2'; label: string; icona: string }[] = [
  { key: 'tutti',     label: 'Tutti i documenti', icona: '📚' },
  { key: 'preferiti', label: 'Preferiti',          icona: '⭐' },
  { key: 'sep1',      label: '',                   icona: '' },
  ...Object.entries(CATEGORIA_META)
    .sort(([, a], [, b]) => a.ordine - b.ordine)
    .map(([key, meta]) => ({ key: key as CategoriaKey, label: meta.label, icona: meta.icona })),
  { key: 'sep2',      label: '',                   icona: '' },
  { key: 'archiviati', label: 'Archiviati',        icona: '🗄️' },
]

// ── Componente campo extra ─────────────────────────────────────────────────
function CampoExtraInput({
  campo,
  valore,
  onChange,
}: {
  campo: CampoExtra
  valore: unknown
  onChange: (v: unknown) => void
}) {
  const base = { className: 'input' as string }
  if (campo.type === 'textarea') {
    return (
      <textarea
        {...base}
        rows={3}
        value={(valore as string) ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={campo.placeholder}
        style={{ resize: 'vertical', minHeight: 72, background: '#1a1a1a', color: 'var(--white)' }}
      />
    )
  }
  return (
    <input
      {...base}
      type={campo.type === 'month' ? 'month' : campo.type}
      value={(valore as string | number) ?? ''}
      onChange={e => {
        const raw = e.target.value
        if (campo.type === 'number') onChange(parseFloat(raw) || undefined)
        else onChange(raw)
      }}
      placeholder={campo.placeholder}
      style={{ background: '#1a1a1a', color: 'var(--white)' }}
    />
  )
}

// ── Pagina principale ──────────────────────────────────────────────────────
export default function DocumentiPage() {
  // Catalogo completo (sempre tutti i documenti, senza filtro categoria)
  const [tuttiDocumenti, setTuttiDocumenti] = useState<DocRow[]>([])
  const [loading, setLoading]               = useState(true)
  const [categoriaAttiva, setCatAttiva]     = useState<CategoriaKey>('tutti')
  const [search, setSearch]                 = useState('')

  // Preferiti — localStorage, nessun DB
  const [preferiti, setPreferiti] = useState<Set<string>>(new Set())
  useEffect(() => { setPreferiti(leggiPreferiti()) }, [])

  // Modal generazione
  const [modalDoc, setModalDoc]   = useState<DocRow | null>(null)
  const [giocatori, setGiocatori] = useState<{ id: string; nome: string; cognome: string }[]>([])
  const [giocatoreId, setGiocatoreId] = useState('')
  const [varianteId, setVarianteId]   = useState('')
  const [campiExtra, setCampiExtra]   = useState<Record<string, unknown>>({})
  const [generando, setGenerando]     = useState(false)

  // Toast inline
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Carica TUTTI i documenti una sola volta (senza filtro categoria)
  const caricaDocumenti = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/documenti')
    if (res.ok) {
      const data = await res.json()
      setTuttiDocumenti(data.documenti ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { caricaDocumenti() }, [caricaDocumenti])

  // Carica giocatori quando si apre il modal
  useEffect(() => {
    if (!modalDoc) return
    setGiocatoreId('')
    setVarianteId(modalDoc.documenti_varianti?.[0]?.id ?? '')
    setCampiExtra({})

    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: u } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
      if (!u) return
      const { data: g } = await supabase
        .from('giocatori')
        .select('id, nome, cognome')
        .eq('club_id', u.club_id)
        .order('cognome')
      setGiocatori(g ?? [])
    })()
  }, [modalDoc])

  const togglePreferito = (docId: string) => {
    setPreferiti(prev => {
      const next = new Set(prev)
      if (next.has(docId)) next.delete(docId)
      else next.add(docId)
      salvaPreferiti(next)
      return next
    })
  }

  const genera = async () => {
    if (!modalDoc) return
    setGenerando(true)

    const res = await fetch(`/api/documenti/${modalDoc.id}/genera`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        varianteId:  varianteId || null,
        giocatoreId: giocatoreId || null,
        campiExtra,
      }),
    })

    if (!res.ok) {
      setToast({ msg: 'Errore nella generazione del documento.', ok: false })
      setGenerando(false)
      return
    }

    const html = await res.text()
    const win = window.open('', '_blank')
    win?.document.write(html)
    win?.document.close()

    setGenerando(false)
    setModalDoc(null)
    setToast({ msg: 'Documento generato. Usa "Stampa / Salva PDF" nella nuova finestra.', ok: true })
    setTimeout(() => setToast(null), 5000)
  }

  // Campi extra per il modal
  const campiDaMostrare = (() => {
    if (!modalDoc) return []
    const cfg = CAMPI_PER_DOCUMENTO[modalDoc.id]
    if (!cfg) return []
    const campiBase = cfg.campi ?? []
    const campiVar  = (cfg.campiPerVariante ?? [])
      .filter(cv => cv.varianteIds.includes(varianteId))
      .flatMap(cv => cv.campi)
    return [...campiBase, ...campiVar]
  })()

  const haGrid = campiDaMostrare.some(c => !c.span) && campiDaMostrare.filter(c => !c.span).length > 1

  // Filtro categoria + preferiti (tutto lato client, basato sullo stato DB)
  const documenti = useMemo(() => {
    let lista = tuttiDocumenti
    if (categoriaAttiva === 'preferiti') {
      lista = lista.filter(d => preferiti.has(d.id))
    } else if (categoriaAttiva !== 'tutti') {
      lista = lista.filter(d => d.categoria === categoriaAttiva)
    }
    return lista
  }, [tuttiDocumenti, categoriaAttiva, preferiti])

  // Ricerca full-text: usa cercaDocumenti sul catalogo statico (con keywords, accenti, ecc.)
  // Se c'è una query, cerca su TUTTI i documenti ignorando la categoria attiva.
  const documentiVisibili = useMemo(() => {
    if (!search.trim()) return documenti
    // Cerca nel catalogo statico (ha i keywords) e poi reintegra lo stato preferiti
    const idTrovati = new Set(cercaDocumenti(CATALOGO_DOCUMENTI, search).map(d => d.id))
    return tuttiDocumenti.filter(d => idTrovati.has(d.id))
  }, [search, documenti, tuttiDocumenti])

  const nPref = preferiti.size

  const titoloCorrente = search.trim()
    ? `Risultati per "${search.trim()}"`
    : categoriaAttiva === 'tutti'      ? 'Tutti i documenti'
    : categoriaAttiva === 'preferiti'  ? 'Documenti preferiti'
    : categoriaAttiva === 'archiviati' ? 'Archiviati'
    : CATEGORIA_META[categoriaAttiva as CategoriaDocumento]?.label ?? 'Documenti'

  const varianteCorrente = modalDoc?.documenti_varianti?.find(v => v.id === varianteId)

  return (
    <FeatureGate feature="genera_documenti" featureLabel="Genera Documenti">
        <div style={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 100px)' }}>

          {/* ── Sidebar categorie ─────────────────────────────── */}
          <div style={{ width: 248, flexShrink: 0, borderRight: '1px solid var(--border-solid)', marginRight: 24 }}>
            <div style={{ position: 'sticky', top: 0 }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
                letterSpacing: '0.2em', textTransform: 'uppercase', color: '#444',
                padding: '0 0 10px 0', marginBottom: 6,
              }}>
                CATEGORIE
              </div>

              {SIDEBAR_ITEMS.map((item, i) => {
                if (item.key === 'sep1' || item.key === 'sep2') {
                  return <div key={i} style={{ height: 1, background: 'var(--border-solid)', margin: '8px 0' }} />
                }
                const isActive = categoriaAttiva === item.key
                const count = item.key === 'preferiti' ? nPref : undefined
                return (
                  <button
                    key={item.key}
                    onClick={() => { setCatAttiva(item.key as CategoriaKey); setSearch('') }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '8px 10px', cursor: 'pointer',
                      border: 'none', borderRadius: 2, marginBottom: 2, textAlign: 'left',
                      background:   isActive ? 'rgba(200,240,0,0.07)' : 'transparent',
                      borderLeft:   isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    }}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icona}</span>
                    <span style={{
                      fontSize: 11, flex: 1,
                      fontFamily: 'var(--font-display)', fontWeight: isActive ? 700 : 400,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      color: isActive ? 'var(--accent)' : 'var(--gray)',
                    }}>
                      {item.label}
                    </span>
                    {typeof count === 'number' && count > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Area principale ──────────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <h1 style={{
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24,
                textTransform: 'uppercase', letterSpacing: '-0.01em',
                color: 'var(--white)', marginBottom: 4,
              }}>
                {titoloCorrente}
              </h1>
              <p style={{ fontSize: 12, color: 'var(--gray)' }}>
                {loading ? 'Caricamento...' : `${documentiVisibili.length} document${documentiVisibili.length === 1 ? 'o' : 'i'}`}
              </p>
            </div>

            {/* Ricerca */}
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, maxWidth: 400 }}>
              <input
                className="input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cerca in tutti i documenti..."
                style={{ flex: 1 }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    background: 'none', border: 'none', color: 'var(--gray)',
                    cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1,
                    flexShrink: 0,
                  }}
                  title="Cancella ricerca"
                >
                  ×
                </button>
              )}
            </div>

            {/* Loading */}
            {loading && (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--gray)' }}>
                Caricamento libreria...
              </div>
            )}

            {/* Empty */}
            {!loading && documentiVisibili.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
                  textTransform: 'uppercase', color: 'var(--white)', marginBottom: 6,
                }}>
                  Nessun documento
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray)' }}>
                  {categoriaAttiva === 'preferiti'
                    ? 'Aggiungi documenti ai preferiti con ⭐'
                    : 'Nessun documento in questa categoria'}
                </div>
              </div>
            )}

            {/* Lista documenti */}
            {!loading && documentiVisibili.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {documentiVisibili.map(doc => {
                  const catMeta = CATEGORIA_META[doc.categoria]
                  return (
                    <div
                      key={doc.id}
                      style={{
                        background: '#111', border: '1px solid var(--border-solid)',
                        borderRadius: 2, padding: '14px 18px',
                        display: 'flex', gap: 14, alignItems: 'flex-start',
                      }}
                    >
                      {/* Icona */}
                      <div style={{
                        width: 34, height: 34, borderRadius: 2, flexShrink: 0,
                        background: '#1a1a1a', border: '1px solid var(--border-solid)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16,
                      }}>
                        {catMeta?.icona ?? '📄'}
                      </div>

                      {/* Testo */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{
                            fontFamily: 'var(--font-display)', fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                            fontSize: 13, color: 'var(--white)',
                          }}>
                            {doc.label}
                          </span>
                          {doc.is_verificato && (
                            <span style={{
                              fontSize: 9, padding: '2px 6px',
                              background: 'rgba(0,200,160,0.1)', border: '1px solid rgba(0,200,160,0.3)',
                              color: '#00c8a0',
                              fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase',
                            }}>
                              ✓ VERIFICATO
                            </span>
                          )}
                          {doc.ha_varianti && (
                            <span style={{
                              fontSize: 9, padding: '2px 6px',
                              background: 'rgba(200,240,0,0.08)', border: '1px solid rgba(200,240,0,0.2)',
                              color: 'var(--accent)',
                              fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase',
                            }}>
                              {doc.documenti_varianti?.length ?? 0} VARIANTI
                            </span>
                          )}
                        </div>
                        {doc.descrizione && (
                          <div style={{ fontSize: 11, color: 'var(--gray)', lineHeight: 1.5 }}>
                            {doc.descrizione}
                          </div>
                        )}
                      </div>

                      {/* Azioni */}
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                        <button
                          onClick={() => togglePreferito(doc.id)}
                          title={preferiti.has(doc.id) ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 16, opacity: preferiti.has(doc.id) ? 1 : 0.25,
                            transition: 'opacity 0.15s', padding: 4,
                          }}
                        >
                          ⭐
                        </button>
                        <button
                          onClick={() => setModalDoc(doc)}
                          style={{
                            padding: '7px 16px',
                            background: 'var(--accent)', color: '#000', border: 'none',
                            borderRadius: 2, cursor: 'pointer',
                            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                          }}
                        >
                          Genera →
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Modal generazione ────────────────────────────── */}
          {modalDoc && (
            <div style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.85)', zIndex: 1000,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              padding: '40px 16px', overflowY: 'auto',
            }}>
              <div style={{
                background: '#111', border: '1px solid var(--border-solid)',
                borderRadius: 2, width: '100%', maxWidth: 580, position: 'relative',
              }}>
                {/* Header modal */}
                <div style={{
                  padding: '18px 24px', borderBottom: '1px solid var(--border-solid)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14,
                      textTransform: 'uppercase', color: 'var(--white)',
                    }}>
                      {modalDoc.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>
                      Compila i campi e genera il documento
                    </div>
                  </div>
                  <button
                    onClick={() => setModalDoc(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--gray)', fontSize: 22, cursor: 'pointer' }}
                  >
                    ×
                  </button>
                </div>

                {/* Body modal */}
                <div style={{ padding: '20px 24px', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>

                  {/* Selezione variante */}
                  {modalDoc.ha_varianti && (modalDoc.documenti_varianti?.length ?? 0) > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <label className="label">Versione / Variante <span style={{ color: 'var(--accent)' }}>*</span></label>
                      <select
                        className="input"
                        value={varianteId}
                        onChange={e => { setVarianteId(e.target.value); setCampiExtra({}) }}
                        style={{ background: '#1a1a1a', color: 'var(--white)' }}
                      >
                        {modalDoc.documenti_varianti!.map(v => (
                          <option key={v.id} value={v.id}>{v.label}</option>
                        ))}
                      </select>
                      {varianteCorrente?.descrizione && (
                        <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 5 }}>
                          {varianteCorrente.descrizione}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selezione tesserato */}
                  <div style={{ marginBottom: 16 }}>
                    <label className="label">Tesserato</label>
                    <select
                      className="input"
                      value={giocatoreId}
                      onChange={e => setGiocatoreId(e.target.value)}
                      style={{ background: '#1a1a1a', color: 'var(--white)' }}
                    >
                      <option value="">— Seleziona tesserato (opzionale) —</option>
                      {giocatori.map(g => (
                        <option key={g.id} value={g.id}>{g.cognome} {g.nome}</option>
                      ))}
                    </select>
                    <div style={{ fontSize: 10, color: 'var(--gray)', marginTop: 4 }}>
                      I dati del tesserato vengono pre-compilati automaticamente
                    </div>
                  </div>

                  {/* Campi extra dinamici */}
                  {campiDaMostrare.length > 0 && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: haGrid ? '1fr 1fr' : '1fr',
                      gap: 12,
                      marginBottom: 16,
                    }}>
                      {campiDaMostrare.map(campo => (
                        <div
                          key={campo.key}
                          style={{ gridColumn: campo.span === 2 || !haGrid ? '1 / -1' : 'auto' }}
                        >
                          <label className="label">
                            {campo.label}
                            {campo.required && <span style={{ color: 'var(--accent)', marginLeft: 3 }}>*</span>}
                          </label>
                          <CampoExtraInput
                            campo={campo}
                            valore={campiExtra[campo.key]}
                            onChange={v => setCampiExtra(p => ({ ...p, [campo.key]: v }))}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Info */}
                  <div style={{
                    padding: '10px 12px', background: '#0d0d0d',
                    border: '1px solid var(--border-solid)', borderRadius: 2,
                    fontSize: 11, color: 'var(--gray)', lineHeight: 1.6,
                  }}>
                    ℹ️ I dati del club vengono pre-compilati automaticamente.
                    Il documento si aprirà in una nuova finestra — usa il pulsante "Stampa / Salva PDF".
                  </div>
                </div>

                {/* Footer modal */}
                <div style={{
                  padding: '16px 24px', borderTop: '1px solid var(--border-solid)',
                  display: 'flex', gap: 10,
                }}>
                  <button
                    onClick={() => setModalDoc(null)}
                    style={{
                      flex: 1, padding: '9px 0',
                      background: 'transparent', border: '1px solid var(--border-solid)',
                      borderRadius: 2, color: 'var(--gray)', cursor: 'pointer',
                      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}
                  >
                    Annulla
                  </button>
                  <button
                    onClick={genera}
                    disabled={generando}
                    style={{
                      flex: 2, padding: '9px 0',
                      background: generando ? '#444' : 'var(--accent)',
                      color: '#000', border: 'none', borderRadius: 2,
                      cursor: generando ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}
                  >
                    {generando ? 'Generazione...' : 'Genera documento →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Toast ────────────────────────────────────────── */}
          {toast && (
            <div style={{
              position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
              background: toast.ok ? '#1a2a00' : '#2a0a0a',
              border: `1px solid ${toast.ok ? 'var(--accent)' : '#ff4444'}`,
              borderRadius: 2, padding: '12px 18px',
              fontFamily: 'var(--font-mono)', fontSize: 12,
              color: toast.ok ? 'var(--accent)' : '#ff6666',
              maxWidth: 380, lineHeight: 1.5,
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <span>{toast.ok ? '✓' : '✕'}</span>
              <span style={{ flex: 1 }}>{toast.msg}</span>
              <button
                onClick={() => setToast(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16, lineHeight: 1, padding: 0 }}
              >
                ×
              </button>
            </div>
          )}
        </div>
    </FeatureGate>
  )
}
