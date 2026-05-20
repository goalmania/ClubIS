'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Toast, Modal } from '@/components/ui'

interface Ricarica {
  id:      string
  importo: number
  data:    string
  note:    string | null
}

interface ClubCosti {
  costo_definitivo: number
  costo_prestito:   number
}

const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
const fmtD = (d: string) => new Date(d).toLocaleDateString('it-IT')

export default function PortafoglioFIGCPage() {
  const supabase = createClient()
  const [loading, setLoading]     = useState(true)
  const [loaded, setLoaded]       = useState(false)
  const [clubId, setClubId]       = useState<string | null>(null)
  const [ricariche, setRicariche] = useState<Ricarica[]>([])
  const [costi, setCosti]         = useState<ClubCosti>({ costo_definitivo: 8, costo_prestito: 5 })
  const [saldo, setSaldo]         = useState<number | null>(null)
  const [nTess, setNTess]         = useState(0)

  /* Modal ricarica */
  const [modalOpen, setModalOpen] = useState(false)
  const [importo, setImporto]     = useState('')
  const [data, setData]           = useState(new Date().toISOString().split('T')[0])
  const [note, setNote]           = useState('')
  const [salvando, setSalvando]   = useState(false)

  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const ok  = (msg: string) => { setToast({ msg, tipo: 'success' }); setTimeout(() => setToast(null), 3000) }
  const err = (msg: string) => { setToast({ msg, tipo: 'error'   }); setTimeout(() => setToast(null), 4000) }

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
    const cId = utente?.club_id
    if (!cId) { setLoading(false); return }
    setClubId(cId)

    const [
      { data: clubData },
      { data: ricaricheData },
      { data: tessData },
    ] = await Promise.all([
      supabase.from('clubs')
        .select('costo_tesseramento_definitivo, costo_tesseramento_prestito')
        .eq('id', cId).single(),
      supabase.from('ricariche_portafoglio_figc')
        .select('id, importo, data, note')
        .eq('club_id', cId)
        .order('data', { ascending: false }),
      supabase.from('tesseramenti')
        .select('tipo_tesseramento, created_at')
        .eq('club_id', cId)
        .eq('stato', 'attivo'),
    ])

    const cd = { costo_definitivo: Number(clubData?.costo_tesseramento_definitivo ?? 8), costo_prestito: Number(clubData?.costo_tesseramento_prestito ?? 5) }
    setCosti(cd)
    setRicariche((ricaricheData ?? []).map((r: any) => ({ ...r, importo: Number(r.importo) })))
    setNTess(tessData?.length ?? 0)

    // Calcola saldo: ultima ricarica - costi tesseramenti da quella data
    const ultima   = (ricaricheData ?? [])[0]
    const dataRef  = ultima?.data ?? null
    const tessDopo = (tessData ?? []).filter((t: any) => !dataRef || (t.created_at as string).split('T')[0] >= dataRef)
    const costoTot = tessDopo.reduce((s: number, t: any) => s + (t.tipo_tesseramento === 'prestito' ? cd.costo_prestito : cd.costo_definitivo), 0)
    setSaldo(ultima ? Number(ultima.importo) - costoTot : null)

    setLoaded(true)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const salvaRicarica = async () => {
    if (!importo || !clubId) return
    setSalvando(true)
    const { error } = await supabase.from('ricariche_portafoglio_figc').insert({
      club_id: clubId,
      importo: parseFloat(importo),
      data,
      note: note || null,
    })
    if (error) { err(`Errore salvataggio: ${error.message}`); setSalvando(false); return }
    ok('Ricarica registrata')
    setModalOpen(false); setImporto(''); setNote('')
    await load()
    setSalvando(false)
  }

  const salvaCosti = async (d: number, p: number) => {
    if (!clubId) return
    await supabase.from('clubs').update({ costo_tesseramento_definitivo: d, costo_tesseramento_prestito: p }).eq('id', clubId)
    setCosti({ costo_definitivo: d, costo_prestito: p })
    ok('Costi aggiornati')
  }

  const saldoColor = saldo === null ? 'var(--gray)' : saldo < 20 ? 'var(--rosso)' : saldo < 50 ? 'var(--ambra)' : 'var(--accent)'

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>Caricamento…</div>

  return (
    <>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registra ricarica portafoglio FIGC"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>IMPORTO RICARICATO (€)</label>
            <input type="number" min="0" step="0.01" className="input" style={{ width: '100%' }} placeholder="100.00" value={importo} onChange={e => setImporto(e.target.value)} />
          </div>
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>DATA RICARICA</label>
            <input type="date" className="input" style={{ width: '100%' }} value={data} onChange={e => setData(e.target.value)} />
          </div>
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>NOTE (opzionale)</label>
            <input type="text" className="input" style={{ width: '100%' }} placeholder="es. Ricarica per tesseramenti marzo" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Annulla</button>
            <button className="btn btn-primary" onClick={salvaRicarica} disabled={salvando || !importo}>
              {salvando ? 'Salvataggio…' : 'Registra ricarica'}
            </button>
          </div>
        </div>
      </Modal>

      <PageHeader
        title="Portafoglio FIGC"
        subtitle="Traccia il saldo stimato del portafoglio per i tesseramenti"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
            + Registra ricarica
          </button>
        }
      />

      {/* Saldo stimato */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1,
        background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 24,
      }}>
        {[
          ['SALDO STIMATO', saldo !== null ? fmt(saldo) : '—', saldoColor],
          ['GIOCATORI TESSERATI', String(nTess), 'var(--white)'],
          ['TOTALE RICARICATO', fmt(ricariche.reduce((s, r) => s + r.importo, 0)), 'var(--gray)'],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: 'var(--gray-light)', padding: '20px 24px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Alert */}
      {saldo !== null && saldo < 50 && (
        <div className={`alert ${saldo < 20 ? 'alert-danger' : 'alert-warning'}`} style={{ marginBottom: 20 }}>
          {saldo < 20
            ? '🔴 Saldo critico — ricarica prima del prossimo tesseramento'
            : '⚠ Saldo basso — considera di ricaricare il portafoglio FIGC'}
          <a href="https://tesseramenti.figc.it" target="_blank" rel="noopener noreferrer"
             style={{ marginLeft: 12, color: 'inherit', fontSize: 11 }}>
            Portale FIGC →
          </a>
        </div>
      )}

      {/* Costi configurazione */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 14 }}>
          Costi stimati per tesseramento
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', display: 'block', marginBottom: 5 }}>TESSERAMENTO DEFINITIVO (€)</label>
            <input type="number" min="0" step="0.5" className="input" style={{ width: '100%' }}
              value={costi.costo_definitivo}
              onChange={e => setCosti(c => ({ ...c, costo_definitivo: +e.target.value }))}
              onBlur={() => salvaCosti(costi.costo_definitivo, costi.costo_prestito)}
            />
          </div>
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', display: 'block', marginBottom: 5 }}>TESSERAMENTO PRESTITO (€)</label>
            <input type="number" min="0" step="0.5" className="input" style={{ width: '100%' }}
              value={costi.costo_prestito}
              onChange={e => setCosti(c => ({ ...c, costo_prestito: +e.target.value }))}
              onBlur={() => salvaCosti(costi.costo_definitivo, costi.costo_prestito)}
            />
          </div>
        </div>
      </div>

      {/* Storico ricariche */}
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 12 }}>
          Storico ricariche
        </div>
        {ricariche.length === 0 ? (
          <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            Nessuna ricarica registrata. Registra la prima ricarica per attivare la stima del saldo.
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {ricariche.map((r, i) => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px', borderBottom: i < ricariche.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--white)' }}>{fmtD(r.data)}</div>
                  {r.note && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>{r.note}</div>}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900, color: 'var(--accent)' }}>
                  +{fmt(r.importo)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
