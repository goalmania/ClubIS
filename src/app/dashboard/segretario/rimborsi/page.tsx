'use client'
import FeatureGate from '@/components/FeatureGate'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Toast } from '@/components/ui'
import { generaSEPAXML, validaIBAN, formattaIBAN, type BonificoSEPA } from '@/lib/sepa/sepa-generator'

/* ─── Costanti ───────────────────────────────────────────────── */

const MESI = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
]

const now = new Date()

/* ─── Tipi ───────────────────────────────────────────────────── */

interface GiocatoreRow {
  id:               string
  nome:             string
  cognome:          string
  iban:             string
  intestatario:     string
  importo:          number   // rimborso di questo mese
  causale:          string
  includi:          boolean
  tipo:             string   // giocatore | allenatore | …
  soggetto:         'giocatore' | 'staff'
  ibanError:        boolean
}

interface RasRow {
  id:               string
  nome_cognome:     string
  tipo:             string
  mese:             number
  anno:             number
  importo:          number
  descrizione:      string
  data_pagamento:   string | null
  ras_inserito:     boolean
  quietanza_firmata: boolean
}

interface ClubInfo {
  id:               string
  nome:             string
  iban:             string
  intestatario:     string
  bic:              string
}

interface BatchPassato {
  id:           string
  descrizione:  string
  mese:         number
  anno:         number
  n_bonifici:   number
  importo_totale: number
  stato:        string
  data_esecuzione: string | null
  data_generazione: string | null
}

type Tab = 'batch' | 'ras'

/* ─── Componente ─────────────────────────────────────────────── */

export default function RimborsiPage() {
  const supabase = createClient()

  /* ── Stato UI ───────────────────────────────────────────────── */
  const [tab, setTab]             = useState<Tab>('batch')
  const [loading, setLoading]     = useState(true)
  const [loaded, setLoaded]       = useState(false)

  /* ── Configurazione batch ───────────────────────────────────── */
  const [mese, setMese]           = useState(now.getMonth() + 1)
  const [anno, setAnno]           = useState(now.getFullYear())
  const [dataEsec, setDataEsec]   = useState(() => {
    // Default: prossimo lunedì
    const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7))
    return d.toISOString().split('T')[0]
  })

  /* ── Dati ────────────────────────────────────────────────────── */
  const [club, setClub]           = useState<ClubInfo>({ id:'', nome:'', iban:'', intestatario:'', bic:'' })
  const [clubIbanEdit, setClubIbanEdit] = useState(false)
  const [giocatori, setGiocatori] = useState<GiocatoreRow[]>([])
  const [ras, setRas]             = useState<RasRow[]>([])
  const [batches, setBatches]     = useState<BatchPassato[]>([])

  /* ── Generazione ────────────────────────────────────────────── */
  const [generando, setGenerando] = useState(false)
  const [batchId, setBatchId]     = useState<string | null>(null)
  const [mostraIstruzioni, setMostraIstruzioni] = useState(false)
  const [nomeFile, setNomeFile]   = useState('')

  /* ── Toast ───────────────────────────────────────────────────── */
  const [toast, setToast]         = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const ok  = (msg: string) => { setToast({ msg, tipo: 'success' }); setTimeout(() => setToast(null), 3500) }
  const err = (msg: string) => { setToast({ msg, tipo: 'error'   }); setTimeout(() => setToast(null), 4500) }

  /* ── Caricamento dati ───────────────────────────────────────── */

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: utente } = await supabase
      .from('utenti').select('club_id').eq('id', user.id).single()
    const clubId = utente?.club_id
    if (!clubId) { setLoading(false); return }

    const [
      { data: clubData },
      { data: tesserati },
      { data: staffData },
      { data: rasData },
      { data: batchData },
    ] = await Promise.all([
      supabase.from('clubs')
        .select('id, nome, iban, intestatario_iban, bic')
        .eq('id', clubId).single(),
      supabase.from('tesseramenti')
        .select('giocatore_id, tipo_tesseramento, giocatori(id, nome, cognome, iban, intestatario_iban)')
        .eq('club_id', clubId).eq('stato', 'attivo'),
      supabase.from('utenti')
        .select('id, nome, cognome, iban, intestatario_iban, ruolo')
        .eq('club_id', clubId)
        .eq('attivo', true),
      supabase.from('ras_registrazioni')
        .select('id, giocatore_id, staff_id, tipo_collaboratore, mese, anno, importo, descrizione, data_pagamento, ras_inserito, quietanza_firmata, giocatori(nome, cognome), utenti(nome, cognome)')
        .eq('club_id', clubId)
        .order('anno', { ascending: false }).order('mese', { ascending: false })
        .limit(200),
      supabase.from('bonifici_batch')
        .select('id, descrizione, mese, anno, n_bonifici, importo_totale, stato, data_esecuzione, data_generazione')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    setClub({
      id:           clubData?.id ?? '',
      nome:         clubData?.nome ?? '',
      iban:         clubData?.iban ?? '',
      intestatario: clubData?.intestatario_iban ?? clubData?.nome ?? '',
      bic:          clubData?.bic ?? '',
    })

    const righeGiocatori: GiocatoreRow[] = (tesserati ?? []).map((t: any) => {
      const g = t.giocatori
      return {
        id:           g?.id ?? '',
        nome:         g?.nome ?? '',
        cognome:      g?.cognome ?? '',
        iban:         g?.iban ?? '',
        intestatario: g?.intestatario_iban || `${g?.cognome ?? ''} ${g?.nome ?? ''}`.trim(),
        importo:      0,
        causale:      '',
        includi:      false,
        tipo:         'giocatore',
        soggetto:     'giocatore' as const,
        ibanError:    false,
      }
    })

    const righeStaff: GiocatoreRow[] = (staffData ?? []).map((u: any) => ({
      id:           u.id,
      nome:         u.nome ?? '',
      cognome:      u.cognome ?? '',
      iban:         u.iban ?? '',
      intestatario: u.intestatario_iban || `${u.cognome ?? ''} ${u.nome ?? ''}`.trim(),
      importo:      0,
      causale:      '',
      includi:      false,
      tipo:         u.ruolo ?? 'staff',
      soggetto:     'staff' as const,
      ibanError:    false,
    }))

    const righe = [...righeGiocatori, ...righeStaff]
      .sort((a, b) => a.cognome.localeCompare(b.cognome))

    setGiocatori(righe)

    const rasRighe: RasRow[] = (rasData ?? []).map((r: any) => {
      const persona = r.giocatori ?? r.utenti
      return {
        id:                r.id,
        nome_cognome:      persona ? `${persona.cognome} ${persona.nome}` : '—',
        tipo:              r.tipo_collaboratore,
        mese:              r.mese,
        anno:              r.anno,
        importo:           Number(r.importo),
        descrizione:       r.descrizione,
        data_pagamento:    r.data_pagamento,
        ras_inserito:      r.ras_inserito,
        quietanza_firmata: r.quietanza_firmata,
      }
    })
    setRas(rasRighe)
    setBatches(batchData ?? [])
    setLoaded(true)
    setLoading(false)
  }, [supabase])

  // Carica al primo render
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Derivati batch ─────────────────────────────────────────── */

  const selezionati  = useMemo(() => giocatori.filter(g => g.includi && g.importo > 0), [giocatori])
  const totale       = useMemo(() => selezionati.reduce((s, g) => s + g.importo, 0), [selezionati])
  const senzaIban    = useMemo(() => selezionati.filter(g => !validaIBAN(g.iban)), [selezionati])

  /* ── Helpers ────────────────────────────────────────────────── */

  const updateGiocatore = (id: string, patch: Partial<GiocatoreRow>) =>
    setGiocatori(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g))

  const onImportoChange = (id: string, val: string) => {
    const importo = parseFloat(val.replace(',', '.')) || 0
    const g       = giocatori.find(r => r.id === id)!
    const causale = `Rimborso spese ${g.cognome} ${MESI[mese - 1]} ${anno}`
    updateGiocatore(id, { importo, includi: importo > 0, causale })
  }

  const onIbanChange = (id: string, val: string) => {
    const clean    = val.replace(/\s/g, '').toUpperCase()
    const ibanError = clean.length >= 15 && !validaIBAN(clean)
    updateGiocatore(id, { iban: val, ibanError })
  }

  const selezionaTutti = (v: boolean) =>
    setGiocatori(prev => prev.map(g => ({ ...g, includi: v && g.importo > 0 })))

  /* ── Genera + scarica XML ────────────────────────────────────── */

  const generaBatch = useCallback(async () => {
    if (selezionati.length === 0) { err('Inserisci almeno un importo'); return }
    if (senzaIban.length > 0) {
      err(`${senzaIban.length} giocatori senza IBAN valido: ${senzaIban.map(g => g.cognome).join(', ')}`)
      return
    }
    if (!club.iban || !validaIBAN(club.iban)) {
      err('Inserisci un IBAN valido per il conto del club')
      return
    }

    setGenerando(true)
    try {
      const idBatch = `CLUB-${club.nome.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g,'')}-${anno}-${String(mese).padStart(2,'0')}`
      const filename = `${idBatch}-SEPA.xml`

      const bonifici: BonificoSEPA[] = selezionati.map(g => ({
        id:                `${idBatch}-${g.id.slice(0, 8)}`,
        nome_beneficiario:  g.intestatario || `${g.cognome} ${g.nome}`,
        iban_beneficiario:  g.iban.replace(/\s/g, ''),
        importo:            g.importo,
        causale:            (g.causale || `Rimborso spese ${g.cognome} ${MESI[mese-1]} ${anno}`).slice(0, 140),
      }))

      const xml = generaSEPAXML({
        nome_ordinante:  club.intestatario || club.nome,
        iban_ordinante:  club.iban.replace(/\s/g, ''),
        bic_ordinante:   club.bic || undefined,
        data_esecuzione: dataEsec,
        id_messaggio:    idBatch,
      }, bonifici)

      // ── 1. Download immediato — indipendente dal salvataggio DB ──
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)

      setNomeFile(filename)
      setMostraIstruzioni(true)

      // ── 2. Salva batch + RAS in DB (secondario — non blocca il download) ──
      try {
        const payload = {
          mese,
          anno,
          descrizione:     `Rimborsi ${MESI[mese-1]} ${anno}`,
          xml_sepa:        xml,
          data_esecuzione: dataEsec,
          bonifici:        selezionati.map((g, i) => ({
            id:                 bonifici[i].id,
            soggetto:           g.soggetto,
            giocatore_id:       g.soggetto === 'giocatore' ? g.id : null,
            staff_id:           g.soggetto === 'staff'     ? g.id : null,
            tipo_collaboratore: g.tipo,
            nome_beneficiario:  bonifici[i].nome_beneficiario,
            iban_beneficiario:  bonifici[i].iban_beneficiario,
            importo:            g.importo,
            causale:            bonifici[i].causale,
          })),
        }

        const res  = await fetch('/api/rimborsi/salva-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Errore salvataggio batch')

        setBatchId(json.batch_id)
        await load()
      } catch (dbErr: any) {
        // Il file è già scaricato — segnala solo l'errore di registrazione
        err(`File scaricato. Errore registrazione batch: ${dbErr.message}`)
      }
    } catch (e: any) {
      err(e.message)
    } finally {
      setGenerando(false)
    }
  }, [selezionati, senzaIban, club, mese, anno, dataEsec, load])

  /* ── Segna batch come eseguito ───────────────────────────────── */

  const segnaEseguito = useCallback(async (id: string) => {
    const res = await fetch('/api/rimborsi/salva-batch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_id: id, data_esecuzione: new Date().toISOString().split('T')[0] }),
    })
    if (res.ok) { ok('Batch segnato come eseguito'); await load() }
    else err('Errore aggiornamento stato')
  }, [load])

  /* ── Toggle RAS ─────────────────────────────────────────────── */

  const toggleRas = useCallback(async (id: string, field: 'ras_inserito' | 'quietanza_firmata', cur: boolean) => {
    const { error } = await supabase.from('ras_registrazioni').update({ [field]: !cur }).eq('id', id)
    if (error) { err('Errore aggiornamento RAS'); return }
    setRas(prev => prev.map(r => r.id === id ? { ...r, [field]: !cur } : r))
  }, [supabase])

  /* ── Export CSV RAS ─────────────────────────────────────────── */

  const exportRasCSV = useCallback(() => {
    const header = 'Cognome Nome,Tipo,Mese,Anno,Importo,Descrizione,Data Pagamento,RAS Inserito,Quietanza Firmata'
    const rows   = ras.map(r => [
      r.nome_cognome, r.tipo, r.mese, r.anno,
      r.importo.toFixed(2), `"${r.descrizione}"`,
      r.data_pagamento ?? '', r.ras_inserito ? 'SI' : 'NO', r.quietanza_firmata ? 'SI' : 'NO',
    ].join(','))
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = `RAS-${anno}-${String(mese).padStart(2,'0')}.csv`; a.click()
    URL.revokeObjectURL(url)
  }, [ras, anno, mese])

  /* ── Dati RAS filtrati per mese/anno corrente ────────────────── */

  const rasDelMese       = useMemo(() => ras.filter(r => r.mese === mese && r.anno === anno), [ras, mese, anno])
  const rasNonInseriti   = useMemo(() => rasDelMese.filter(r => !r.ras_inserito).length, [rasDelMese])
  const rasNoQuietanza   = useMemo(() => rasDelMese.filter(r => !r.quietanza_firmata).length, [rasDelMese])

  /* ── Render ─────────────────────────────────────────────────── */

  const fmtEur = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
  const fmt    = (d: string) => new Date(d).toLocaleDateString('it-IT')
  const statoColor = (s: string) =>
    s === 'eseguito' ? 'var(--accent)' : s === 'generato' ? 'var(--ambra)' : 'var(--gray)'

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>
      Caricamento rimborsi…
    </div>
  )

  return (
    <FeatureGate feature="rimborso_sepa" featureLabel="Rimborsi SEPA">
        <>
          {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

          <PageHeader
            title="Rimborsi SEPA"
            subtitle="Genera file SEPA XML per bonifici batch e gestisci il registro RAS"
            actions={
              <div style={{ display: 'flex', gap: 10 }}>
                {tab === 'ras' && (
                  <button className="btn btn-secondary btn-sm" onClick={exportRasCSV}>
                    Export CSV RAS
                  </button>
                )}
              </div>
            }
          />

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28, gap: 0 }}>
            {([['batch','Genera Batch SEPA'],['ras','Registro RAS']] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '10px 20px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-display)', fontSize: '0.78rem',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: tab === t ? 'var(--accent)' : 'var(--gray)',
                  fontWeight: tab === t ? 700 : 500,
                  borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -1, transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ─── TAB: GENERA BATCH ────────────────────────────────── */}
          {tab === 'batch' && (
            <div>
              {/* Configurazione */}
              <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                  color: 'var(--gray)', marginBottom: 16,
                }}>
                  Configurazione batch
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) 2fr', gap: 12, alignItems: 'flex-end' }}>
                  {/* Mese */}
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', display: 'block', marginBottom: 5 }}>MESE</label>
                    <select className="input" style={{ width: '100%' }} value={mese} onChange={e => setMese(+e.target.value)}>
                      {MESI.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                  {/* Anno */}
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', display: 'block', marginBottom: 5 }}>ANNO</label>
                    <select className="input" style={{ width: '100%' }} value={anno} onChange={e => setAnno(+e.target.value)}>
                      {[anno-1, anno, anno+1].map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  {/* Data esecuzione */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', display: 'block', marginBottom: 5 }}>DATA ESECUZIONE</label>
                    <input type="date" className="input" style={{ width: '100%' }} value={dataEsec} onChange={e => setDataEsec(e.target.value)} />
                  </div>
                  {/* IBAN club */}
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', display: 'block', marginBottom: 5 }}>
                      IBAN CLUB (ordinante)
                      <button
                        onClick={() => setClubIbanEdit(e => !e)}
                        style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 10, textDecoration: 'underline' }}
                      >
                        {clubIbanEdit ? 'salva' : 'modifica'}
                      </button>
                    </label>
                    {clubIbanEdit ? (
                      <input
                        className="input" style={{ width: '100%' }}
                        placeholder="IT60 X054 2811 1010 0000 0123 456"
                        value={club.iban}
                        onChange={e => setClub(c => ({ ...c, iban: e.target.value }))}
                      />
                    ) : (
                      <div style={{
                        padding: '8px 12px', background: 'var(--gray-light)', border: '1px solid var(--border)',
                        borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 12,
                        color: club.iban ? (validaIBAN(club.iban) ? 'var(--accent)' : 'var(--rosso)') : 'var(--gray)',
                      }}>
                        {club.iban ? formattaIBAN(club.iban) : '— non configurato —'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista giocatori */}
              <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
                {/* Header tabella */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 1fr 180px 200px 110px 44px',
                  gap: 0,
                  padding: '10px 16px',
                  background: 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid var(--border)',
                }}>
                  {['','GIOCATORE','IMPORTO (€)','IBAN BENEFICIARIO','CAUSALE',''].map((h, i) => (
                    <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', letterSpacing: '0.1em' }}>{h}</div>
                  ))}
                </div>

                {giocatori.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    Nessun giocatore tesserato attivo
                  </div>
                ) : giocatori.map(g => (
                  <div
                    key={g.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '32px 1fr 180px 200px 110px 44px',
                      gap: 0, alignItems: 'center',
                      padding: '8px 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: g.includi ? 'rgba(200,240,0,0.03)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={g.includi}
                      onChange={e => updateGiocatore(g.id, { includi: e.target.checked })}
                      disabled={g.importo === 0}
                      style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />

                    {/* Nome */}
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>
                        {g.cognome} {g.nome}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginTop: 1 }}>
                        {g.intestatario !== `${g.cognome} ${g.nome}` ? g.intestatario : ''}
                      </div>
                    </div>

                    {/* Importo */}
                    <div style={{ paddingRight: 12 }}>
                      <input
                        type="number"
                        min="0" step="0.01"
                        className="input"
                        style={{ width: '100%', textAlign: 'right' }}
                        placeholder="0,00"
                        value={g.importo || ''}
                        onChange={e => onImportoChange(g.id, e.target.value)}
                      />
                    </div>

                    {/* IBAN */}
                    <div style={{ paddingRight: 12 }}>
                      <input
                        type="text"
                        className="input"
                        style={{
                          width: '100%',
                          borderColor: g.ibanError ? 'var(--rosso)' : undefined,
                          fontFamily: 'var(--font-mono)', fontSize: 11,
                        }}
                        placeholder="IT60 X054…"
                        value={g.iban}
                        onChange={e => onIbanChange(g.id, e.target.value)}
                      />
                      {g.ibanError && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--rosso)', marginTop: 2 }}>
                          IBAN non valido
                        </div>
                      )}
                    </div>

                    {/* Causale preview */}
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', paddingRight: 8, lineHeight: 1.3 }}>
                      {g.causale || `Rimborso ${g.cognome}`}
                    </div>

                    {/* Importo badge */}
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: g.importo > 0 ? 'var(--accent)' : 'var(--gray)' }}>
                      {g.importo > 0 ? fmtEur(g.importo) : '—'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer batch */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px',
                background: 'var(--gray-light)',
                border: '1px solid var(--border)',
                borderRadius: 4, marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)' }}>
                    <input type="checkbox" onChange={e => selezionaTutti(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                    SELEZIONA TUTTI CON IMPORTO
                  </label>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)' }}>
                    {selezionati.length} bonifici selezionati
                  </span>
                  {senzaIban.length > 0 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--rosso)' }}>
                      ⚠ {senzaIban.length} senza IBAN valido
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)' }}>TOTALE BATCH</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, color: 'var(--accent)' }}>
                      {fmtEur(totale)}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={generaBatch}
                    disabled={generando || selezionati.length === 0 || senzaIban.length > 0}
                  >
                    {generando ? 'Generazione…' : `Genera file SEPA (${selezionati.length})`}
                  </button>
                </div>
              </div>

              {/* Istruzioni post-download */}
              {mostraIstruzioni && (
                <div style={{
                  background: 'rgba(200,240,0,0.05)',
                  border: '1px solid rgba(200,240,0,0.2)',
                  borderRadius: 6, padding: '20px 24px', marginBottom: 24,
                }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900, color: 'var(--accent)', marginBottom: 12 }}>
                    File scaricato: {nomeFile}
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--white)', lineHeight: 1.8, marginBottom: 16 }}>
                    <strong style={{ color: 'var(--accent)' }}>Passo successivo</strong> — carica il file nella tua home banking:
                  </div>
                  <ol style={{ margin: 0, paddingLeft: 22, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gray)', lineHeight: 2 }}>
                    <li>Accedi all'home banking della tua banca</li>
                    <li>Cerca <em>Bonifici SEPA</em> oppure <em>Disposizioni massive</em> oppure <em>Import file XML</em></li>
                    <li>Carica il file <strong style={{ color: 'var(--white)' }}>{nomeFile}</strong></li>
                    <li>Verifica l'elenco dei bonifici e conferma</li>
                    <li>I fondi saranno accreditati entro 1–2 giorni lavorativi</li>
                  </ol>
                  <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center' }}>
                    {batchId && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => batchId && segnaEseguito(batchId)}
                      >
                        ✓ Segna come eseguito (bonifici inviati)
                      </button>
                    )}
                    <button className="btn btn-secondary btn-sm" onClick={() => setMostraIstruzioni(false)}>
                      Chiudi
                    </button>
                  </div>
                </div>
              )}

              {/* Batch storici */}
              {batches.length > 0 && (
                <div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.15em',
                    textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 12,
                  }}>
                    Batch precedenti
                  </div>
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {batches.map(b => (
                      <div key={b.id} style={{
                        display: 'grid', gridTemplateColumns: '1fr 120px 100px 120px auto',
                        alignItems: 'center', gap: 12, padding: '12px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>
                            {b.descrizione}
                          </div>
                          {b.data_generazione && (
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>
                              Generato {fmt(b.data_generazione)}
                            </div>
                          )}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--white)' }}>
                          {b.n_bonifici} bonifici
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                          {fmtEur(Number(b.importo_totale))}
                        </div>
                        <div>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 11,
                            color: statoColor(b.stato), textTransform: 'uppercase',
                          }}>
                            {b.stato === 'eseguito' ? '✓ Eseguito' : b.stato === 'generato' ? '⏳ Generato' : '○ Bozza'}
                          </span>
                          {b.data_esecuzione && (
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginTop: 1 }}>
                              {fmt(b.data_esecuzione)}
                            </div>
                          )}
                        </div>
                        <div>
                          {b.stato === 'generato' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => segnaEseguito(b.id)}
                            >
                              Segna eseguito
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB: REGISTRO RAS ───────────────────────────────── */}
          {tab === 'ras' && (
            <div>
              {/* Selezione mese/anno per RAS */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
                <select className="input" style={{ width: 140 }} value={mese} onChange={e => setMese(+e.target.value)}>
                  {MESI.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select className="input" style={{ width: 100 }} value={anno} onChange={e => setAnno(+e.target.value)}>
                  {[anno-1, anno, anno+1].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)' }}>
                  {rasDelMese.length} registrazioni
                </span>
              </div>

              {/* Alert */}
              {rasNonInseriti > 0 && (
                <div className="alert alert-warning" style={{ marginBottom: 16 }}>
                  ⚠ {rasNonInseriti} pagamento{rasNonInseriti > 1 ? 'i' : ''} non ancora inserito{rasNonInseriti > 1 ? 'i' : ''} nel portale RAS FIGC
                </div>
              )}
              {rasNoQuietanza > 0 && now.getMonth() >= 4 && (
                <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                  🔴 {rasNoQuietanza} quietanza{rasNoQuietanza > 1 ? 'e' : ''} non firmata{rasNoQuietanza > 1 ? 'e' : ''} —
                  verifica le firme per l'iscrizione al campionato 2026-27
                </div>
              )}

              {/* Tabella RAS */}
              {rasDelMese.length === 0 ? (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  Nessuna registrazione RAS per {MESI[mese-1]} {anno}.<br/>
                  Genera un batch di rimborsi per creare le registrazioni automaticamente.
                </div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 100px 80px 80px 120px 90px 90px',
                    gap: 0, padding: '10px 16px',
                    background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)',
                  }}>
                    {['NOME','TIPO','MESE','IMPORTO','DESCRIZIONE','RAS INS.','QUIETANZA'].map(h => (
                      <div key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', letterSpacing: '0.1em' }}>{h}</div>
                    ))}
                  </div>
                  {rasDelMese.map(r => (
                    <div key={r.id} style={{
                      display: 'grid', gridTemplateColumns: '1fr 100px 80px 80px 120px 90px 90px',
                      gap: 0, alignItems: 'center', padding: '10px 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>
                        {r.nome_cognome}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)' }}>{r.tipo}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)' }}>{MESI[r.mese-1].slice(0,3)} {r.anno}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                        {fmtEur(r.importo)}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', paddingRight: 8 }}>
                        {r.descrizione.slice(0, 30)}{r.descrizione.length > 30 ? '…' : ''}
                      </div>
                      {/* Toggle RAS inserito */}
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input
                            type="checkbox" checked={r.ras_inserito}
                            onChange={() => toggleRas(r.id, 'ras_inserito', r.ras_inserito)}
                            style={{ accentColor: 'var(--accent)' }}
                          />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: r.ras_inserito ? 'var(--accent)' : 'var(--gray)' }}>
                            {r.ras_inserito ? 'Sì' : 'No'}
                          </span>
                        </label>
                      </div>
                      {/* Toggle quietanza firmata */}
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input
                            type="checkbox" checked={r.quietanza_firmata}
                            onChange={() => toggleRas(r.id, 'quietanza_firmata', r.quietanza_firmata)}
                            style={{ accentColor: 'var(--accent)' }}
                          />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: r.quietanza_firmata ? 'var(--accent)' : 'var(--gray)' }}>
                            {r.quietanza_firmata ? 'Sì' : 'No'}
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Totali mese */}
              {rasDelMese.length > 0 && (
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
                  background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginTop: 20,
                }}>
                  {[
                    ['TOTALE PAGAMENTI', fmtEur(rasDelMese.reduce((s,r) => s + r.importo, 0))],
                    ['RAS INSERITI', `${rasDelMese.filter(r => r.ras_inserito).length} / ${rasDelMese.length}`],
                    ['QUIETANZE FIRMATE', `${rasDelMese.filter(r => r.quietanza_firmata).length} / ${rasDelMese.length}`],
                  ].map(([label, val]) => (
                    <div key={label} style={{ background: 'var(--gray-light)', padding: '14px 20px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, color: 'var(--white)' }}>{val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
    </FeatureGate>
  )
}
