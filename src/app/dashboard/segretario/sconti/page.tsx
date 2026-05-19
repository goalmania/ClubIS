'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Modal, Toast, EmptyState } from '@/components/ui'

const SCONTI_DEFAULT = [
  { nome: 'Sconto fratelli (2 figli)',  tipo: 'percentuale', valore: 10 },
  { nome: 'Sconto fratelli (3+ figli)', tipo: 'percentuale', valore: 15 },
  { nome: 'Sconto fedeltà 3+ anni',     tipo: 'percentuale', valore: 10 },
  { nome: 'Borsa di studio',            tipo: 'percentuale', valore: 50 },
  { nome: 'Esonero totale',             tipo: 'percentuale', valore: 100 },
  { nome: 'Sconto fisso €20',           tipo: 'fisso',       valore: 20 },
  { nome: 'Sconto fisso €50',           tipo: 'fisso',       valore: 50 },
]

type Sconto = {
  id: string
  nome: string
  tipo: string
  valore: number
  attivo: boolean
  note: string | null
}

type RataConPiano = {
  id: string
  numero_rata: number
  importo: number
  importo_originale: number | null
  scadenza: string
  stato: string
  piano_id: {
    id: string
    descrizione: string
    famiglie: { nome: string; cognome: string } | null
    giocatori: { nome: string; cognome: string } | null
  }
}

export default function ScontiPage() {
  const supabase = createClient()
  const [sconti, setSconti] = useState<Sconto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalApri, setModalApri] = useState(false)
  const [form, setForm] = useState({ nome: '', tipo: 'percentuale', valore: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [clubId, setClubId] = useState<string | null>(null)

  // Applica sconto
  const [rate, setRate] = useState<RataConPiano[]>([])
  const [rataSel, setRataSel] = useState('')
  const [scontoSel, setScontoSel] = useState('')
  const [calcoloSconto, setCalcoloSconto] = useState<{ originale: number; sconto: number; finale: number } | null>(null)
  const [applicando, setApplicando] = useState(false)

  // Report
  const [rateConSconto, setRateConSconto] = useState<any[]>([])

  const carica = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
    if (!utente) return
    setClubId(utente.club_id)

    const { data } = await supabase
      .from('sconti_listino')
      .select('*')
      .eq('club_id', utente.club_id)
      .order('created_at')
    setSconti(data ?? [])

    // Rate pagamento in attesa (per applicare sconti)
    const { data: rateData } = await supabase
      .from('rate_pagamento')
      .select(`id, numero_rata, importo, importo_originale, scadenza, stato, piano_id(id, descrizione, famiglie(nome, cognome), giocatori(nome, cognome))`)
      .eq('club_id', utente.club_id)
      .in('stato', ['in_attesa', 'in_ritardo'])
      .order('scadenza')
      .limit(100)
    setRate((rateData ?? []) as unknown as RataConPiano[])

    // Rate con sconto già applicato
    const { data: scontate } = await supabase
      .from('rate_pagamento')
      .select(`id, numero_rata, importo, importo_originale, sconto_importo, scadenza, sconto_id, piano_id(descrizione, famiglie(nome, cognome), giocatori(nome, cognome)), sconti_listino:sconto_id(nome)`)
      .eq('club_id', utente.club_id)
      .not('sconto_id', 'is', null)
      .gt('sconto_importo', 0)
    setRateConSconto(scontate ?? [])

    setLoading(false)
  }, [supabase])

  useEffect(() => { carica() }, [carica])

  // Se nessuno sconto, proponi default
  const inizializzaDefault = async () => {
    if (!clubId) return
    setSaving(true)
    const { error } = await supabase.from('sconti_listino').insert(
      SCONTI_DEFAULT.map(s => ({ ...s, club_id: clubId }))
    )
    if (error) {
      setToast({ msg: `Errore: ${error.message}`, tipo: 'error' })
    } else {
      await carica()
      setToast({ msg: 'Sconti predefiniti aggiunti', tipo: 'success' })
    }
    setSaving(false)
  }

  const salvaSconto = async () => {
    if (!form.nome || !form.valore || !clubId) return
    setSaving(true)
    const { error } = await supabase.from('sconti_listino').insert({
      club_id: clubId,
      nome: form.nome,
      tipo: form.tipo,
      valore: parseFloat(form.valore),
      note: form.note || null,
    })
    if (error) {
      setToast({ msg: `Errore: ${error.message}`, tipo: 'error' })
    } else {
      setToast({ msg: 'Sconto aggiunto', tipo: 'success' })
      setModalApri(false)
      setForm({ nome: '', tipo: 'percentuale', valore: '', note: '' })
      await carica()
    }
    setSaving(false)
  }

  const toggleAttivo = async (s: Sconto) => {
    await supabase.from('sconti_listino').update({ attivo: !s.attivo }).eq('id', s.id).eq('club_id', clubId)
    await carica()
  }

  // Calcolo live sconto
  useEffect(() => {
    if (!rataSel || !scontoSel) { setCalcoloSconto(null); return }
    const rata = rate.find(r => r.id === rataSel)
    const sconto = sconti.find(s => s.id === scontoSel)
    if (!rata || !sconto) return
    const originale = rata.importo_originale ?? rata.importo
    let importoSconto = 0
    if (sconto.tipo === 'percentuale') {
      importoSconto = Math.round(originale * sconto.valore / 100 * 100) / 100
    } else {
      importoSconto = Math.min(sconto.valore, originale)
    }
    setCalcoloSconto({ originale, sconto: importoSconto, finale: Math.max(0, originale - importoSconto) })
  }, [rataSel, scontoSel, rate, sconti])

  const applicaSconto = async () => {
    if (!rataSel || !scontoSel || !calcoloSconto) return
    setApplicando(true)
    const { error } = await supabase
      .from('rate_pagamento')
      .update({ sconto_id: scontoSel, sconto_importo: calcoloSconto.sconto })
      .eq('id', rataSel)
    if (error) {
      setToast({ msg: `Errore: ${error.message}`, tipo: 'error' })
    } else {
      setToast({ msg: 'Sconto applicato con successo', tipo: 'success' })
      setRataSel('')
      setScontoSel('')
      setCalcoloSconto(null)
      await carica()
    }
    setApplicando(false)
  }

  const totaleRisparmiato = rateConSconto.reduce((s, r) => s + (r.sconto_importo ?? 0), 0)

  if (loading) {
    return <div style={{ padding: 40, fontFamily: 'var(--font-mono)', color: 'var(--gray)', fontSize: 12 }}>Caricamento...</div>
  }

  return (
    <div>
      <PageHeader
        title="Sconti e agevolazioni"
        subtitle="Gestisci il listino sconti e applicali alle rate di pagamento"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setModalApri(true)}>
            + Nuovo sconto
          </button>
        }
      />

      {/* Sezione 1: Listino */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.08em', marginBottom: 16 }}>
          Listino sconti del club
        </div>

        {sconti.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <EmptyState
              icon="🏷"
              title="Nessuno sconto configurato"
              subtitle="Aggiungi sconti personalizzati o carica i predefiniti"
            />
            <button className="btn btn-secondary btn-sm" onClick={inizializzaDefault} disabled={saving} style={{ marginTop: 8 }}>
              Carica sconti predefiniti
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Nome', 'Tipo', 'Valore', 'Stato', 'Azioni'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sconti.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', opacity: s.attivo ? 1 : 0.45 }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--white)' }}>{s.nome}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', textTransform: 'uppercase' }}>{s.tipo}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>
                    {s.tipo === 'percentuale' ? `${s.valore}%` : `€${s.valore}`}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', borderRadius: 2, background: s.attivo ? 'rgba(200,240,0,0.1)' : 'var(--gray-mid)', color: s.attivo ? 'var(--accent)' : 'var(--gray)', textTransform: 'uppercase' }}>
                      {s.attivo ? 'Attivo' : 'Disattivo'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => toggleAttivo(s)}>
                      {s.attivo ? 'Disattiva' : 'Attiva'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Sezione 2: Applica sconto */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.08em', marginBottom: 16 }}>
          Applica sconto a una rata
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: 6 }}>
              Rata
            </label>
            <select className="input" value={rataSel} onChange={e => setRataSel(e.target.value)} style={{ fontSize: 12 }}>
              <option value="">Seleziona rata...</option>
              {rate.map(r => {
                const piano = r.piano_id
                const chi = piano?.famiglie ? `${piano.famiglie.cognome} ${piano.famiglie.nome}` : (piano?.giocatori ? `${piano.giocatori.cognome} ${piano.giocatori.nome}` : '—')
                return (
                  <option key={r.id} value={r.id}>
                    {chi} — {piano?.descrizione} — Rata {r.numero_rata} — €{r.importo}
                  </option>
                )
              })}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: 6 }}>
              Sconto da applicare
            </label>
            <select className="input" value={scontoSel} onChange={e => setScontoSel(e.target.value)} style={{ fontSize: 12 }}>
              <option value="">Seleziona sconto...</option>
              {sconti.filter(s => s.attivo).map(s => (
                <option key={s.id} value={s.id}>
                  {s.nome} — {s.tipo === 'percentuale' ? `${s.valore}%` : `€${s.valore}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {calcoloSconto && (
          <div style={{ background: 'var(--gray-mid)', padding: '16px 20px', borderRadius: 2, marginBottom: 16, borderLeft: '3px solid var(--accent)' }}>
            <div style={{ display: 'flex', gap: 32 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 4 }}>Importo originale</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--white)' }}>€{calcoloSconto.originale.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 4 }}>Sconto</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: '#ef4444' }}>- €{calcoloSconto.sconto.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 4 }}>Nuovo importo</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--accent)' }}>€{calcoloSconto.finale.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={applicaSconto}
          disabled={!rataSel || !scontoSel || !calcoloSconto || applicando}
        >
          {applicando ? 'Applicazione...' : 'Applica sconto →'}
        </button>
      </div>

      {/* Sezione 3: Report */}
      {rateConSconto.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.08em' }}>
              Sconti applicati questa stagione
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--accent)' }}>
              Totale risparmiato: €{totaleRisparmiato.toFixed(2)}
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Famiglia / Giocatore', 'Piano', 'Sconto applicato', 'Importo risparmiato'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rateConSconto.map((r: any) => {
                const piano = r.piano_id
                const chi = piano?.famiglie ? `${piano.famiglie.cognome} ${piano.famiglie.nome}` : (piano?.giocatori ? `${piano.giocatori.cognome} ${piano.giocatori.nome}` : '—')
                const nomeSconto = r.sconti_listino?.nome ?? '—'
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--white)' }}>{chi}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)' }}>{piano?.descrizione}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--white)' }}>{nomeSconto}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#4ade80' }}>€{Number(r.sconto_importo).toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nuovo sconto */}
      <Modal open={modalApri} onClose={() => setModalApri(false)} title="Nuovo sconto" width={440}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: 6 }}>
              Nome sconto *
            </label>
            <input className="input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="es. Sconto fratelli" />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: 8 }}>
              Tipo *
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              {[{ k: 'percentuale', l: 'Percentuale %' }, { k: 'fisso', l: 'Importo fisso €' }].map(opt => (
                <label key={opt.k} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 13, color: form.tipo === opt.k ? 'var(--accent)' : 'var(--gray)' }}>
                  <input type="radio" name="tipo" value={opt.k} checked={form.tipo === opt.k} onChange={() => setForm(f => ({ ...f, tipo: opt.k }))} />
                  {opt.l}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: 6 }}>
              Valore *
            </label>
            <input className="input" type="number" min="0" max={form.tipo === 'percentuale' ? 100 : undefined} step="0.01" value={form.valore} onChange={e => setForm(f => ({ ...f, valore: e.target.value }))} placeholder={form.tipo === 'percentuale' ? 'es. 10 (10%)' : 'es. 20 (€20)'} />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: 6 }}>
              Note
            </label>
            <textarea className="input" rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Condizioni di applicazione..." />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setModalApri(false)}>Annulla</button>
            <button className="btn btn-primary btn-sm" onClick={salvaSconto} disabled={saving || !form.nome || !form.valore}>
              {saving ? 'Salvataggio...' : 'Salva sconto'}
            </button>
          </div>
        </div>
      </Modal>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
