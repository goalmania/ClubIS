'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, EmptyState, Toast, Drawer, FormField, FormGrid, Modal } from '@/components/ui'
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

export default function QuotePage() {
  const supabase = createClient()
  const [quote,   setQuote]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro,  setFiltro]  = useState<'tutti' | 'non_pagato' | 'parziale' | 'pagato'>('tutti')
  const [toast,   setToast]   = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [stagione,setStagione]= useState(() => {
    const anno = new Date().getFullYear()
    const mese = new Date().getMonth() // 0-based; luglio=6 è inizio stagione calcistica
    const annoBase = mese >= 6 ? anno : anno - 1
    return `${annoBase}-${String(annoBase + 1).slice(-2)}`
  })
  const [clubId,  setClubId]  = useState<string | null>(null)

  // Drawer — nuova quota
  const [drawerOpen,     setDrawerOpen]     = useState(false)
  const [giocatoriList,  setGiocatoriList]  = useState<any[]>([])
  const [nGiocatoreId,   setNGiocatoreId]   = useState('')
  const [nStagione,      setNStagione]      = useState(() => stagioneCorrente())
  const [nImporto,       setNImporto]       = useState('')
  const [nStato,         setNStato]         = useState('non_pagato')
  const [nScadenza,      setNScadenza]      = useState('')
  const [nNote,          setNNote]          = useState('')
  const [saving,         setSaving]         = useState(false)

  // Piano di pagamento dialog
  const [chiediPiano,    setChiediPiano]    = useState(false)
  const [nRate,          setNRate]          = useState('3')
  const [primaScadenza,  setPrimaScadenza]  = useState('')
  const [savingPiano,    setSavingPiano]    = useState(false)
  const [ultimaQuotaId,  setUltimaQuotaId] = useState<string | null>(null)

  /* ── Load ──────────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } }  = await supabase.auth.getUser()
    if (!user) return
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
    if (!utente) return
    setClubId(utente.club_id)

    const { data } = await supabase
      .from('quote_iscrizione')
      .select('*, giocatori(id, nome, cognome)')
      .eq('club_id', utente.club_id)
      .eq('stagione', stagione)
      .order('stato')
    setQuote(data ?? [])
    setLoading(false)
  }, [stagione])

  useEffect(() => { load() }, [load])

  /* ── Apri drawer ───────────────────────────────────────────────── */

  async function apriDrawer() {
    if (!clubId) return
    const { data: tesserati } = await supabase
      .from('tesseramenti')
      .select('giocatori(id, nome, cognome)')
      .eq('club_id', clubId)
      .eq('stato', 'attivo')
    setGiocatoriList(tesserati?.map(t => t.giocatori as any).filter(Boolean) ?? [])
    setNGiocatoreId('')
    setNStagione(stagione)
    setNImporto('')
    setNStato('non_pagato')
    setNScadenza('')
    setNNote('')
    setDrawerOpen(true)
  }

  /* ── Salva quota ───────────────────────────────────────────────── */

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

  /* ── Crea piano di pagamento ───────────────────────────────────── */

  async function creaPiano() {
    if (!ultimaQuotaId || !primaScadenza || !nRate || !nGiocatoreId || !clubId) return
    setSavingPiano(true)

    // Trova la famiglia collegata al giocatore
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

    // Crea il piano in piani_pagamento (struttura corretta, visibile alla famiglia)
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

    // Crea le rate con i campi corretti
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
    setToast({ msg: 'Pagamento registrato', tipo: 'success' })
    load()
  }

  const inviaSOllecito = async (_giocatoreId: string) => {
    setToast({ msg: 'Sollecito inviato alla famiglia', tipo: 'success' })
  }

  /* ── Derived ───────────────────────────────────────────────────── */

  const filtrate = quote.filter(q => filtro === 'tutti' || q.stato === filtro)
  const totArretrato = quote
    .filter(q => q.stato !== 'pagato' && q.stato !== 'esonerato')
    .reduce((s, q) => s + (q.importo_totale - q.importo_pagato), 0)

  const statoColore: Record<string, string> = {
    non_pagato: 'badge-rosso', parziale: 'badge-ambra',
    pagato: 'badge-verde', esonerato: 'badge-grigio', rimborsato: 'badge-blu',
  }

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div>
      <PageHeader
        title="Quote iscrizione"
        subtitle={`Stagione ${stagione} · Arretrato totale: €${totArretrato.toFixed(0)}`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <select className="input" style={{ width: 120 }} value={stagione} onChange={e => setStagione(e.target.value)}>
              {STAGIONI.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button className="btn btn-primary btn-sm" onClick={apriDrawer}>+ Nuova quota</button>
          </div>
        }
      />

      {totArretrato > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Arretrato totale da riscuotere: <strong>€{totArretrato.toFixed(2)}</strong> su {quote.filter(q => q.stato !== 'pagato').length} giocatori.
        </div>
      )}

      {/* Filtri */}
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
          <EmptyState icon="💶" title="Nessuna quota" subtitle="Aggiungi la prima quota per iniziare" action={{ label: '+ Nuova quota', href: '#' }} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Giocatore</th>
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

      {/* ── Drawer nuova quota ──────────────────────────────────────── */}
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

      {/* ── Modal piano di pagamento ────────────────────────────────── */}
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
