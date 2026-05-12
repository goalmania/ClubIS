'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { PageHeader, Toast } from '@/components/ui'
import { generaSollecito } from '@/lib/solleciti'
import { inserisciRegistroIva, stagioneDaData } from '@/lib/registro-iva'

interface Rata {
  id: string
  numero_rata: number
  importo: number
  scadenza: string
  stato: string
  data_pagamento: string | null
  metodo_pagamento: string | null
  ricevuta_numero: string | null
  ultimo_sollecito_at: string | null
  note: string | null
}

interface Piano {
  id: string
  descrizione: string
  importo_totale: number
  note: string | null
  created_at: string
  rate: Rata[]
}

interface FamigliaInfo {
  id: string
  nome: string
  cognome: string
  email: string
  telefono: string | null
}

interface GiocatoreInfo {
  id: string
  nome: string
  cognome: string
  codice_fiscale: string
}

interface ClubInfo {
  nome: string
  iban: string | null
}

function statoEffettivo(stato: string, scadenza: string) {
  if (stato === 'in_attesa' && new Date(scadenza) < new Date()) return 'in_ritardo'
  return stato
}

const fmt = (n: number) =>
  Number(n).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })

export default function FamigliaDettaglio() {
  const supabase = createClient()
  const params = useParams()
  const famigliaId = params.famiglia_id as string

  const [famiglia, setFamiglia] = useState<FamigliaInfo | null>(null)
  const [giocatore, setGiocatore] = useState<GiocatoreInfo | null>(null)
  const [club, setClub] = useState<ClubInfo | null>(null)
  const [piani, setPiani] = useState<Piano[]>([])
  const [clubId, setClubId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  // Modal "Segna come pagato"
  const [modalRata, setModalRata] = useState<Rata | null>(null)
  const [modalPianoId, setModalPianoId] = useState<string | null>(null)
  const [formPagamento, setFormPagamento] = useState({
    data_pagamento: new Date().toISOString().split('T')[0],
    metodo: 'contanti',
    note: '',
  })
  const [savingPagamento, setSavingPagamento] = useState(false)

  // Modal "Aggiungi rata"
  const [modalAddRata, setModalAddRata] = useState<string | null>(null) // piano_id
  const [formNuovaRata, setFormNuovaRata] = useState({
    numero_rata: 1,
    importo: '',
    scadenza: '',
    note: '',
  })
  const [savingRata, setSavingRata] = useState(false)

  useEffect(() => { load() }, [famigliaId])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user!.id).single()
    const cid = utente!.club_id
    setClubId(cid)

    const [{ data: fam }, { data: cl }, { data: pianiData }] = await Promise.all([
      supabase.from('famiglie').select('id, nome, cognome, email, telefono').eq('id', famigliaId).single(),
      supabase.from('clubs').select('nome, iban').eq('id', cid).single(),
      supabase.from('piani_pagamento')
        .select(`
          id, descrizione, importo_totale, note, created_at,
          giocatori(id, nome, cognome, codice_fiscale),
          rate_pagamento(id, numero_rata, importo, scadenza, stato, data_pagamento, metodo_pagamento, ricevuta_numero, ultimo_sollecito_at, note)
        `)
        .eq('club_id', cid)
        .eq('famiglia_id', famigliaId)
        .order('created_at'),
    ])

    setFamiglia(fam ?? null)
    setClub(cl ?? null)

    if (pianiData && pianiData.length > 0) {
      const gioc = (pianiData[0] as any).giocatori
      setGiocatore(gioc ?? null)
    }

    setPiani(
      (pianiData ?? []).map((p: any) => ({
        ...p,
        rate: (p.rate_pagamento ?? []).sort((a: Rata, b: Rata) => a.numero_rata - b.numero_rata),
      }))
    )

    setLoading(false)
  }

  const apriModalPagamento = (rata: Rata, pianoId: string) => {
    setModalRata(rata)
    setModalPianoId(pianoId)
    setFormPagamento({ data_pagamento: new Date().toISOString().split('T')[0], metodo: 'contanti', note: '' })
  }

  const segnaPagato = async () => {
    if (!modalRata || !clubId) return
    setSavingPagamento(true)

    // Genera numero ricevuta progressivo
    const anno = new Date().getFullYear()
    const { count } = await supabase.from('rate_pagamento')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .not('ricevuta_numero', 'is', null)
      .gte('data_pagamento', `${anno}-01-01`)

    const ricevutaNumero = `${anno}/${String((count ?? 0) + 1).padStart(3, '0')}`

    const { error } = await supabase.from('rate_pagamento').update({
      stato: 'pagata',
      data_pagamento: formPagamento.data_pagamento,
      metodo_pagamento: formPagamento.metodo,
      ricevuta_numero: ricevutaNumero,
      note: formPagamento.note || null,
    }).eq('id', modalRata.id)

    setSavingPagamento(false)
    if (error) { setToast({ msg: 'Errore nel salvataggio', tipo: 'error' }); return }

    // Registro IVA automatico
    await inserisciRegistroIva(supabase as any, {
      club_id: clubId,
      data_operazione: formPagamento.data_pagamento,
      tipo: 'entrata',
      natura: `Quota tesseramento sportivo ${stagioneDaData(formPagamento.data_pagamento)}`,
      controparte: giocatore ? `${giocatore.cognome} ${giocatore.nome}` : undefined,
      importo: Number(modalRata.importo),
      riferimento_pagamento_id: modalRata.id,
      note: formPagamento.note || undefined,
    })

    setToast({ msg: `Rata segnata come pagata — Ricevuta ${ricevutaNumero}`, tipo: 'success' })
    setModalRata(null)
    load()
  }

  const aggiungiRata = async () => {
    if (!modalAddRata || !clubId || !formNuovaRata.importo || !formNuovaRata.scadenza) {
      setToast({ msg: 'Importo e scadenza obbligatori', tipo: 'error' }); return
    }
    setSavingRata(true)
    const { error } = await supabase.from('rate_pagamento').insert({
      piano_id: modalAddRata,
      club_id: clubId,
      numero_rata: formNuovaRata.numero_rata,
      importo: parseFloat(formNuovaRata.importo),
      scadenza: formNuovaRata.scadenza,
      stato: 'in_attesa',
      note: formNuovaRata.note || null,
    })
    setSavingRata(false)
    if (error) { setToast({ msg: 'Errore', tipo: 'error' }); return }
    setToast({ msg: 'Rata aggiunta', tipo: 'success' })
    setModalAddRata(null)
    setFormNuovaRata({ numero_rata: 1, importo: '', scadenza: '', note: '' })
    load()
  }

  const inviaSollecito = async (rata: Rata, piano: Piano) => {
    if (!famiglia || !giocatore || !club) return

    // Aggiorna ultimo_sollecito_at
    await supabase.from('rate_pagamento').update({ ultimo_sollecito_at: new Date().toISOString() }).eq('id', rata.id)

    const mailto = generaSollecito({
      rata: { id: rata.id, numero_rata: rata.numero_rata, importo: Number(rata.importo), scadenza: rata.scadenza },
      piano: { descrizione: piano.descrizione },
      famiglia: { nome: famiglia.nome, cognome: famiglia.cognome, email: famiglia.email },
      giocatore: { nome: giocatore.nome, cognome: giocatore.cognome },
      club: { nome: club.nome, iban: club.iban },
    })

    window.location.href = mailto
    load()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--grigio-4)' }}>Caricamento...</div>
  if (!famiglia) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--rosso)' }}>Famiglia non trovata</div>

  const totPagato = piani.flatMap(p => p.rate).filter(r => r.stato === 'pagata').reduce((s, r) => s + Number(r.importo), 0)
  const totAtteso = piani.flatMap(p => p.rate).reduce((s, r) => s + Number(r.importo), 0)

  return (
    <div>
      <PageHeader
        title={`${famiglia.cognome} ${famiglia.nome}`}
        subtitle={giocatore ? `Giocatore: ${giocatore.cognome} ${giocatore.nome}` : 'Piano pagamenti'}
        actions={
          <a href={`/dashboard/segretario/pagamenti`} className="btn btn-secondary btn-sm">
            ← Tutti i pagamenti
          </a>
        }
      />

      {/* Info famiglia */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Totale da pagare</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{fmt(totAtteso)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pagato</div>
          <div className="stat-value" style={{ fontSize: 22, color: 'var(--verde)' }}>{fmt(totPagato)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Residuo</div>
          <div className="stat-value" style={{ fontSize: 22, color: totAtteso - totPagato > 0 ? 'var(--rosso)' : 'var(--verde)' }}>
            {fmt(totAtteso - totPagato)}
          </div>
        </div>
      </div>

      {/* Contatti */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 24, display: 'flex', gap: 32 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--grigio-4)' }}>Email</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{famiglia.email || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--grigio-4)' }}>Telefono</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{famiglia.telefono || '—'}</div>
        </div>
        {giocatore?.codice_fiscale && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--grigio-4)' }}>CF Giocatore</div>
            <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>{giocatore.codice_fiscale}</div>
          </div>
        )}
      </div>

      {/* Piani */}
      {piani.length === 0 ? (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--grigio-4)' }}>
          Nessun piano di pagamento per questa famiglia.
        </div>
      ) : piani.map(piano => (
        <div key={piano.id} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          {/* Header piano */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderBottom: '1px solid var(--grigio-5)',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{piano.descrizione}</div>
              <div style={{ fontSize: 12, color: 'var(--grigio-4)', marginTop: 2 }}>
                Totale piano: {fmt(piano.importo_totale)}
                {piano.note && ` — ${piano.note}`}
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const nextN = (piano.rate.length > 0 ? Math.max(...piano.rate.map(r => r.numero_rata)) : 0) + 1
                setFormNuovaRata(p => ({ ...p, numero_rata: nextN }))
                setModalAddRata(piano.id)
              }}
            >
              + Aggiungi rata
            </button>
          </div>

          {/* Rate */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Importo</th>
                  <th>Scadenza</th>
                  <th>Stato</th>
                  <th>Pagato il</th>
                  <th>Metodo</th>
                  <th>Ricevuta</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {piano.rate.map(rata => {
                  const sEff = statoEffettivo(rata.stato, rata.scadenza)
                  return (
                    <tr key={rata.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{rata.numero_rata}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(Number(rata.importo))}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {new Date(rata.scadenza).toLocaleDateString('it-IT')}
                      </td>
                      <td>
                        <span className={`badge ${
                          sEff === 'pagata' ? 'badge-verde' :
                          sEff === 'in_ritardo' ? 'badge-rosso' : 'badge-grigio'
                        }`}>
                          {sEff === 'in_attesa' ? 'In attesa' : sEff === 'pagata' ? 'Pagata' : sEff === 'in_ritardo' ? 'In ritardo' : sEff}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {rata.data_pagamento ? new Date(rata.data_pagamento).toLocaleDateString('it-IT') : '—'}
                      </td>
                      <td style={{ fontSize: 12, textTransform: 'capitalize' }}>
                        {rata.metodo_pagamento?.replace(/_/g, ' ') ?? '—'}
                      </td>
                      <td>
                        {rata.ricevuta_numero ? (
                          <a
                            href={`/api/pagamenti/ricevuta/${rata.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 12, color: 'var(--verde)', fontFamily: 'var(--font-mono)' }}
                          >
                            {rata.ricevuta_numero}
                          </a>
                        ) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {rata.stato !== 'pagata' && (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => apriModalPagamento(rata, piano.id)}
                              >
                                Segna pagato
                              </button>
                              {famiglia.email && (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => inviaSollecito(rata, piano)}
                                  title={rata.ultimo_sollecito_at ? `Ultimo sollecito: ${new Date(rata.ultimo_sollecito_at).toLocaleDateString('it-IT')}` : 'Invia sollecito via email'}
                                >
                                  Sollecito
                                </button>
                              )}
                            </>
                          )}
                          {rata.ricevuta_numero && (
                            <a
                              href={`/api/pagamenti/ricevuta/${rata.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-sm"
                            >
                              Ricevuta
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Modal: Segna come pagato */}
      {modalRata && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setModalRata(null)}>
          <div style={{ background: 'white', borderRadius: 12, padding: '28px 32px', width: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>
              Segna come pagata — Rata {modalRata.numero_rata}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--verde)', marginBottom: 20 }}>
              {fmt(Number(modalRata.importo))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="label">Data pagamento</label>
                <input className="input" type="date" value={formPagamento.data_pagamento}
                  onChange={e => setFormPagamento(p => ({ ...p, data_pagamento: e.target.value }))} />
              </div>
              <div>
                <label className="label">Metodo</label>
                <select className="input" value={formPagamento.metodo}
                  onChange={e => setFormPagamento(p => ({ ...p, metodo: e.target.value }))}>
                  <option value="contanti">Contanti</option>
                  <option value="bonifico">Bonifico bancario</option>
                  <option value="stripe">Stripe / Online</option>
                  <option value="altro">Altro</option>
                </select>
              </div>
              <div>
                <label className="label">Note (opzionale)</label>
                <input className="input" value={formPagamento.note}
                  onChange={e => setFormPagamento(p => ({ ...p, note: e.target.value }))}
                  placeholder="Eventuale riferimento..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setModalRata(null)}>Annulla</button>
              <button className="btn btn-primary btn-sm" onClick={segnaPagato} disabled={savingPagamento}>
                {savingPagamento ? 'Salvataggio...' : 'Conferma pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Aggiungi rata */}
      {modalAddRata && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setModalAddRata(null)}>
          <div style={{ background: 'white', borderRadius: 12, padding: '28px 32px', width: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Aggiungi rata</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="label">Numero rata</label>
                <input className="input" type="number" min={1} value={formNuovaRata.numero_rata}
                  onChange={e => setFormNuovaRata(p => ({ ...p, numero_rata: parseInt(e.target.value) }))} />
              </div>
              <div>
                <label className="label">Importo (€) *</label>
                <input className="input" type="number" step="0.01" min={0} value={formNuovaRata.importo}
                  onChange={e => setFormNuovaRata(p => ({ ...p, importo: e.target.value }))} placeholder="0,00" />
              </div>
              <div>
                <label className="label">Scadenza *</label>
                <input className="input" type="date" value={formNuovaRata.scadenza}
                  onChange={e => setFormNuovaRata(p => ({ ...p, scadenza: e.target.value }))} />
              </div>
              <div>
                <label className="label">Note</label>
                <input className="input" value={formNuovaRata.note}
                  onChange={e => setFormNuovaRata(p => ({ ...p, note: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setModalAddRata(null)}>Annulla</button>
              <button className="btn btn-primary btn-sm" onClick={aggiungiRata} disabled={savingRata}>
                {savingRata ? '...' : 'Aggiungi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
