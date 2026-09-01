'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClubId, useTipoProdotto } from '@/lib/club-context'
import { PageHeader, EmptyState, Toast, Drawer, FormField, FormGrid, Modal, TabBar } from '@/components/ui'
import { stagioneCorrente } from '@/lib/helpers'

function generaStagioni(): string[] {
  const anno = new Date().getFullYear()
  const stagioni: string[] = []
  for (let a = anno + 3; a >= anno - 2; a--) {
    stagioni.push(`${a}-${String(a + 1).slice(-2)}`)
  }
  return stagioni
}

const STAGIONI = generaStagioni()

// Mesi di una stagione scuola calcio (settembre → giugno), nell'ordine in cui si susseguono
const MESI_SCUOLA = [
  { n: 9,  label: 'Settembre' }, { n: 10, label: 'Ottobre' }, { n: 11, label: 'Novembre' },
  { n: 12, label: 'Dicembre' },  { n: 1,  label: 'Gennaio' }, { n: 2,  label: 'Febbraio' },
  { n: 3,  label: 'Marzo' },     { n: 4,  label: 'Aprile' },  { n: 5,  label: 'Maggio' },
  { n: 6,  label: 'Giugno' },
]
const MESE_LABEL: Record<number, string> = Object.fromEntries(MESI_SCUOLA.map(m => [m.n, m.label]))

function meseCorrenteDefault(): number {
  const oggi = new Date().getMonth() + 1
  return MESI_SCUOLA.some(m => m.n === oggi) ? oggi : 9
}

// Se il segretario non imposta una scadenza esplicita, ne calcoliamo una di
// default (il 10 del mese di competenza) — senza questa data la quota non
// verrebbe mai intercettata dal promemoria automatico alle famiglie.
function scadenzaDefaultPerMese(stagione: string, mese: number): string {
  const annoBase = parseInt(stagione.split('-')[0], 10)
  const anno = mese >= 9 ? annoBase : annoBase + 1
  return `${anno}-${String(mese).padStart(2, '0')}-10`
}

export default function QuotePage() {
  const supabase = createClient()
  const clubId = useClubId()
  const isScuolaCalcio = useTipoProdotto() === 'scuola_calcio_standalone'

  const [quote,   setQuote]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro,  setFiltro]  = useState<'tutti' | 'non_pagato' | 'parziale' | 'pagato'>('tutti')
  const [meseFiltro, setMeseFiltro] = useState<number | 'tutti'>('tutti')
  const [toast,   setToast]   = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [stagione,setStagione]= useState(() => {
    const anno = new Date().getFullYear()
    const mese = new Date().getMonth() // 0-based; luglio=6 è inizio stagione calcistica
    const annoBase = mese >= 6 ? anno : anno - 1
    return `${annoBase}-${String(annoBase + 1).slice(-2)}`
  })

  // Drawer — nuova quota (club agonistici: quota unica di stagione)
  const [drawerOpen,     setDrawerOpen]     = useState(false)
  const [giocatoriList,  setGiocatoriList]  = useState<any[]>([])
  const [nGiocatoreId,   setNGiocatoreId]   = useState('')
  const [nStagione,      setNStagione]      = useState(() => stagioneCorrente())
  const [nImporto,       setNImporto]       = useState('')
  const [nStato,         setNStato]         = useState('non_pagato')
  const [nScadenza,      setNScadenza]      = useState('')
  const [nNote,          setNNote]          = useState('')
  const [saving,         setSaving]         = useState(false)

  // Drawer — genera quota mensile (solo scuola calcio)
  const [drawerMeseOpen, setDrawerMeseOpen] = useState(false)
  const [mModalita,      setMModalita]      = useState<'tutti' | 'singolo'>('tutti')
  const [mGiocatoreId,   setMGiocatoreId]   = useState('')
  const [mMese,          setMMese]          = useState(() => meseCorrenteDefault())
  const [mImporto,       setMImporto]       = useState('')
  const [mScadenza,      setMScadenza]      = useState('')
  const [mNote,          setMNote]          = useState('')
  const [savingMese,     setSavingMese]     = useState(false)

  // Piano di pagamento dialog (solo club agonistici)
  const [chiediPiano,    setChiediPiano]    = useState(false)
  const [nRate,          setNRate]          = useState('3')
  const [primaScadenza,  setPrimaScadenza]  = useState('')
  const [savingPiano,    setSavingPiano]    = useState(false)
  const [ultimaQuotaId,  setUltimaQuotaId] = useState<string | null>(null)

  /* ── Load ──────────────────────────────────────────────────────── */

  // Colma in automatico eventuali tesserati attivi che non hanno la quota per
  // un mese già aperto per gli altri (es. aggiunti prima di questo fix, o
  // arrivati da un percorso diverso dal form "Aggiungi giocatore"). Copia
  // importo e scadenza già in uso per quel mese. Idempotente: se non manca
  // nulla non scrive niente.
  async function colmaQuoteMancanti(righeAttuali: any[]) {
    if (!clubId) return righeAttuali
    const mesiEsistenti = [...new Set(righeAttuali.filter(q => q.mese > 0).map(q => q.mese))]
    if (mesiEsistenti.length === 0) return righeAttuali

    const { data: tesserati } = await supabase
      .from('tesseramenti')
      .select('giocatore_id, data_inizio')
      .eq('club_id', clubId)
      .eq('stato', 'attivo')
    if (!tesserati || tesserati.length === 0) return righeAttuali

    // Se un giocatore ha più tesseramenti attivi, tiene la data di inizio più
    // vecchia (la sua prima iscrizione) come riferimento per il mese di partenza.
    const meseIscrizionePerGiocatore = new Map<string, string | null>()
    for (const t of tesserati) {
      const cur = meseIscrizionePerGiocatore.get(t.giocatore_id)
      if (cur === undefined || (t.data_inizio && (!cur || t.data_inizio < cur))) {
        meseIscrizionePerGiocatore.set(t.giocatore_id, t.data_inizio)
      }
    }

    const presente = new Set(righeAttuali.map(q => `${q.giocatore_id}:${q.mese}`))
    const perMese = new Map<number, { importo_totale: number; scadenza: string | null }>()
    for (const m of mesiEsistenti) {
      const ref = righeAttuali.find(q => q.mese === m)
      if (ref) perMese.set(m, { importo_totale: ref.importo_totale, scadenza: ref.scadenza })
    }

    // Stagione scuola calcio: settembre(9)..dicembre(12), gennaio(1)..giugno(6).
    // Normalizza l'ordine cronologico reale per confrontare "mese >= iscrizione".
    const ordineStagione = (m: number) => (m >= 7 ? m : m + 12)

    const daCreare: any[] = []
    for (const [gid, dataInizio] of meseIscrizionePerGiocatore.entries()) {
      const meseIscrizione = dataInizio ? new Date(dataInizio).getMonth() + 1 : 1
      const soglia = ordineStagione(meseIscrizione)
      for (const m of mesiEsistenti) {
        if (ordineStagione(m) < soglia) continue
        if (presente.has(`${gid}:${m}`)) continue
        const dati = perMese.get(m)
        if (!dati) continue
        daCreare.push({
          giocatore_id: gid, club_id: clubId, stagione, mese: m,
          importo_totale: dati.importo_totale, importo_pagato: 0, stato: 'non_pagato',
          scadenza: dati.scadenza,
        })
      }
    }
    if (daCreare.length === 0) return righeAttuali

    const { data: creati } = await supabase
      .from('quote_iscrizione')
      .upsert(daCreare, { onConflict: 'giocatore_id,club_id,stagione,mese', ignoreDuplicates: true })
      .select('*, giocatori(id, nome, cognome)')

    return [...righeAttuali, ...(creati ?? [])]
  }

  const load = useCallback(async () => {
    if (!clubId) return
    setLoading(true)

    const { data } = await supabase
      .from('quote_iscrizione')
      .select('*, giocatori(id, nome, cognome)')
      .eq('club_id', clubId)
      .eq('stagione', stagione)
      .order('mese')
      .order('stato')

    let righe = data ?? []
    if (isScuolaCalcio) righe = await colmaQuoteMancanti(righe)

    setQuote(righe)
    setLoading(false)
  }, [stagione, clubId, isScuolaCalcio])

  useEffect(() => { load() }, [load])

  const caricaTesseratiAttivi = useCallback(async () => {
    if (!clubId) return [] as any[]
    const { data: tesserati } = await supabase
      .from('tesseramenti')
      .select('giocatori(id, nome, cognome)')
      .eq('club_id', clubId)
      .eq('stato', 'attivo')
    return tesserati?.map(t => t.giocatori as any).filter(Boolean) ?? []
  }, [clubId])

  /* ── Apri drawer (agonistico) ──────────────────────────────────── */

  async function apriDrawer() {
    setGiocatoriList(await caricaTesseratiAttivi())
    setNGiocatoreId('')
    setNStagione(stagione)
    setNImporto('')
    setNStato('non_pagato')
    setNScadenza('')
    setNNote('')
    setDrawerOpen(true)
  }

  /* ── Apri drawer (quota mensile scuola calcio) ────────────────── */

  async function apriDrawerMese() {
    setGiocatoriList(await caricaTesseratiAttivi())
    setMModalita('tutti')
    setMGiocatoreId('')
    setMMese(meseCorrenteDefault())
    setMImporto('')
    setMScadenza('')
    setMNote('')
    setDrawerMeseOpen(true)
  }

  /* ── Salva quota (agonistico) ──────────────────────────────────── */

  async function salvaQuota() {
    if (!nGiocatoreId || !nImporto) {
      setToast({ msg: 'Giocatore e importo sono obbligatori', tipo: 'error' }); return
    }
    setSaving(true)
    const { data: nuova, error } = await supabase
      .from('quote_iscrizione')
      .insert({
        giocatore_id:   nGiocatoreId,
        club_id:        clubId,
        stagione:       nStagione,
        importo_totale: parseFloat(nImporto),
        importo_pagato: 0,
        stato:          nStato,
        scadenza:       nScadenza || null,
        note:           nNote || null,
      })
      .select('id')
      .single()
    setSaving(false)

    if (error) {
      const msg = error.code === '23505'
        ? `Quota già esistente per questo giocatore nella stagione ${nStagione}`
        : error.message
      setToast({ msg, tipo: 'error' }); return
    }

    setDrawerOpen(false)
    await load()
    setToast({ msg: 'Quota creata', tipo: 'success' })

    if (parseFloat(nImporto) > 0 && nuova?.id) {
      setUltimaQuotaId(nuova.id)
      setPrimaScadenza(nScadenza || '')
      setNRate('3')
      setChiediPiano(true)
    }
  }

  /* ── Genera quota/e mensile/i (scuola calcio) ─────────────────── */

  async function generaQuoteMensili() {
    if (!mImporto || !clubId) {
      setToast({ msg: 'L\'importo della quota è obbligatorio', tipo: 'error' }); return
    }
    if (mModalita === 'singolo' && !mGiocatoreId) {
      setToast({ msg: 'Seleziona un giocatore', tipo: 'error' }); return
    }
    setSavingMese(true)
    const importo = parseFloat(mImporto)

    if (mModalita === 'tutti') {
      const ids = [...new Set(giocatoriList.map(g => g.id))]
      if (ids.length === 0) {
        setSavingMese(false)
        setToast({ msg: 'Nessun tesserato attivo trovato', tipo: 'error' }); return
      }
      const payload = ids.map(id => ({
        giocatore_id:   id,
        club_id:        clubId,
        stagione,
        mese:           mMese,
        importo_totale: importo,
        importo_pagato: 0,
        stato:          'non_pagato',
        scadenza:       mScadenza || scadenzaDefaultPerMese(stagione, mMese),
        note:           mNote || null,
      }))
      const { data, error } = await supabase
        .from('quote_iscrizione')
        .upsert(payload, { onConflict: 'giocatore_id,club_id,stagione,mese', ignoreDuplicates: true })
        .select('id')
      setSavingMese(false)
      if (error) { setToast({ msg: error.message, tipo: 'error' }); return }

      const creati  = data?.length ?? 0
      const saltati = ids.length - creati
      setToast({
        msg: `${creati} quote di ${MESE_LABEL[mMese]} create` + (saltati > 0 ? ` — ${saltati} già esistenti, saltate` : ''),
        tipo: 'success',
      })
      setDrawerMeseOpen(false)
      load()
    } else {
      const { error } = await supabase.from('quote_iscrizione').insert({
        giocatore_id:   mGiocatoreId,
        club_id:        clubId,
        stagione,
        mese:           mMese,
        importo_totale: importo,
        importo_pagato: 0,
        stato:          'non_pagato',
        scadenza:       mScadenza || scadenzaDefaultPerMese(stagione, mMese),
        note:           mNote || null,
      })
      setSavingMese(false)
      if (error) {
        const msg = error.code === '23505'
          ? `Quota di ${MESE_LABEL[mMese]} già esistente per questo giocatore`
          : error.message
        setToast({ msg, tipo: 'error' }); return
      }
      setToast({ msg: `Quota di ${MESE_LABEL[mMese]} creata`, tipo: 'success' })
      setDrawerMeseOpen(false)
      load()
    }
  }

  /* ── Crea piano di pagamento (agonistico) ─────────────────────── */

  async function creaPiano() {
    if (!ultimaQuotaId || !primaScadenza || !nRate || !nGiocatoreId || !clubId) return
    setSavingPiano(true)

    const { data: famData } = await supabase
      .from('famiglie')
      .select('id')
      .eq('giocatore_id', nGiocatoreId)
      .maybeSingle()

    if (!famData?.id) {
      setSavingPiano(false)
      setToast({ msg: 'Nessuna famiglia collegata a questo giocatore. Crea prima il collegamento famiglia.', tipo: 'error' })
      setChiediPiano(false)
      return
    }

    const importoTot = parseFloat(nImporto)
    const { data: piano, error: errPiano } = await supabase
      .from('piani_pagamento')
      .insert({
        club_id:        clubId,
        famiglia_id:    famData.id,
        descrizione:    `Quota iscrizione stagione ${nStagione}`,
        importo_totale: importoTot,
      })
      .select('id')
      .single()

    if (errPiano || !piano) {
      setSavingPiano(false)
      setToast({ msg: errPiano?.message ?? 'Errore creazione piano', tipo: 'error' })
      return
    }

    const n = parseInt(nRate)
    const importoRata = importoTot / n
    const scad = new Date(primaScadenza)

    const ratePayload = Array.from({ length: n }, (_, i) => {
      const d = new Date(scad)
      d.setMonth(d.getMonth() + i)
      return {
        piano_id:     piano.id,
        club_id:      clubId,
        famiglia_id:  famData.id,
        numero_rata:  i + 1,
        importo:      parseFloat(importoRata.toFixed(2)),
        scadenza:     d.toISOString().split('T')[0],
        stato:        'in_attesa',
      }
    })

    const { error: errRate } = await supabase.from('rate_pagamento').insert(ratePayload)
    setSavingPiano(false)
    setChiediPiano(false)

    if (errRate) {
      setToast({ msg: errRate.message, tipo: 'error' })
      return
    }
    setToast({ msg: `Piano creato: ${n} rate da €${importoRata.toFixed(2)} — visibile alla famiglia`, tipo: 'success' })
  }

  /* ── Azioni tabella ────────────────────────────────────────────── */

  const registraPagamento = async (quotaId: string, importo: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('pagamenti').insert({
      quota_id:       quotaId,
      importo,
      metodo:         'contanti',
      data_pagamento: new Date().toISOString().split('T')[0],
      registrato_da:  user!.id,
    })

    // Scuola calcio: la quota incassata entra subito in Prima Nota come
    // entrata, senza doverla ribattere a mano.
    if (isScuolaCalcio && clubId) {
      const quota = quote.find(q => q.id === quotaId)
      const nomeGiocatore = quota?.giocatori ? `${quota.giocatori.cognome} ${quota.giocatori.nome}` : ''
      const meseLabel = quota ? MESE_LABEL[quota.mese] ?? '' : ''
      await supabase.from('prima_nota').insert({
        club_id:      clubId,
        tipo:         'entrata',
        categoria:    'quote_iscrizione',
        importo,
        data:         new Date().toISOString().split('T')[0],
        descrizione:  `Quota ${meseLabel} — ${nomeGiocatore}`.trim(),
        registrato_da: user!.id,
      })
    }

    setToast({ msg: 'Pagamento registrato', tipo: 'success' })
    load()
  }

  const inviaSOllecito = async (_giocatoreId: string) => {
    setToast({ msg: 'Sollecito inviato alla famiglia', tipo: 'success' })
  }

  /* ── Derived ───────────────────────────────────────────────────── */

  const filtrate = quote
    .filter(q => filtro === 'tutti' || q.stato === filtro)
    .filter(q => !isScuolaCalcio || meseFiltro === 'tutti' || q.mese === meseFiltro)

  const totArretrato = quote
    .filter(q => q.stato !== 'pagato' && q.stato !== 'esonerato')
    .reduce((s, q) => s + (q.importo_totale - q.importo_pagato), 0)

  const statoColore: Record<string, string> = {
    non_pagato: 'badge-rosso', parziale: 'badge-ambra',
    pagato: 'badge-verde', esonerato: 'badge-grigio', rimborsato: 'badge-blu',
  }

  const nQuoteScadute = quote.filter(q => q.stato !== 'pagato').length

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div>
      <PageHeader
        title={isScuolaCalcio ? 'Quote mensili' : 'Quote iscrizione'}
        subtitle={
          isScuolaCalcio
            ? `Stagione ${stagione} · Retta mensile dei tesserati · Arretrato totale: €${totArretrato.toFixed(0)}`
            : `Stagione ${stagione} · Arretrato totale: €${totArretrato.toFixed(0)}`
        }
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <select className="input" style={{ width: 120 }} value={stagione} onChange={e => setStagione(e.target.value)}>
              {STAGIONI.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {isScuolaCalcio ? (
              <button className="btn btn-primary btn-sm" onClick={apriDrawerMese}>+ Nuova quota mensile</button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={apriDrawer}>+ Nuova quota</button>
            )}
          </div>
        }
      />

      {isScuolaCalcio && (
        <div className="alert" style={{ marginBottom: 20, fontSize: 13, background: 'var(--grigio-6)', border: '1px solid var(--border-solid)' }}>
          💡 Ogni mese genera una quota per tutti i tesserati (o per un solo giocatore) con l'importo della retta
          mensile. Segna il pagamento quando arriva, mese per mese — come una palestra.
        </div>
      )}

      {totArretrato > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Arretrato totale da riscuotere: <strong>€{totArretrato.toFixed(2)}</strong> su {nQuoteScadute} {isScuolaCalcio ? 'quote mensili' : 'giocatori'}.
        </div>
      )}

      {/* Tab mesi — solo scuola calcio */}
      {isScuolaCalcio && (
        <div style={{ marginBottom: 14 }}>
          <TabBar
            tabs={[
              { key: 'tutti', label: 'Tutti i mesi', count: quote.length },
              ...MESI_SCUOLA.map(m => ({ key: String(m.n), label: m.label, count: quote.filter(q => q.mese === m.n).length })),
            ]}
            active={String(meseFiltro)}
            onChange={v => setMeseFiltro(v === 'tutti' ? 'tutti' : parseInt(v))}
          />
        </div>
      )}

      {/* Filtri stato */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {([
          { v: 'tutti' as const,      l: `Tutti (${quote.length})` },
          { v: 'non_pagato' as const, l: `Non pagato (${quote.filter(q => q.stato === 'non_pagato').length})` },
          { v: 'parziale' as const,   l: `Parziale (${quote.filter(q => q.stato === 'parziale').length})` },
          { v: 'pagato' as const,     l: `Pagato (${quote.filter(q => q.stato === 'pagato').length})` },
        ]).map(f => (
          <button key={f.v} onClick={() => setFiltro(f.v)}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              border: filtro === f.v ? '1px solid var(--verde)' : '1px solid var(--grigio-5)',
              background: filtro === f.v ? 'var(--verde-lt)' : 'transparent',
              color: filtro === f.v ? 'var(--verde)' : 'var(--grigio-3)',
              fontWeight: filtro === f.v ? 500 : 400,
            }}
          >
            {f.l}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)' }}>Caricamento...</div>
        ) : filtrate.length === 0 ? (
          <EmptyState
            icon="💶"
            title={isScuolaCalcio ? 'Nessuna quota mensile' : 'Nessuna quota'}
            subtitle={isScuolaCalcio ? 'Genera la prima quota mensile per iniziare' : 'Aggiungi la prima quota per iniziare'}
            action={{ label: isScuolaCalcio ? '+ Nuova quota mensile' : '+ Nuova quota', href: '#' }}
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Giocatore</th>
                  {isScuolaCalcio && <th>Mese</th>}
                  <th>Totale</th>
                  <th>Pagato</th>
                  <th>Da pagare</th>
                  <th>Stato</th>
                  <th>Scadenza</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtrate.map(q => {
                  const g      = q.giocatori
                  const manca  = q.importo_totale - q.importo_pagato
                  const perc   = q.importo_totale > 0 ? Math.round((q.importo_pagato / q.importo_totale) * 100) : 0
                  return (
                    <tr key={q.id}>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{g?.cognome} {g?.nome}</td>
                      {isScuolaCalcio && (
                        <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>
                          {q.mese ? MESE_LABEL[q.mese] ?? q.mese : '—'}
                        </td>
                      )}
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>€{q.importo_totale.toFixed(0)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress" style={{ width: 60 }}>
                            <div className="progress-fill" style={{
                              width: `${perc}%`,
                              background: q.stato === 'pagato' ? 'var(--verde)' : q.stato === 'parziale' ? 'var(--ambra)' : 'var(--rosso)',
                            }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--grigio-3)' }}>
                            €{q.importo_pagato.toFixed(0)}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: manca > 0 ? 'var(--rosso)' : 'var(--grigio-4)', fontWeight: manca > 0 ? 600 : 400 }}>
                        {manca > 0 ? `€${manca.toFixed(0)}` : '—'}
                      </td>
                      <td>
                        <span className={`badge ${statoColore[q.stato] ?? 'badge-grigio'}`}>
                          {q.stato.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>
                        {q.scadenza ? new Date(q.scadenza).toLocaleDateString('it-IT') : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {q.stato !== 'pagato' && (
                            <>
                              <button
                                className="btn btn-sm"
                                style={{ background: 'var(--verde-lt)', color: 'var(--verde)', border: 'none', fontSize: 12 }}
                                onClick={() => registraPagamento(q.id, manca)}
                              >
                                ✓ Paga
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ fontSize: 12 }}
                                onClick={() => inviaSOllecito(q.giocatore_id)}
                              >
                                Sollecita
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Drawer nuova quota (club agonistici) ──────────────────── */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nuova quota iscrizione" width={560}>
        <FormField label="Giocatore" required>
          <select
            className="input"
            style={{ width: '100%' }}
            value={nGiocatoreId}
            onChange={e => setNGiocatoreId(e.target.value)}
          >
            <option value="">— Seleziona giocatore —</option>
            {giocatoriList.map(g => (
              <option key={g.id} value={g.id}>{g.cognome} {g.nome}</option>
            ))}
          </select>
        </FormField>

        <FormGrid cols={2}>
          <FormField label="Stagione" required>
            <input
              className="input"
              style={{ width: '100%' }}
              value={nStagione}
              onChange={e => setNStagione(e.target.value)}
              placeholder="2024-25"
            />
          </FormField>
          <FormField label="Importo totale (€)" required>
            <input
              className="input"
              type="number"
              min="0"
              step="10"
              style={{ width: '100%' }}
              value={nImporto}
              onChange={e => setNImporto(e.target.value)}
              placeholder="350"
            />
          </FormField>
        </FormGrid>

        <FormGrid cols={2}>
          <FormField label="Stato iniziale">
            <select
              className="input"
              style={{ width: '100%' }}
              value={nStato}
              onChange={e => setNStato(e.target.value)}
            >
              <option value="non_pagato">Non pagato</option>
              <option value="parziale">Parziale</option>
              <option value="pagato">Pagato</option>
              <option value="esonerato">Esonerato</option>
            </select>
          </FormField>
          <FormField label="Scadenza prima rata">
            <input
              className="input"
              type="date"
              style={{ width: '100%' }}
              value={nScadenza}
              onChange={e => setNScadenza(e.target.value)}
            />
          </FormField>
        </FormGrid>

        <FormField label="Note">
          <textarea
            className="input"
            rows={3}
            style={{ width: '100%', resize: 'vertical' as const }}
            value={nNote}
            onChange={e => setNNote(e.target.value)}
            placeholder="Eventuali accordi, rate, esenzioni..."
          />
        </FormField>

        {nImporto && parseFloat(nImporto) > 0 && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, background: 'var(--grigio-6)',
            fontSize: 12, color: 'var(--grigio-3)', marginBottom: 8,
          }}>
            💡 Dopo il salvataggio potrai creare un piano di pagamento con rate mensili.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setDrawerOpen(false)}>
            Annulla
          </button>
          <button
            className="btn btn-primary"
            onClick={salvaQuota}
            disabled={saving || !nGiocatoreId || !nImporto}
          >
            {saving ? 'Salvo…' : 'Crea quota'}
          </button>
        </div>
      </Drawer>

      {/* ── Drawer nuova quota mensile (scuola calcio) ────────────── */}
      <Drawer open={drawerMeseOpen} onClose={() => setDrawerMeseOpen(false)} title="Nuova quota mensile" width={560}>
        <FormField label="A chi si applica" required>
          <select className="input" style={{ width: '100%' }} value={mModalita} onChange={e => setMModalita(e.target.value as 'tutti' | 'singolo')}>
            <option value="tutti">Tutti i tesserati attivi ({giocatoriList.length})</option>
            <option value="singolo">Un solo giocatore</option>
          </select>
        </FormField>

        {mModalita === 'singolo' && (
          <FormField label="Giocatore" required>
            <select className="input" style={{ width: '100%' }} value={mGiocatoreId} onChange={e => setMGiocatoreId(e.target.value)}>
              <option value="">— Seleziona giocatore —</option>
              {giocatoriList.map(g => (
                <option key={g.id} value={g.id}>{g.cognome} {g.nome}</option>
              ))}
            </select>
          </FormField>
        )}

        <FormGrid cols={2}>
          <FormField label="Mese" required>
            <select className="input" style={{ width: '100%' }} value={mMese} onChange={e => setMMese(parseInt(e.target.value))}>
              {MESI_SCUOLA.map(m => (
                <option key={m.n} value={m.n}>{m.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Importo retta mensile (€)" required>
            <input
              className="input" type="number" min="0" step="5" style={{ width: '100%' }}
              value={mImporto} onChange={e => setMImporto(e.target.value)} placeholder="40"
            />
          </FormField>
        </FormGrid>

        <FormField label="Scadenza pagamento">
          <input className="input" type="date" style={{ width: '100%' }} value={mScadenza} onChange={e => setMScadenza(e.target.value)} />
          <p style={{ fontSize: 11, color: 'var(--grigio-4)', marginTop: 4 }}>
            Se lasci vuoto, viene impostato automaticamente il 10 del mese di competenza — serve per avvisare le famiglie in tempo.
          </p>
        </FormField>

        <FormField label="Note">
          <textarea
            className="input" rows={2} style={{ width: '100%', resize: 'vertical' as const }}
            value={mNote} onChange={e => setMNote(e.target.value)} placeholder="Eventuali sconti, esenzioni..."
          />
        </FormField>

        {mModalita === 'tutti' && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, background: 'var(--grigio-6)',
            fontSize: 12, color: 'var(--grigio-3)', marginBottom: 8,
          }}>
            💡 Se un giocatore ha già una quota per {MESE_LABEL[mMese]}, non verrà duplicata: viene saltato in automatico.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setDrawerMeseOpen(false)}>
            Annulla
          </button>
          <button
            className="btn btn-primary"
            onClick={generaQuoteMensili}
            disabled={savingMese || !mImporto || (mModalita === 'singolo' && !mGiocatoreId)}
          >
            {savingMese ? 'Genero…' : 'Genera quota mensile'}
          </button>
        </div>
      </Drawer>

      {/* ── Modal piano di pagamento (solo club agonistici) ───────── */}
      <Modal open={chiediPiano} onClose={() => setChiediPiano(false)} title="Piano di pagamento" width={440}>
        <p style={{ fontSize: 13, color: 'var(--grigio-3)', marginBottom: 20 }}>
          Vuoi creare un piano di pagamento con rate mensili per questa quota di{' '}
          <strong style={{ color: 'var(--white)' }}>€{nImporto}</strong>?
        </p>

        <FormGrid cols={2}>
          <FormField label="Numero di rate">
            <select
              className="input"
              style={{ width: '100%' }}
              value={nRate}
              onChange={e => setNRate(e.target.value)}
            >
              <option value="2">2 rate</option>
              <option value="3">3 rate</option>
              <option value="4">4 rate</option>
              <option value="5">5 rate</option>
              <option value="6">6 rate</option>
              <option value="10">10 rate</option>
              <option value="12">12 rate</option>
            </select>
          </FormField>
          <FormField label="Prima scadenza">
            <input
              className="input"
              type="date"
              style={{ width: '100%' }}
              value={primaScadenza}
              onChange={e => setPrimaScadenza(e.target.value)}
            />
          </FormField>
        </FormGrid>

        {nRate && nImporto && (
          <div style={{
            padding: '10px 14px', borderRadius: 8,
            background: 'rgba(200,240,0,0.06)', border: '1px solid rgba(200,240,0,0.2)',
            fontSize: 12, color: 'var(--grigio-2)', marginBottom: 16,
          }}>
            {nRate} rate da <strong style={{ color: 'var(--accent)' }}>
              €{(parseFloat(nImporto) / parseInt(nRate)).toFixed(2)}
            </strong> / mese
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setChiediPiano(false)}>
            Salta
          </button>
          <button
            className="btn btn-primary"
            onClick={creaPiano}
            disabled={savingPiano || !primaScadenza || !nRate}
          >
            {savingPiano ? 'Creo…' : 'Crea piano'}
          </button>
        </div>
      </Modal>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
