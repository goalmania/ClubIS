'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, TabBar, Toast, Drawer, Modal, StatCard } from '@/components/ui'
import { stagioneCorrente } from '@/lib/helpers'

type Stato = 'in_attesa' | 'approvata' | 'rifiutata' | 'tutte'
type Richiesta = Record<string, any>
type Modulo = Record<string, any>

const tipoLabel: Record<string, string> = {
  iscrizione: 'Iscrizione', rinnovo: 'Rinnovo',
  camp_estivo: 'Camp estivo', altro: 'Altro',
}

export default function IscrizioniPage() {
  const supabase = createClient()
  const [clubId, setClubId] = useState<string | null>(null)
  const [tab, setTab] = useState<Stato>('in_attesa')
  const [richieste, setRichieste] = useState<Richiesta[]>([])
  const [moduli, setModuli] = useState<Modulo[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  // Drawer nuovo modulo
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [savingModulo, setSavingModulo] = useState(false)
  const [mSlug, setMSlug] = useState('')
  const [mTitolo, setMTitolo] = useState('')
  const [mDesc, setMDesc] = useState('')
  const [mTipo, setMTipo] = useState('iscrizione')
  const [mStagione, setMStagione] = useState(() => stagioneCorrente())
  const [mChiusura, setMChiusura] = useState('')
  const [mMax, setMMax] = useState('')
  const [mImporto, setMImporto] = useState('')

  // Modal dettaglio / rifiuto
  const [dettaglio, setDettaglio] = useState<Richiesta | null>(null)
  const [rifiutoId, setRifiutoId] = useState<string | null>(null)
  const [noteRifiuto, setNoteRifiuto] = useState('')
  const [approving, setApproving] = useState<string | null>(null)

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: u } = await supabase.from('utenti').select('club_id').eq('id', user!.id).single()
    setClubId(u!.club_id)
    return u!.club_id as string
  }, [supabase])

  const loadData = useCallback(async (cid: string) => {
    setLoading(true)
    const [{ data: r }, { data: m }] = await Promise.all([
      supabase.from('richieste_iscrizione').select('*, moduli_iscrizione(titolo,stagione,tipo)')
        .eq('club_id', cid).order('created_at', { ascending: false }),
      supabase.from('moduli_iscrizione').select('*').eq('club_id', cid).order('created_at', { ascending: false }),
    ])
    setRichieste(r ?? [])
    setModuli(m ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    init().then(cid => loadData(cid))
  }, [init, loadData])

  const filtrate = tab === 'tutte' ? richieste : richieste.filter(r => r.stato === tab)
  const counts: Record<string, number> = {
    in_attesa: richieste.filter(r => r.stato === 'in_attesa').length,
    approvata: richieste.filter(r => r.stato === 'approvata').length,
    rifiutata: richieste.filter(r => r.stato === 'rifiutata').length,
    tutte: richieste.length,
  }

  const approva = async (r: Richiesta) => {
    if (!clubId) return
    setApproving(r.id)
    try {
      // 1. Crea giocatore
      const { data: g, error: gErr } = await supabase.from('giocatori').insert({
        club_id: clubId,
        nome: r.nome, cognome: r.cognome,
        data_nascita: r.data_nascita,
        codice_fiscale: r.codice_fiscale ?? `TEMP-${Date.now()}`,
        nazionalita_tipo: 'italiano', nazionalita_paese: 'Italia',
        piede: 'destro',
        consenso_gdpr: r.consenso_gdpr,
        consenso_data: r.consenso_data,
      }).select('id').single()
      if (gErr) throw gErr

      // 2. Crea tesseramento
      const stagione = r.moduli_iscrizione?.stagione ?? '2024-25'
      await supabase.from('tesseramenti').insert({
        giocatore_id: g!.id, club_id: clubId,
        stagione, tipo: 'definitivo',
        data_inizio: new Date().toISOString().split('T')[0],
        stato: 'attivo',
      })

      // 3. Crea famiglia
      const { data: f, error: fErr } = await supabase.from('famiglie').insert({
        giocatore_id: g!.id,
        nome: r.genitore_nome, cognome: r.genitore_cognome,
        email: r.genitore_email, telefono: r.genitore_telefono,
        relazione: r.relazione ?? 'genitore',
        consenso_dati: r.consenso_gdpr,
        consenso_immagini: r.consenso_foto,
      }).select('id').single()
      if (fErr) throw fErr

      // 4. Aggiorna richiesta
      await supabase.from('richieste_iscrizione').update({
        stato: 'approvata', giocatore_id: g!.id, famiglia_id: f!.id,
        updated_at: new Date().toISOString(),
      }).eq('id', r.id)

      setToast({ msg: `${r.nome} ${r.cognome} approvato/a — giocatore creato`, tipo: 'success' })
      if (clubId) loadData(clubId)
    } catch (e: any) {
      setToast({ msg: `Errore: ${e.message ?? 'sconosciuto'}`, tipo: 'error' })
    } finally {
      setApproving(null)
    }
  }

  const rifiuta = async () => {
    if (!rifiutoId || !clubId) return
    await supabase.from('richieste_iscrizione').update({
      stato: 'rifiutata', note_segreteria: noteRifiuto,
      updated_at: new Date().toISOString(),
    }).eq('id', rifiutoId)
    setRifiutoId(null); setNoteRifiuto('')
    setToast({ msg: 'Richiesta rifiutata', tipo: 'success' })
    loadData(clubId)
  }

  const creaNuovoModulo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mSlug.trim() || !mTitolo.trim() || !clubId) return
    setSavingModulo(true)
    const baseUrl = window.location.origin
    const { error } = await supabase.from('moduli_iscrizione').insert({
      club_id: clubId, slug: mSlug.trim().toLowerCase().replace(/\s+/g, '-'),
      titolo: mTitolo.trim(), descrizione: mDesc.trim() || null,
      tipo: mTipo, stagione: mStagione,
      attivo: true,
      data_chiusura: mChiusura || null,
      max_iscrizioni: mMax ? parseInt(mMax) : null,
      importo_iscrizione: mImporto ? parseFloat(mImporto) : null,
      qr_code_url: `${baseUrl}/api/moduli/qr/${mSlug.trim().toLowerCase().replace(/\s+/g, '-')}`,
    })
    setSavingModulo(false)
    if (error) { setToast({ msg: `Errore: ${error.message}`, tipo: 'error' }); return }
    setToast({ msg: 'Modulo creato!', tipo: 'success' })
    setDrawerOpen(false)
    setMSlug(''); setMTitolo(''); setMDesc(''); setMImporto(''); setMMax(''); setMChiusura('')
    loadData(clubId)
  }

  const toggleModulo = async (id: string, attivo: boolean) => {
    if (!clubId) return
    await supabase.from('moduli_iscrizione').update({ attivo: !attivo }).eq('id', id)
    loadData(clubId)
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div>
      <PageHeader
        title="Iscrizioni online"
        subtitle="Gestione moduli e richieste di iscrizione"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setDrawerOpen(true)}>
            + Nuovo modulo
          </button>
        }
      />

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="In attesa" value={counts.in_attesa} color="var(--accent-orange)" />
        <StatCard label="Approvate" value={counts.approvata} color="var(--verde)" />
        <StatCard label="Rifiutate" value={counts.rifiutata} color="var(--rosso)" />
        <StatCard label="Moduli attivi" value={moduli.filter(m => m.attivo).length} />
      </div>

      {/* Lista moduli */}
      {moduli.length > 0 && (
        <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-solid)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Moduli iscrizione
            </span>
          </div>
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Titolo', 'Tipo', 'Stagione', 'Scadenza', 'Iscritti', 'Link pubblico', 'Stato', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grigio-3)', borderBottom: '1px solid var(--border-solid)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {moduli.map(m => {
                  const cnt = richieste.filter(r => r.modulo_id === m.id).length
                  const link = `${baseUrl}/iscriviti/${m.slug}`
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600 }}>{m.titolo}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grigio-3)' }}>{tipoLabel[m.tipo] ?? m.tipo}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{m.stagione}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grigio-3)' }}>{m.data_chiusura ? new Date(m.data_chiusura).toLocaleDateString('it-IT') : '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{cnt}{m.max_iscrizioni ? `/${m.max_iscrizioni}` : ''}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                            /iscriviti/{m.slug}
                          </a>
                          <button onClick={() => navigator.clipboard.writeText(link)} style={iconBtn} title="Copia link">📋</button>
                          <a href={`/api/moduli/qr/${m.slug}`} target="_blank" rel="noreferrer" style={iconBtn} title="QR Code">◻</a>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className={`badge ${m.attivo ? 'badge-verde' : 'badge-grigio'}`}>{m.attivo ? 'Attivo' : 'Chiuso'}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => toggleModulo(m.id, m.attivo)} style={{ fontSize: 11, padding: '3px 8px', background: 'var(--grigio-mid)', border: '1px solid var(--border-solid)', borderRadius: 2, cursor: 'pointer', color: 'var(--grigio-3)' }}>
                          {m.attivo ? 'Disattiva' : 'Attiva'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Richieste */}
      <TabBar
        tabs={[
          { key: 'in_attesa', label: 'In attesa', count: counts.in_attesa },
          { key: 'approvata', label: 'Approvate', count: counts.approvata },
          { key: 'rifiutata', label: 'Rifiutate', count: counts.rifiutata },
          { key: 'tutte', label: 'Tutte', count: counts.tutte },
        ]}
        active={tab}
        onChange={v => setTab(v as Stato)}
      />

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {['Atleta', 'Genitore / Email', 'Modulo', 'Data richiesta', 'Stato', 'Azioni'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--grigio-4)' }}>Caricamento...</td></tr>
              ) : filtrate.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--grigio-4)' }}>Nessuna richiesta</td></tr>
              ) : filtrate.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.cognome} {r.nome}
                    {r.data_nascita && <div style={{ fontSize: 11, color: 'var(--grigio-3)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(r.data_nascita).toLocaleDateString('it-IT')}
                    </div>}
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>{r.genitore_nome} {r.genitore_cognome}</div>
                    <div style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{r.genitore_email}</div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>
                    {r.moduli_iscrizione?.titolo ?? '—'}
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>{r.moduli_iscrizione?.stagione}</div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {new Date(r.created_at).toLocaleDateString('it-IT')}
                  </td>
                  <td>
                    <span className={`badge ${r.stato === 'approvata' ? 'badge-verde' : r.stato === 'rifiutata' ? 'badge-rosso' : 'badge-grigio'}`}>
                      {r.stato.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => setDettaglio(r)}>
                        Dettaglio
                      </button>
                      {r.stato === 'in_attesa' && (
                        <>
                          <button
                            className="btn btn-sm"
                            style={{ fontSize: 11, background: 'var(--verde-lt)', color: 'var(--verde)', border: '1px solid var(--verde)' }}
                            onClick={() => approva(r)}
                            disabled={approving === r.id}
                          >
                            {approving === r.id ? '...' : 'Approva'}
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ fontSize: 11, background: 'var(--rosso-lt)', color: 'var(--rosso)', border: '1px solid var(--rosso)' }}
                            onClick={() => setRifiutoId(r.id)}
                          >
                            Rifiuta
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer — nuovo modulo */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nuovo modulo iscrizione" width={600}>
        <form onSubmit={creaNuovoModulo}>
          <Section title="Informazioni modulo">
            <div style={grid2}>
              <Field label="Titolo *">
                <input className="input" value={mTitolo} onChange={e => setMTitolo(e.target.value)} placeholder="Iscrizioni 2024-25" required />
              </Field>
              <Field label="Tipo">
                <select className="input" value={mTipo} onChange={e => setMTipo(e.target.value)}>
                  <option value="iscrizione">Iscrizione</option>
                  <option value="rinnovo">Rinnovo</option>
                  <option value="camp_estivo">Camp estivo</option>
                  <option value="altro">Altro</option>
                </select>
              </Field>
            </div>
            <Field label="Slug URL (identificatore univoco) *"
              hint={`Il link sarà: ${baseUrl}/iscriviti/${mSlug || '[slug]'}`}>
              <input className="input" value={mSlug}
                onChange={e => setMSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="asd-calcio-bari-2024" required />
            </Field>
            <Field label="Descrizione">
              <textarea className="input" rows={2} value={mDesc} onChange={e => setMDesc(e.target.value)}
                placeholder="Modulo iscrizione per la stagione sportiva 2024-25..." />
            </Field>
          </Section>

          <Section title="Impostazioni">
            <div style={grid2}>
              <Field label="Stagione">
                <input className="input" value={mStagione} onChange={e => setMStagione(e.target.value)} placeholder="2024-25" />
              </Field>
              <Field label="Data chiusura">
                <input className="input" type="date" value={mChiusura} onChange={e => setMChiusura(e.target.value)} />
              </Field>
              <Field label="Max iscrizioni">
                <input className="input" type="number" min={1} value={mMax} onChange={e => setMMax(e.target.value)} placeholder="illimitato" />
              </Field>
              <Field label="Quota iscrizione (€)">
                <input className="input" type="number" min={0} step="0.01" value={mImporto} onChange={e => setMImporto(e.target.value)} placeholder="0,00" />
              </Field>
            </div>
          </Section>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8 }}>
            <button type="button" className="btn btn-sm" onClick={() => setDrawerOpen(false)}>Annulla</button>
            <button type="submit" className="btn btn-primary" disabled={savingModulo}>
              {savingModulo ? '...' : 'Crea modulo'}
            </button>
          </div>
        </form>
      </Drawer>

      {/* Modal dettaglio richiesta */}
      <Modal open={!!dettaglio} onClose={() => setDettaglio(null)} title="Dettaglio richiesta" width={560}>
        {dettaglio && (
          <div style={{ fontSize: 13, lineHeight: 2 }}>
            <SectionLabel>Atleta</SectionLabel>
            <DetailRow label="Nome" value={`${dettaglio.nome} ${dettaglio.cognome}`} />
            {dettaglio.data_nascita && <DetailRow label="Data nascita" value={new Date(dettaglio.data_nascita).toLocaleDateString('it-IT')} />}
            {dettaglio.codice_fiscale && <DetailRow label="Codice fiscale" value={dettaglio.codice_fiscale} />}
            {dettaglio.indirizzo && <DetailRow label="Indirizzo" value={dettaglio.indirizzo} />}
            {dettaglio.comune && <DetailRow label="Comune" value={dettaglio.comune} />}
            <SectionLabel style={{ marginTop: 14 }}>Genitore / Responsabile</SectionLabel>
            <DetailRow label="Nome" value={`${dettaglio.genitore_nome ?? ''} ${dettaglio.genitore_cognome ?? ''}`.trim() || '—'} />
            <DetailRow label="Email" value={dettaglio.genitore_email} />
            {dettaglio.genitore_telefono && <DetailRow label="Telefono" value={dettaglio.genitore_telefono} />}
            <DetailRow label="Relazione" value={dettaglio.relazione ?? 'genitore'} />
            <SectionLabel style={{ marginTop: 14 }}>Consensi</SectionLabel>
            <DetailRow label="GDPR" value={dettaglio.consenso_gdpr ? '✓ Accordato' : '✗ Non accordato'} />
            <DetailRow label="Foto" value={dettaglio.consenso_foto ? '✓ Accordato' : '✗ Non accordato'} />
            {dettaglio.consenso_data && <DetailRow label="Data consenso" value={new Date(dettaglio.consenso_data).toLocaleString('it-IT')} />}
            {dettaglio.note_segreteria && (
              <>
                <SectionLabel style={{ marginTop: 14 }}>Note segreteria</SectionLabel>
                <p style={{ color: 'var(--rosso)', marginTop: 4 }}>{dettaglio.note_segreteria}</p>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Modal rifiuto */}
      <Modal open={!!rifiutoId} onClose={() => setRifiutoId(null)} title="Rifiuta richiesta" width={420}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--grigio-3)', marginBottom: 14 }}>
            Inserisci il motivo del rifiuto (opzionale). Il genitore verrà informato.
          </p>
          <label className="label">Note</label>
          <textarea className="input" rows={3} value={noteRifiuto}
            onChange={e => setNoteRifiuto(e.target.value)}
            placeholder="Es: posto esaurito per questa categoria d'età..." />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button className="btn btn-sm" onClick={() => setRifiutoId(null)}>Annulla</button>
            <button className="btn btn-sm" style={{ background: 'var(--rosso)', color: 'white', border: 'none' }} onClick={rifiuta}>
              Conferma rifiuto
            </button>
          </div>
        </div>
      </Modal>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--accent)', paddingBottom: 8, borderBottom: '1px solid var(--border-solid)', marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="label">{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--grigio-3)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--accent)', ...style }}>
      {children}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ color: 'var(--grigio-3)', minWidth: 130 }}>{label}:</span>
      <span style={{ color: 'var(--white)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }
const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 4px', textDecoration: 'none' }
