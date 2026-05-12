'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { TabBar, Toast, Modal } from '@/components/ui'
import { formatData, calcolaEta, ruoloLabel, ruoloShort } from '@/lib/helpers'

type Tab = 'sportivi' | 'visita' | 'sanitario' | 'attestati' | 'indirizzo' | 'genitori' | 'documento' | 'altri' | 'materiale' | 'presenze' | 'pagamenti'

const TABS: { key: Tab; label: string }[] = [
  { key: 'sportivi',   label: 'Dati sportivi' },
  { key: 'visita',     label: 'Visita medica' },
  { key: 'sanitario',  label: 'Profilo sanitario' },
  { key: 'attestati',  label: 'Attestati' },
  { key: 'indirizzo',  label: 'Indirizzo' },
  { key: 'genitori',   label: 'Genitori / Resp.' },
  { key: 'documento',  label: 'Documento id.' },
  { key: 'altri',      label: 'Altri dati' },
  { key: 'materiale',  label: 'Materiale' },
  { key: 'presenze',   label: 'Presenze' },
  { key: 'pagamenti',  label: 'Pagamenti' },
]

export default function GiocatoreDetailPage() {
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [g, setG]             = useState<any>(null)
  const [clubId, setClubId]   = useState<string | null>(null)
  const [clubNome, setClubNome] = useState('')
  const [tesseramento, setTesseramento] = useState<any>(null)
  const [certificati, setCertificati]   = useState<any[]>([])
  const [famiglia, setFamiglia]         = useState<any[]>([])
  const [presenze, setPresenze]         = useState<any[]>([])
  const [quote, setQuote]               = useState<any[]>([])
  const [pagamenti, setPagamenti]       = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [tab, setTab]                   = useState<Tab>('sportivi')
  const [editMode, setEditMode]         = useState(false)
  const [draft, setDraft]               = useState<any>({})
  const [saving, setSaving]             = useState(false)
  const [toast, setToast]               = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [invioEmail, setInvioEmail]      = useState<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({})
  const [modalPag, setModalPag]         = useState(false)
  const [nuovoPagImporto, setNuovoPagImporto] = useState('')
  const [nuovoPagData, setNuovoPagData] = useState(new Date().toISOString().split('T')[0])
  const [nuovoPagMetodo, setNuovoPagMetodo]   = useState('contanti')
  const [nuovoPagQuota, setNuovoPagQuota]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: u } = await supabase.from('utenti').select('club_id').eq('id', user!.id).single()
    const { data: club } = await supabase.from('clubs').select('nome').eq('id', u!.club_id).single()
    setClubId(u!.club_id)
    setClubNome(club?.nome ?? '')

    const [
      { data: gData },
      { data: tess },
      { data: certs },
      { data: fam },
      { data: pres },
      { data: q },
    ] = await Promise.all([
      supabase.from('giocatori').select('*').eq('id', id).single(),
      supabase.from('tesseramenti').select('*, squadre(nome)').eq('giocatore_id', id).eq('club_id', u!.club_id).eq('stato', 'attivo').maybeSingle(),
      supabase.from('certificati_medici').select('*').eq('giocatore_id', id).order('data_scadenza', { ascending: false }),
      supabase.from('famiglie').select('*').eq('giocatore_id', id),
      supabase.from('presenze').select('*, sessioni_allenamento(data, tipo)').eq('giocatore_id', id).order('created_at', { ascending: false }).limit(60),
      supabase.from('quote_iscrizione').select('*, pagamenti(*)').eq('giocatore_id', id).eq('club_id', u!.club_id),
    ])
    setG(gData)
    setDraft(gData ?? {})
    setTesseramento(tess)
    setCertificati(certs ?? [])
    setFamiglia(fam ?? [])
    setPresenze(pres ?? [])
    setQuote(q ?? [])
    const pags: any[] = []
    q?.forEach((qu: any) => { if (qu.pagamenti) pags.push(...(Array.isArray(qu.pagamenti) ? qu.pagamenti : [qu.pagamenti])) })
    setPagamenti(pags)
    setLoading(false)
  }, [id, supabase])

  useEffect(() => { load() }, [load])

  const salva = async () => {
    setSaving(true)
    const payload = { ...draft }
    delete payload.id; delete payload.created_at; delete payload.club_id
    const { error } = await supabase.from('giocatori').update(payload).eq('id', id)
    setSaving(false)
    if (error) { setToast({ msg: `Errore: ${error.message}`, tipo: 'error' }); return }
    setToast({ msg: 'Modifiche salvate', tipo: 'success' })
    setEditMode(false)
    load()
  }

  const inviaReminderVisita = (gi: any) => {
    const f = famiglia[0]
    if (!f?.email) { setToast({ msg: 'Nessuna email famiglia trovata', tipo: 'error' }); return }
    const subject = `Rinnovo visita medica — ${gi.cognome} ${gi.nome}`
    const body = `Gentile ${f.cognome} ${f.nome},\n\nLa visita medica di ${gi.nome} è scaduta il ${formatData(gi.certificato_scadenza)}.\nSi prega di rinnovarla al più presto per poter continuare l'attività sportiva.\n\nPer informazioni contattare la segreteria.\n\nCordiali saluti,\n${clubNome}`
    window.open(`mailto:${f.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
  }

  const registraPagamento = async () => {
    if (!nuovoPagImporto || !nuovoPagQuota) return
    const { error } = await supabase.from('pagamenti').insert({
      quota_id: nuovoPagQuota,
      importo: parseFloat(nuovoPagImporto),
      metodo: nuovoPagMetodo,
      data_pagamento: nuovoPagData,
    })
    if (error) { setToast({ msg: 'Errore pagamento', tipo: 'error' }); return }
    setModalPag(false)
    setNuovoPagImporto(''); setNuovoPagQuota('')
    setToast({ msg: 'Pagamento registrato', tipo: 'success' })
    load()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--grigio-4)' }}>Caricamento...</div>
  if (!g) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--rosso)' }}>Giocatore non trovato</div>

  const eta      = calcolaEta(g.data_nascita)
  const oggi     = new Date()
  const certAttivo  = certificati.find(c => new Date(c.data_scadenza) >= oggi)
  const certScaduto = !certAttivo && certificati.length > 0
  const presenzeTot = presenze.length
  const presentiN   = presenze.filter(p => p.presente).length
  const percPres    = presenzeTot > 0 ? Math.round((presentiN / presenzeTot) * 100) : null
  const matComodato: any[] = g.materiale_comodato ?? []

  const upd = (key: string, val: any) => setDraft((prev: any) => ({ ...prev, [key]: val }))

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 13, color: 'var(--grigio-4)' }}>
        <Link href="/dashboard/segretario/giocatori" style={{ color: 'var(--grigio-4)', textDecoration: 'none' }}>Giocatori</Link>
        <span>/</span>
        <span style={{ color: 'var(--grigio)' }}>{g.cognome} {g.nome}</span>
      </div>

      {/* Header */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
          {g.foto_url ? (
            <img src={g.foto_url} alt="" style={{ width: 68, height: 68, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 68, height: 68, borderRadius: 10, background: 'var(--verde-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'var(--verde)', flexShrink: 0 }}>
              {g.nome?.[0]}{g.cognome?.[0]}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)', margin: 0 }}>
                {g.cognome} {g.nome}
              </h1>
              {tesseramento?.numero_maglia && <span style={{ fontSize: 13, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>#{tesseramento.numero_maglia}</span>}
              {certScaduto && <span className="badge badge-rosso">Cert. scaduto</span>}
              {certAttivo && (() => { const gg = Math.ceil((new Date(certAttivo.data_scadenza).getTime() - oggi.getTime()) / 86400000); return gg <= 30 ? <span className="badge badge-ambra">Cert. {gg}gg</span> : null })()}
              {g.condizione && g.condizione !== 'disponibile' && <span className="badge badge-rosso">{g.condizione}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {g.ruolo_principale && <span className="badge badge-grigio">{ruoloLabel[g.ruolo_principale] ?? g.ruolo_principale}</span>}
              {g.ruolo_secondario && <span className="badge badge-grigio" style={{ opacity: 0.7 }}>{ruoloShort[g.ruolo_secondario]}</span>}
              <span className={`badge ${g.nazionalita_tipo === 'italiano' ? 'badge-verde' : g.nazionalita_tipo === 'ue' ? 'badge-blu' : 'badge-ambra'}`}>{g.nazionalita_tipo}</span>
              <span className="badge badge-grigio">{eta} anni</span>
              {percPres !== null && <span className="badge badge-grigio">{percPres}% pres.</span>}
            </div>
          </div>
        </div>
      </div>

      {/* TabBar */}
      <TabBar tabs={TABS} active={tab} onChange={v => { setTab(v as Tab); setEditMode(false); setDraft(g) }} />

      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Tab header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid var(--border-solid)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--white)' }}>
            {TABS.find(t => t.key === tab)?.label}
          </span>
          {tab !== 'presenze' && tab !== 'pagamenti' && (
            editMode
              ? <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm" onClick={() => { setEditMode(false); setDraft(g) }}>Annulla</button>
                  <button className="btn btn-primary btn-sm" onClick={salva} disabled={saving}>{saving ? '...' : 'Salva'}</button>
                </div>
              : <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(true)}>Modifica</button>
          )}
          {tab === 'pagamenti' && (
            <button className="btn btn-primary btn-sm" onClick={() => setModalPag(true)}>+ Pagamento</button>
          )}
        </div>

        {/* Corpo tab */}
        <div style={{ padding: 0 }}>

          {/* ─── DATI SPORTIVI ─── */}
          {tab === 'sportivi' && (
            editMode ? (
              <div style={{ padding: 20 }}>
                <G2>
                  <F label="Piede preferito"><select className="input" value={draft.piede_preferito ?? ''} onChange={e => upd('piede_preferito', e.target.value)}><option value="">—</option><option value="destro">Destro</option><option value="sinistro">Sinistro</option><option value="ambidestro">Ambidestro</option></select></F>
                  <F label="Ruolo preferito"><input className="input" value={draft.ruolo_preferito ?? ''} onChange={e => upd('ruolo_preferito', e.target.value)} placeholder="Attaccante" /></F>
                  <F label="Condizione"><select className="input" value={draft.condizione ?? 'disponibile'} onChange={e => upd('condizione', e.target.value)}><option value="disponibile">Disponibile</option><option value="infortunato">Infortunato</option><option value="squalificato">Squalificato</option><option value="assente">Assente</option></select></F>
                  <F label="Codice identificativo"><input className="input" value={draft.codice_identificativo ?? ''} onChange={e => upd('codice_identificativo', e.target.value)} /></F>
                  <F label="Nome maglia"><input className="input" value={draft.nome_maglia ?? ''} onChange={e => upd('nome_maglia', e.target.value)} /></F>
                  <F label="Altezza (cm)"><input className="input" type="number" value={draft.altezza_cm ?? ''} onChange={e => upd('altezza_cm', e.target.value ? parseInt(e.target.value) : null)} /></F>
                  <F label="Peso (kg)"><input className="input" type="number" value={draft.peso_kg ?? ''} onChange={e => upd('peso_kg', e.target.value ? parseFloat(e.target.value) : null)} /></F>
                  <F label="N. scarpa"><input className="input" type="number" value={draft.numero_scarpa ?? ''} onChange={e => upd('numero_scarpa', e.target.value ? parseInt(e.target.value) : null)} /></F>
                  <F label="Taglia maglia"><input className="input" value={draft.taglia_maglia ?? ''} onChange={e => upd('taglia_maglia', e.target.value)} placeholder="M / L / XL" /></F>
                  <F label="Taglia pantaloni"><input className="input" value={draft.taglia_pantaloni ?? ''} onChange={e => upd('taglia_pantaloni', e.target.value)} placeholder="M" /></F>
                  <F label="Modalità rateizzazione"><input className="input" value={draft.modalita_rateizzazione ?? ''} onChange={e => upd('modalita_rateizzazione', e.target.value)} /></F>
                  <F label="Data decorrenza"><input className="input" type="date" value={draft.data_decorrenza ?? ''} onChange={e => upd('data_decorrenza', e.target.value || null)} /></F>
                </G2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
                  <Chk label="Agonista" checked={!!draft.agonista} onChange={v => upd('agonista', v)} />
                  <Chk label="Necessita kit" checked={!!draft.necessita_kit} onChange={v => upd('necessita_kit', v)} />
                  <Chk label="Ha procuratore" checked={!!draft.ha_procuratore} onChange={v => upd('ha_procuratore', v)} />
                </div>
                {draft.ha_procuratore && (
                  <F label="Nome procuratore" style={{ marginTop: 12 }}>
                    <input className="input" value={draft.nome_procuratore ?? ''} onChange={e => upd('nome_procuratore', e.target.value)} />
                  </F>
                )}
                <F label="Specialità" style={{ marginTop: 12 }}>
                  <textarea className="input" rows={2} value={draft.specialita ?? ''} onChange={e => upd('specialita', e.target.value)} />
                </F>
              </div>
            ) : (
              <ReadGrid rows={[
                { label: 'Piede preferito', value: g.piede_preferito ?? '—' },
                { label: 'Ruolo preferito', value: g.ruolo_preferito ?? '—' },
                { label: 'Condizione', value: g.condizione ?? 'disponibile' },
                { label: 'Codice identificativo', value: g.codice_identificativo ?? '—' },
                { label: 'Nome maglia', value: g.nome_maglia ?? '—' },
                { label: 'Altezza', value: g.altezza_cm ? `${g.altezza_cm} cm` : '—' },
                { label: 'Peso', value: g.peso_kg ? `${g.peso_kg} kg` : '—' },
                { label: 'N. scarpa', value: g.numero_scarpa ?? '—' },
                { label: 'Taglia maglia', value: g.taglia_maglia ?? '—' },
                { label: 'Taglia pantaloni', value: g.taglia_pantaloni ?? '—' },
                { label: 'Modalità rateizzazione', value: g.modalita_rateizzazione ?? '—' },
                { label: 'Data decorrenza', value: formatData(g.data_decorrenza) },
                { label: 'Agonista', value: g.agonista ? 'Sì' : 'No' },
                { label: 'Necessita kit', value: g.necessita_kit ? 'Sì' : 'No' },
                { label: 'Ha procuratore', value: g.ha_procuratore ? 'Sì' : 'No' },
                { label: 'Nome procuratore', value: g.nome_procuratore ?? '—' },
                { label: 'Specialità', value: g.specialita ?? '—' },
              ]} />
            )
          )}

          {/* ─── VISITA MEDICA ─── */}
          {tab === 'visita' && (
            <>
              {certScaduto && (
                <div className="alert alert-danger" style={{ margin: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span>⚠ Visita medica scaduta il {formatData(certificati[0]?.data_scadenza)}</span>
                  <button className="btn btn-sm" style={{ marginLeft: 'auto', background: 'var(--rosso)', color: 'white', border: 'none' }} onClick={() => inviaReminderVisita(g)}>
                    Sollecita →
                  </button>
                </div>
              )}
              {editMode ? (
                <div style={{ padding: 20 }}>
                  <G2>
                    <F label="Tipologia visita"><input className="input" value={draft.visita_tipologia ?? ''} onChange={e => upd('visita_tipologia', e.target.value)} placeholder="Agonistica / Non agonistica" /></F>
                    <F label="Carico visita"><input className="input" value={draft.visita_carico ?? ''} onChange={e => upd('visita_carico', e.target.value)} placeholder="Agonistica in esenzione" /></F>
                    <F label="Prossima visita — data"><input className="input" type="date" value={draft.prossima_visita_data ?? ''} onChange={e => upd('prossima_visita_data', e.target.value || null)} /></F>
                    <F label="Prossima visita — luogo"><input className="input" value={draft.prossima_visita_luogo ?? ''} onChange={e => upd('prossima_visita_luogo', e.target.value)} /></F>
                  </G2>
                </div>
              ) : (
                <ReadGrid rows={[
                  { label: 'Tipologia visita', value: g.visita_tipologia ?? '—' },
                  { label: 'Carico visita', value: g.visita_carico ?? '—' },
                  { label: 'Prossima visita', value: formatData(g.prossima_visita_data) },
                  { label: 'Luogo visita', value: g.prossima_visita_luogo ?? '—' },
                ]} />
              )}
              {/* Certificati */}
              <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-solid)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent)', marginBottom: 10 }}>Certificati medici</div>
                {certificati.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--grigio-4)' }}>Nessun certificato registrato</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ borderBottom: '1px solid var(--border-solid)' }}>{['Tipo', 'Rilascio', 'Scadenza', 'Stato'].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grigio-4)' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {certificati.map(c => {
                        const valido = new Date(c.data_scadenza) >= oggi
                        const gg = Math.ceil((new Date(c.data_scadenza).getTime() - oggi.getTime()) / 86400000)
                        return (
                          <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '8px 10px' }}><span className="badge badge-grigio">{c.tipo}</span></td>
                            <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatData(c.data_rilascio)}</td>
                            <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatData(c.data_scadenza)}</td>
                            <td style={{ padding: '8px 10px' }}>{!valido ? <span className="badge badge-rosso">Scaduto</span> : gg <= 30 ? <span className="badge badge-ambra">{gg}gg</span> : <span className="badge badge-verde">Valido</span>}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* ─── PROFILO SANITARIO ─── */}
          {tab === 'sanitario' && (
            editMode ? (
              <div style={{ padding: 20 }}>
                <G2>
                  <F label="Tessera sanitaria"><input className="input" value={draft.tessera_sanitaria ?? ''} onChange={e => upd('tessera_sanitaria', e.target.value)} /></F>
                  <F label="Assicurazione"><input className="input" value={draft.assicurazione ?? ''} onChange={e => upd('assicurazione', e.target.value)} /></F>
                </G2>
                <F label="Intolleranze / Allergie"><textarea className="input" rows={2} value={draft.intolleranze ?? ''} onChange={e => upd('intolleranze', e.target.value)} /></F>
                <F label="Note mediche"><textarea className="input" rows={3} value={draft.note_mediche ?? ''} onChange={e => upd('note_mediche', e.target.value)} /></F>
                <F label="Preferenze alimentari"><textarea className="input" rows={2} value={draft.preferenze_alimentari ?? ''} onChange={e => upd('preferenze_alimentari', e.target.value)} /></F>
                <Chk label="Green Pass" checked={!!draft.ha_green_pass} onChange={v => upd('ha_green_pass', v)} />
              </div>
            ) : (
              <ReadGrid rows={[
                { label: 'Tessera sanitaria', value: g.tessera_sanitaria ?? '—' },
                { label: 'Assicurazione', value: g.assicurazione ?? '—' },
                { label: 'Green Pass', value: g.ha_green_pass ? 'Sì' : 'No' },
                { label: 'Intolleranze / Allergie', value: g.intolleranze ?? '—' },
                { label: 'Note mediche', value: g.note_mediche ?? '—' },
                { label: 'Preferenze alimentari', value: g.preferenze_alimentari ?? '—' },
              ]} />
            )
          )}

          {/* ─── ATTESTATI ─── */}
          {tab === 'attestati' && (
            editMode ? (
              <div style={{ padding: 20 }}>
                <Chk label="Certificato BLSD (Defibrillatore)" checked={!!draft.certificato_blsd} onChange={v => upd('certificato_blsd', v)} />
                <Chk label="Certificato Primo Soccorso" checked={!!draft.certificato_primo_soccorso} onChange={v => upd('certificato_primo_soccorso', v)} />
                <Chk label="Certificato Antincendio" checked={!!draft.certificato_antincendio} onChange={v => upd('certificato_antincendio', v)} />
              </div>
            ) : (
              <ReadGrid rows={[
                { label: 'BLSD', value: g.certificato_blsd ? '✓ Presente' : '—' },
                { label: 'Primo Soccorso', value: g.certificato_primo_soccorso ? '✓ Presente' : '—' },
                { label: 'Antincendio', value: g.certificato_antincendio ? '✓ Presente' : '—' },
              ]} />
            )
          )}

          {/* ─── INDIRIZZO ─── */}
          {tab === 'indirizzo' && (
            editMode ? (
              <div style={{ padding: 20 }}>
                <F label="Via"><input className="input" value={draft.via ?? ''} onChange={e => upd('via', e.target.value)} placeholder="Via Roma 1" /></F>
                <G2>
                  <F label="Città"><input className="input" value={draft.citta ?? ''} onChange={e => upd('citta', e.target.value)} placeholder="Milano" /></F>
                  <F label="CAP"><input className="input" value={draft.cap ?? ''} onChange={e => upd('cap', e.target.value)} placeholder="20100" /></F>
                  <F label="Provincia"><input className="input" value={draft.provincia ?? ''} onChange={e => upd('provincia', e.target.value)} placeholder="MI" maxLength={5} /></F>
                  <F label="Regione"><input className="input" value={draft.regione ?? ''} onChange={e => upd('regione', e.target.value)} placeholder="Lombardia" /></F>
                </G2>
                <F label="Nazione"><input className="input" value={draft.nazione ?? 'ITA'} onChange={e => upd('nazione', e.target.value)} /></F>
              </div>
            ) : (
              <ReadGrid rows={[
                { label: 'Via', value: g.via ?? '—' },
                { label: 'Città', value: g.citta ?? '—' },
                { label: 'CAP', value: g.cap ?? '—' },
                { label: 'Provincia', value: g.provincia ?? '—' },
                { label: 'Regione', value: g.regione ?? '—' },
                { label: 'Nazione', value: g.nazione ?? 'ITA' },
              ]} />
            )
          )}

          {/* ─── GENITORI ─── */}
          {tab === 'genitori' && (
            <div style={{ padding: 18 }}>
              {famiglia.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--grigio-4)', padding: '20px 0' }}>Nessun genitore / responsabile registrato</p>
              ) : famiglia.map(f => (
                <div key={f.id} className="card" style={{ padding: '16px 20px', marginBottom: 12, background: 'var(--gray-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{f.nome} {f.cognome} <span style={{ fontSize: 12, color: 'var(--grigio-4)', fontWeight: 400 }}>({f.relazione})</span></div>
                    <span className={`badge ${f.auth_user_id ? 'badge-verde' : 'badge-ambra'}`}>
                      {f.auth_user_id ? 'Collegato' : 'In attesa'}
                    </span>
                  </div>
                  <ReadGrid rows={[
                    { label: 'Email', value: f.email ?? '—' },
                    { label: 'Telefono', value: f.telefono ?? '—' },
                    { label: 'C.F.', value: f.codice_fiscale ?? '—' },
                    { label: 'Consenso dati', value: f.consenso_dati ? '✓' : '—' },
                    { label: 'Consenso immagini', value: f.consenso_immagini ? '✓' : '—' },
                  ]} />
                  {/* Codice invito — visibile solo se l'account non è ancora collegato */}
                  {!f.auth_user_id && (
                    <div style={{
                      marginTop: 14,
                      padding: '12px 14px',
                      background: 'rgba(200,240,0,0.04)',
                      border: '1px solid rgba(200,240,0,0.15)',
                      borderRadius: 8,
                    }}>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grigio-4)', marginBottom: 6 }}>
                        Codice invito da condividere
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <code style={{
                          fontFamily: 'var(--font-mono)', fontSize: 12,
                          color: 'var(--accent)', letterSpacing: '0.04em',
                          background: 'rgba(200,240,0,0.06)',
                          padding: '4px 10px', borderRadius: 6,
                          flexShrink: 0,
                        }}>
                          {f.id}
                        </code>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            navigator.clipboard.writeText(f.id)
                            setToast({ msg: 'Codice copiato!', tipo: 'success' })
                          }}
                        >
                          Copia
                        </button>
                        {f.email && (() => {
                          const stato = invioEmail[f.id] ?? 'idle'
                          return (
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={stato === 'sending' || stato === 'sent'}
                              onClick={async () => {
                                setInvioEmail(prev => ({ ...prev, [f.id]: 'sending' }))
                                try {
                                  const res = await fetch('/api/inviti/invia-codice-famiglia', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ famiglia_id: f.id }),
                                  })
                                  const json = await res.json()
                                  if (!res.ok) {
                                    setToast({ msg: json.error ?? 'Errore invio email', tipo: 'error' })
                                    setInvioEmail(prev => ({ ...prev, [f.id]: 'error' }))
                                  } else {
                                    setToast({ msg: `Email inviata a ${json.email}`, tipo: 'success' })
                                    setInvioEmail(prev => ({ ...prev, [f.id]: 'sent' }))
                                  }
                                } catch {
                                  setToast({ msg: 'Errore di rete', tipo: 'error' })
                                  setInvioEmail(prev => ({ ...prev, [f.id]: 'error' }))
                                }
                              }}
                            >
                              {stato === 'sending' ? 'Invio…' : stato === 'sent' ? '✓ Inviata' : 'Invia via email'}
                            </button>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ─── DOCUMENTO ─── */}
          {tab === 'documento' && (
            editMode ? (
              <div style={{ padding: 20 }}>
                <G2>
                  <F label="Tipo documento"><select className="input" value={draft.doc_tipo ?? ''} onChange={e => upd('doc_tipo', e.target.value)}><option value="">—</option><option value="ci">Carta d'identità</option><option value="passaporto">Passaporto</option><option value="patente">Patente</option></select></F>
                  <F label="Numero documento"><input className="input" value={draft.doc_numero ?? ''} onChange={e => upd('doc_numero', e.target.value)} /></F>
                  <F label="Data rilascio"><input className="input" type="date" value={draft.doc_rilascio ?? ''} onChange={e => upd('doc_rilascio', e.target.value || null)} /></F>
                  <F label="Data scadenza"><input className="input" type="date" value={draft.doc_scadenza ?? ''} onChange={e => upd('doc_scadenza', e.target.value || null)} /></F>
                </G2>
                <F label="Scadenza permesso di soggiorno"><input className="input" type="date" value={draft.permesso_soggiorno_scadenza ?? ''} onChange={e => upd('permesso_soggiorno_scadenza', e.target.value || null)} /></F>
              </div>
            ) : (
              <ReadGrid rows={[
                { label: 'Tipo documento', value: g.doc_tipo ?? '—' },
                { label: 'Numero', value: g.doc_numero ?? '—' },
                { label: 'Rilascio', value: formatData(g.doc_rilascio) },
                { label: 'Scadenza', value: formatData(g.doc_scadenza) },
                { label: 'Permesso soggiorno', value: formatData(g.permesso_soggiorno_scadenza) },
              ]} />
            )
          )}

          {/* ─── ALTRI DATI ─── */}
          {tab === 'altri' && (
            editMode ? (
              <div style={{ padding: 20 }}>
                <G2>
                  <F label="Società di provenienza"><input className="input" value={draft.societa_provenienza ?? ''} onChange={e => upd('societa_provenienza', e.target.value)} /></F>
                  <F label="Scuola frequentata"><input className="input" value={draft.scuola_frequentata ?? ''} onChange={e => upd('scuola_frequentata', e.target.value)} /></F>
                  <F label="Titolo di studio"><input className="input" value={draft.titolo_studio ?? ''} onChange={e => upd('titolo_studio', e.target.value)} /></F>
                  <F label="Indirizzo scolastico"><input className="input" value={draft.indirizzo_scolastico ?? ''} onChange={e => upd('indirizzo_scolastico', e.target.value)} /></F>
                  <F label="Data prima approvazione"><input className="input" type="date" value={draft.data_prima_approvazione ?? ''} onChange={e => upd('data_prima_approvazione', e.target.value || null)} /></F>
                </G2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
                  <Chk label="Usa pulmino" checked={!!draft.usa_pulmino} onChange={v => upd('usa_pulmino', v)} />
                  <Chk label="Fratelli tesserati" checked={!!draft.ha_fratelli_tesserati} onChange={v => upd('ha_fratelli_tesserati', v)} />
                  <Chk label="Altra previdenza" checked={!!draft.altra_previdenza} onChange={v => upd('altra_previdenza', v)} />
                </div>
              </div>
            ) : (
              <ReadGrid rows={[
                { label: 'Società di provenienza', value: g.societa_provenienza ?? '—' },
                { label: 'Scuola frequentata', value: g.scuola_frequentata ?? '—' },
                { label: 'Titolo di studio', value: g.titolo_studio ?? '—' },
                { label: 'Indirizzo scolastico', value: g.indirizzo_scolastico ?? '—' },
                { label: 'Data prima approvazione', value: formatData(g.data_prima_approvazione) },
                { label: 'Usa pulmino', value: g.usa_pulmino ? 'Sì' : 'No' },
                { label: 'Fratelli tesserati', value: g.ha_fratelli_tesserati ? 'Sì' : 'No' },
                { label: 'Altra previdenza', value: g.altra_previdenza ? 'Sì' : 'No' },
              ]} />
            )
          )}

          {/* ─── MATERIALE COMODATO ─── */}
          {tab === 'materiale' && (
            <div style={{ padding: 18 }}>
              {matComodato.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--grigio-4)', padding: '12px 0' }}>Nessun materiale in comodato</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border-solid)' }}>{['Materiale', 'Consegna', 'Restituzione'].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grigio-4)' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {matComodato.map((m: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 10px' }}>{m.nome ?? '—'}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{m.data_consegna ? formatData(m.data_consegna) : '—'}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{m.data_restituzione ? formatData(m.data_restituzione) : <span className="badge badge-verde">In uso</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {editMode && (
                <div style={{ marginTop: 14 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => {
                    const nome = prompt('Nome materiale:')
                    if (!nome) return
                    const newList = [...matComodato, { nome, data_consegna: new Date().toISOString().split('T')[0] }]
                    upd('materiale_comodato', newList)
                    supabase.from('giocatori').update({ materiale_comodato: newList }).eq('id', id).then(() => { setToast({ msg: 'Materiale aggiunto', tipo: 'success' }); load() })
                  }}>+ Aggiungi materiale</button>
                </div>
              )}
            </div>
          )}

          {/* ─── PRESENZE ─── */}
          {tab === 'presenze' && (
            <div style={{ padding: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                <div className="stat-card"><div className="stat-label">Presenze totali</div><div className="stat-value">{presentiN}/{presenzeTot}</div></div>
                <div className="stat-card"><div className="stat-label">% presenze</div><div className="stat-value" style={{ color: percPres !== null && percPres >= 75 ? 'var(--verde)' : 'var(--ambra)' }}>{percPres !== null ? `${percPres}%` : '—'}</div></div>
                <div className="stat-card"><div className="stat-label">Assenze</div><div className="stat-value" style={{ color: 'var(--rosso)' }}>{presenzeTot - presentiN}</div></div>
              </div>
              {presenze.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--grigio-4)' }}>Nessuna presenza registrata</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border-solid)' }}>{['Data', 'Tipo', 'Presenza'].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grigio-4)' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {presenze.slice(0, 30).map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.sessioni_allenamento ? formatData(p.sessioni_allenamento.data) : '—'}</td>
                        <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--grigio-3)', textTransform: 'capitalize' }}>{p.sessioni_allenamento?.tipo ?? '—'}</td>
                        <td style={{ padding: '8px 10px' }}><span className={`badge ${p.presente ? 'badge-verde' : 'badge-rosso'}`}>{p.presente ? 'Presente' : 'Assente'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ─── PAGAMENTI ─── */}
          {tab === 'pagamenti' && (
            <div style={{ padding: 18 }}>
              {quote.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--grigio-4)' }}>Nessuna quota registrata</p>
              ) : quote.map(q => {
                const qPag: any[] = Array.isArray(q.pagamenti) ? q.pagamenti : (q.pagamenti ? [q.pagamenti] : [])
                const totalePagato = qPag.reduce((s: number, p: any) => s + Number(p.importo), 0)
                const residuo = Number(q.importo_totale) - totalePagato
                return (
                  <div key={q.id} style={{ marginBottom: 16, border: '1px solid var(--border-solid)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', background: 'var(--gray-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Stagione {q.stagione}</span>
                        <span className={`badge ${q.stato === 'pagato' ? 'badge-verde' : q.stato === 'parziale' ? 'badge-ambra' : 'badge-rosso'}`} style={{ marginLeft: 8 }}>{q.stato}</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                        <span style={{ color: 'var(--verde)' }}>€{totalePagato.toFixed(2)}</span>
                        <span style={{ color: 'var(--grigio-4)' }}> / €{Number(q.importo_totale).toFixed(2)}</span>
                        {residuo > 0 && <span style={{ color: 'var(--rosso)', marginLeft: 8 }}>Residuo: €{residuo.toFixed(2)}</span>}
                      </div>
                    </div>
                    {qPag.length > 0 && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead><tr>{['Data', 'Importo', 'Metodo'].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--grigio-4)', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
                        <tbody>
                          {qPag.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatData(p.data_pagamento)}</td>
                              <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--verde)' }}>€{Number(p.importo).toFixed(2)}</td>
                              <td style={{ padding: '7px 10px', fontSize: 12, textTransform: 'capitalize', color: 'var(--grigio-3)' }}>{p.metodo}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal pagamento */}
      <Modal open={modalPag} onClose={() => setModalPag(false)} title="Registra pagamento" width={420}>
        <div>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Quota *</label>
            <select className="input" value={nuovoPagQuota} onChange={e => setNuovoPagQuota(e.target.value)}>
              <option value="">Seleziona quota...</option>
              {quote.map(q => <option key={q.id} value={q.id}>Stagione {q.stagione} — €{Number(q.importo_totale).toFixed(2)}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px', marginBottom: 14 }}>
            <div>
              <label className="label">Importo (€) *</label>
              <input className="input" type="number" min={0} step="0.01" value={nuovoPagImporto} onChange={e => setNuovoPagImporto(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <label className="label">Data</label>
              <input className="input" type="date" value={nuovoPagData} onChange={e => setNuovoPagData(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="label">Metodo</label>
            <select className="input" value={nuovoPagMetodo} onChange={e => setNuovoPagMetodo(e.target.value)}>
              <option value="contanti">Contanti</option>
              <option value="bonifico">Bonifico</option>
              <option value="carta">Carta</option>
              <option value="app">App / POS</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn btn-sm" onClick={() => setModalPag(false)}>Annulla</button>
            <button className="btn btn-primary btn-sm" onClick={registraPagamento}>Registra</button>
          </div>
        </div>
      </Modal>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

// ── helpers ──────────────────────────────────────────────────

function ReadGrid({ rows }: { rows: { label: string; value: string | number }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {rows.map(r => (
        <div key={r.label} style={{ padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{r.label}</div>
          <div style={{ fontSize: 13, color: 'var(--white)' }}>{r.value}</div>
        </div>
      ))}
    </div>
  )
}

function F({ label, hint, children, style }: { label: string; hint?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <label className="label">{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--grigio-4)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function G2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>{children}</div>
}

function Chk({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 13 }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
        {label}
      </label>
    </div>
  )
}
