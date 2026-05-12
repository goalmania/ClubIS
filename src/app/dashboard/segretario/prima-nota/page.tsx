'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Toast, Modal } from '@/components/ui'

const categorie = ['quote_iscrizione','sponsorizzazioni','proventi_gare','stipendi','compensi_staff','trasferte','materiale_sportivo','affitto_strutture','utenze','federazione','altro']

export default function PrimaNotaPage() {
  const supabase = createClient()
  const [movimenti, setMovimenti] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [showForm, setShowForm] = useState(false)

  const oggi = new Date()
  const [mese, setMese] = useState(oggi.toISOString().slice(0, 7))
  const [tipo, setTipo] = useState('entrata')
  const [categoria, setCategoria] = useState('altro')
  const [importo, setImporto] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [data, setData] = useState(oggi.toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  // Storno
  const [stornoTarget, setStornoTarget] = useState<any | null>(null)
  const [stornoTipo, setStornoTipo] = useState<'totale' | 'parziale'>('totale')
  const [stornoImporto, setStornoImporto] = useState('')
  const [stornoMotivo, setStornoMotivo] = useState('')
  const [stornoData, setStornoData] = useState(oggi.toISOString().split('T')[0])
  const [stornoSaving, setStornoSaving] = useState(false)

  useEffect(() => { load() }, [mese])

  async function getClubId() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user!.id).single()
    return utente!.club_id as string
  }

  async function load() {
    setLoading(true)
    const clubId = await getClubId()
    const { data } = await supabase.from('prima_nota')
      .select('*')
      .eq('club_id', clubId)
      .gte('data', `${mese}-01`)
      .lte('data', `${mese}-31`)
      .order('data', { ascending: false })
    setMovimenti(data ?? [])
    setLoading(false)
  }

  // Escludi movimenti stornati dal calcolo totali
  const attivi = movimenti.filter(m => !m.stornato)
  const totEntrate = attivi.filter(m => m.tipo === 'entrata').reduce((s, m) => s + Number(m.importo), 0)
  const totUscite  = attivi.filter(m => m.tipo === 'uscita').reduce((s, m) => s + Number(m.importo), 0)
  const saldo      = totEntrate - totUscite

  const salva = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importo || !descrizione.trim()) { setToast({ msg: 'Importo e descrizione obbligatori', tipo: 'error' }); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user!.id).single()
    const { error } = await supabase.from('prima_nota').insert({
      club_id: utente!.club_id, tipo, categoria, importo: parseFloat(importo),
      data, descrizione: descrizione.trim(), registrato_da: user!.id,
    })
    if (error) { setToast({ msg: 'Errore', tipo: 'error' }); setSaving(false); return }
    setToast({ msg: 'Movimento registrato', tipo: 'success' })
    setImporto(''); setDescrizione(''); setShowForm(false); setSaving(false); load()
  }

  const apriStorno = (m: any) => {
    setStornoTarget(m)
    setStornoTipo('totale')
    setStornoImporto(String(Number(m.importo)))
    setStornoMotivo('')
    setStornoData(oggi.toISOString().split('T')[0])
  }

  const eseguiStorno = async () => {
    if (!stornoTarget) return
    const importoStorno = parseFloat(stornoImporto)
    if (isNaN(importoStorno) || importoStorno <= 0 || importoStorno > Number(stornoTarget.importo)) {
      setToast({ msg: 'Importo storno non valido', tipo: 'error' }); return
    }
    setStornoSaving(true)
    const clubId = await getClubId()
    const tipoStorno = stornoTarget.tipo === 'entrata' ? 'uscita' : 'entrata'

    const { data: nuovoMov, error: insErr } = await supabase.from('prima_nota').insert({
      club_id: clubId,
      tipo: tipoStorno,
      categoria: stornoTarget.categoria,
      importo: importoStorno,
      data: stornoData,
      descrizione: `STORNO: ${stornoTarget.descrizione}`,
      note: `Storno del movimento ID ${stornoTarget.id}${stornoMotivo ? ` — ${stornoMotivo}` : ''}`,
    }).select('id').single()

    if (insErr) { setToast({ msg: `Errore: ${insErr.message}`, tipo: 'error' }); setStornoSaving(false); return }

    await supabase.from('prima_nota').update({
      stornato: true,
      storno_id: nuovoMov!.id,
      importo_stornato: importoStorno,
    }).eq('id', stornoTarget.id)

    setStornoSaving(false)
    setStornoTarget(null)
    setToast({ msg: 'Storno registrato', tipo: 'success' })
    load()
  }

  const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  return (
    <div>
      <PageHeader title="Prima nota" subtitle={`Registro entrate e uscite — ${mese}`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <input type="month" className="input" style={{ width: 160 }} value={mese} onChange={e => setMese(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Chiudi' : '+ Movimento'}
            </button>
          </div>
        }
      />

      {/* Saldo mese */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-label">Entrate</div><div className="stat-value" style={{ color: 'var(--verde)', fontSize: 22 }}>{fmt(totEntrate)}</div></div>
        <div className="stat-card"><div className="stat-label">Uscite</div><div className="stat-value" style={{ color: 'var(--rosso)', fontSize: 22 }}>{fmt(totUscite)}</div></div>
        <div className="stat-card">
          <div className="stat-label">Saldo</div>
          <div className="stat-value" style={{ color: saldo >= 0 ? 'var(--verde)' : 'var(--rosso)', fontSize: 22 }}>{fmt(saldo)}</div>
        </div>
      </div>

      {/* Form nuovo movimento */}
      {showForm && (
        <div className="card" style={{ padding: '20px 24px', marginBottom: 20, borderLeft: '3px solid var(--verde)' }}>
          <form onSubmit={salva}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={tipo} onChange={e => setTipo(e.target.value)}>
                  <option value="entrata">Entrata</option>
                  <option value="uscita">Uscita</option>
                </select>
              </div>
              <div>
                <label className="label">Categoria</label>
                <select className="input" value={categoria} onChange={e => setCategoria(e.target.value)}>
                  {categorie.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Importo (€)</label>
                <input className="input" type="number" min={0} step="0.01" value={importo} onChange={e => setImporto(e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <label className="label">Data</label>
                <input className="input" type="date" value={data} onChange={e => setData(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <input className="input" style={{ flex: 1 }} value={descrizione} onChange={e => setDescrizione(e.target.value)} placeholder="Descrizione movimento..." />
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '...' : 'Registra'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabella movimenti */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Descrizione</th>
                <th style={{ textAlign: 'right' }}>Importo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--grigio-4)' }}>Caricamento...</td></tr>
              ) : movimenti.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--grigio-4)' }}>Nessun movimento registrato in questo mese</td></tr>
              ) : movimenti.map(m => {
                const isStornato = !!m.stornato
                const isStorno = m.descrizione?.startsWith('STORNO:')
                return (
                  <tr key={m.id} style={isStornato ? { opacity: 0.45 } : undefined}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{new Date(m.data).toLocaleDateString('it-IT')}</td>
                    <td>
                      <span className={`badge ${m.tipo === 'entrata' ? 'badge-verde' : 'badge-rosso'}`}>{m.tipo}</span>
                      {isStornato && <span className="badge badge-grigio" style={{ marginLeft: 4, fontSize: 9 }}>STORNATO</span>}
                      {isStorno && <span className="badge" style={{ marginLeft: 4, fontSize: 9, background: 'var(--accent-orange-lt)', color: 'var(--accent-orange)' }}>STORNO</span>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--grigio-3)', textTransform: 'capitalize' }}>{m.categoria.replace(/_/g, ' ')}</td>
                    <td style={{ fontSize: 13 }}>
                      {m.descrizione}
                      {m.note && <div style={{ fontSize: 11, color: 'var(--grigio-4)', fontStyle: 'italic' }}>{m.note}</div>}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: m.tipo === 'entrata' ? 'var(--verde)' : 'var(--rosso)', textDecoration: isStornato ? 'line-through' : undefined }}>
                      {m.tipo === 'entrata' ? '+' : '−'}€{Number(m.importo).toLocaleString('it-IT')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {!isStornato && !isStorno && (
                        <button
                          onClick={() => apriStorno(m)}
                          style={{ fontSize: 11, padding: '2px 8px', background: 'transparent', border: '1px solid var(--border-solid)', borderRadius: 2, cursor: 'pointer', color: 'var(--grigio-3)', transition: 'all 0.15s' }}
                        >
                          Storna
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal storno */}
      <Modal open={!!stornoTarget} onClose={() => setStornoTarget(null)} title="Storno movimento" width={460}>
        {stornoTarget && (
          <div>
            <div style={{ background: '#0d0d0d', borderRadius: 4, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
              <div style={{ color: 'var(--grigio-3)', fontSize: 11, marginBottom: 4 }}>Movimento originale</div>
              <div style={{ fontWeight: 600 }}>{stornoTarget.descrizione}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: stornoTarget.tipo === 'entrata' ? 'var(--verde)' : 'var(--rosso)' }}>
                {stornoTarget.tipo === 'entrata' ? '+' : '−'}€{Number(stornoTarget.importo).toLocaleString('it-IT')}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => { setStornoTipo('totale'); setStornoImporto(String(Number(stornoTarget.importo))) }}
                style={{ flex: 1, padding: '8px', border: `1px solid ${stornoTipo === 'totale' ? 'var(--accent)' : 'var(--border-solid)'}`, borderRadius: 2, background: stornoTipo === 'totale' ? 'rgba(200,240,0,0.06)' : 'transparent', color: stornoTipo === 'totale' ? 'var(--accent)' : 'var(--grigio-3)', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}
              >
                Storno totale
              </button>
              <button
                onClick={() => { setStornoTipo('parziale'); setStornoImporto('') }}
                style={{ flex: 1, padding: '8px', border: `1px solid ${stornoTipo === 'parziale' ? 'var(--accent)' : 'var(--border-solid)'}`, borderRadius: 2, background: stornoTipo === 'parziale' ? 'rgba(200,240,0,0.06)' : 'transparent', color: stornoTipo === 'parziale' ? 'var(--accent)' : 'var(--grigio-3)', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}
              >
                Storno parziale
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="label">Importo storno (€)</label>
              <input className="input" type="number" min={0.01} max={Number(stornoTarget.importo)} step="0.01"
                value={stornoImporto} onChange={e => setStornoImporto(e.target.value)}
                readOnly={stornoTipo === 'totale'}
                style={{ opacity: stornoTipo === 'totale' ? 0.7 : 1 }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Data storno</label>
              <input className="input" type="date" value={stornoData} onChange={e => setStornoData(e.target.value)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Motivo</label>
              <textarea className="input" rows={2} value={stornoMotivo} onChange={e => setStornoMotivo(e.target.value)}
                placeholder="Es: pagamento duplicato, errore di registrazione..." />
            </div>

            <div style={{ background: '#0a0d00', border: '1px solid var(--border-solid)', borderRadius: 4, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--grigio-3)' }}>
              Verrà creato un movimento di{' '}
              <strong style={{ color: stornoTarget.tipo === 'entrata' ? 'var(--rosso)' : 'var(--verde)' }}>
                {stornoTarget.tipo === 'entrata' ? 'uscita' : 'entrata'}
              </strong>
              {' '}di €{stornoImporto || '—'} con descrizione "STORNO: {stornoTarget.descrizione}".
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-sm" onClick={() => setStornoTarget(null)}>Annulla</button>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--accent-orange)', color: '#000', border: 'none' }}
                onClick={eseguiStorno}
                disabled={stornoSaving}
              >
                {stornoSaving ? '...' : 'Conferma storno'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
