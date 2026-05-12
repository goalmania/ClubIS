'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Drawer, Toast } from '@/components/ui'

export type TemplateRata = {
  numero: number
  importoDef: number
  mesiDaOggi: number
}

type RataEdit = {
  numero: number
  importo: number
  scadenza: string
}

type Modalita = 'auto' | 'manuale'

type Famiglia = { id: string; nome: string; cognome: string }

function addMesi(months: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })

export default function QuickPianoPagamento({
  open,
  onClose,
  clubId,
  templateNome,
  templateRate,
}: {
  open: boolean
  onClose: () => void
  clubId: string
  templateNome: string
  templateRate: TemplateRata[]
}) {
  const supabase = createClient()

  const [famiglie,    setFamiglie]    = useState<Famiglia[]>([])
  const [famId,       setFamId]       = useState('')
  const [descrizione, setDescrizione] = useState(templateNome)
  const [rate,        setRate]        = useState<RataEdit[]>([])
  const [saving,      setSaving]      = useState(false)
  const [toast,       setToast]       = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  // Modalità auto-calcolo
  const [modalita,      setModalita]      = useState<Modalita>('auto')
  const [importoTotale, setImportoTotale] = useState('')
  const [numeroRate,    setNumeroRate]    = useState('12')
  const [primaScadenza, setPrimaScadenza] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() + 1)
    return d.toISOString().split('T')[0]
  })

  // Rigenera le rate in modalità auto quando cambiano importo/numero/scadenza
  function generaRateAuto() {
    const tot = parseFloat(importoTotale)
    const n   = parseInt(numeroRate)
    if (!tot || !n || !primaScadenza) return
    const importoRata = tot / n
    const scad = new Date(primaScadenza)
    setRate(Array.from({ length: n }, (_, i) => {
      const d = new Date(scad)
      d.setMonth(d.getMonth() + i)
      return {
        numero:   i + 1,
        importo:  parseFloat(importoRata.toFixed(2)),
        scadenza: d.toISOString().split('T')[0],
      }
    }))
  }

  useEffect(() => {
    if (modalita === 'auto') generaRateAuto()
  }, [importoTotale, numeroRate, primaScadenza, modalita]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    setDescrizione(templateNome)
    setFamId('')
    setModalita('auto')
    setImportoTotale('')
    setNumeroRate('12')
    setRate(
      templateRate.length > 1
        ? templateRate.map(r => ({
            numero: r.numero,
            importo: r.importoDef,
            scadenza: addMesi(r.mesiDaOggi),
          }))
        : [],
    )
    // famiglie non ha club_id: recupera prima i giocatori tesserati, poi le loro famiglie
    supabase
      .from('tesseramenti')
      .select('giocatore_id')
      .eq('club_id', clubId)
      .eq('stato', 'attivo')
      .then(async ({ data: tess }) => {
        const gIds = (tess ?? []).map((t: any) => t.giocatore_id).filter(Boolean)
        if (!gIds.length) return
        const { data } = await supabase
          .from('famiglie')
          .select('id, nome, cognome, giocatore_id')
          .in('giocatore_id', gIds)
          .order('cognome')
        setFamiglie(data ?? [])
      })
  }, [open, templateNome, templateRate, clubId])

  const totale = rate.reduce((s, r) => s + Number(r.importo), 0)

  const aggRate = (idx: number, field: 'importo' | 'scadenza', val: string) => {
    setRate(prev =>
      prev.map((r, i) =>
        i === idx ? { ...r, [field]: field === 'importo' ? Number(val) : val } : r,
      ),
    )
  }

  const submit = async () => {
    if (!famId) {
      setToast({ msg: 'Seleziona una famiglia', tipo: 'error' })
      return
    }
    if (!descrizione.trim()) {
      setToast({ msg: 'Inserisci una descrizione', tipo: 'error' })
      return
    }
    if (modalita === 'auto' && rate.length === 0) {
      setToast({ msg: 'Inserisci importo totale e numero di rate', tipo: 'error' })
      return
    }
    setSaving(true)

    const { data: piano, error: errPiano } = await supabase
      .from('piani_pagamento')
      .insert({
        club_id:        clubId,
        famiglia_id:    famId,
        descrizione:    descrizione.trim(),
        importo_totale: totale,
      })
      .select('id')
      .single()

    if (errPiano || !piano) {
      setSaving(false)
      setToast({ msg: errPiano?.message ?? 'Errore creazione piano', tipo: 'error' })
      return
    }

    const payload = rate.map(r => ({
      piano_id: piano.id,
      club_id: clubId,
      famiglia_id: famId,
      numero_rata: r.numero,
      importo: r.importo,
      scadenza: r.scadenza,
      stato: 'in_attesa',
    }))

    const { error: errRate } = await supabase.from('rate_pagamento').insert(payload)
    setSaving(false)

    if (errRate) {
      setToast({ msg: errRate.message, tipo: 'error' })
      return
    }

    setToast({ msg: 'Piano creato con successo', tipo: 'success' })
    setTimeout(onClose, 1200)
  }

  return (
    <>
      <Drawer open={open} onClose={onClose} title={`Nuovo piano: ${templateNome}`} width={560}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Famiglia */}
          <div>
            <label className="label">Famiglia *</label>
            <select className="input" value={famId} onChange={e => setFamId(e.target.value)}>
              <option value="">Seleziona famiglia...</option>
              {famiglie.map(f => (
                <option key={f.id} value={f.id}>
                  {f.cognome} {f.nome}
                </option>
              ))}
            </select>
            {famiglie.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Nessuna famiglia registrata per questo club.
              </div>
            )}
          </div>

          {/* Descrizione */}
          <div>
            <label className="label">Descrizione piano *</label>
            <input
              className="input"
              value={descrizione}
              onChange={e => setDescrizione(e.target.value)}
              placeholder="es. Quota mensile stagione 2026/27"
            />
          </div>

          {/* Rate — switcher modalità */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label className="label" style={{ margin: 0 }}>Rate</label>
              <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                {(['auto', 'manuale'] as Modalita[]).map(m => (
                  <button key={m} onClick={() => setModalita(m)} style={{
                    padding: '4px 12px', fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', border: 'none',
                    background: modalita === m ? 'var(--accent)' : 'transparent',
                    color: modalita === m ? '#000' : 'var(--text-muted)',
                    textTransform: 'uppercase', fontWeight: modalita === m ? 700 : 400,
                  }}>
                    {m === 'auto' ? 'Calcola auto' : 'Manuale'}
                  </button>
                ))}
              </div>
            </div>

            {/* Modalità AUTO */}
            {modalita === 'auto' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label className="label">Importo totale (€)</label>
                  <input className="input" type="number" min={0} step={1} placeholder="es. 100"
                    value={importoTotale} onChange={e => setImportoTotale(e.target.value)} />
                </div>
                <div>
                  <label className="label">N. rate</label>
                  <select className="input" value={numeroRate} onChange={e => setNumeroRate(e.target.value)}>
                    {[1,2,3,4,5,6,8,10,12].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'rata' : 'rate'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Prima scadenza</label>
                  <input className="input" type="date" value={primaScadenza}
                    onChange={e => setPrimaScadenza(e.target.value)} />
                </div>
              </div>
            )}

            {/* Anteprima / rate manuali */}
            {rate.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rate.length} rate generate</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--accent-green)' }}>
                    Totale: {fmt(totale)}
                  </span>
                </div>
                {/* Header colonne */}
                <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 1fr', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>#</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Importo (€)</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Scadenza</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                  {rate.map((r, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 1fr', gap: 8, alignItems: 'center' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', background: 'var(--bg-input)', borderRadius: 6, padding: '6px 0', border: '1px solid var(--border)' }}>
                        {r.numero}
                      </div>
                      <input className="input" type="number" min={0} step={0.01}
                        value={r.importo} onChange={e => aggRate(i, 'importo', e.target.value)} />
                      <input className="input" type="date"
                        value={r.scadenza} onChange={e => aggRate(i, 'scadenza', e.target.value)} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pulsante aggiungi rata (solo modalità manuale) */}
            {modalita === 'manuale' && (
              <button onClick={() => setRate(prev => [...prev, {
                numero: prev.length + 1,
                importo: 0,
                scadenza: addMesi(prev.length),
              }])} style={{
                marginTop: 8, padding: '6px 14px', background: 'transparent',
                border: '1px dashed var(--border)', borderRadius: 6,
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, width: '100%',
              }}>
                + Aggiungi rata
              </button>
            )}
          </div>

          {/* Azioni */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>
              Annulla
            </button>
            <button className="btn btn-primary" onClick={submit} disabled={saving}>
              {saving ? 'Creazione...' : 'Crea piano'}
            </button>
          </div>
        </div>
      </Drawer>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </>
  )
}
