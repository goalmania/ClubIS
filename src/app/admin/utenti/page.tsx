'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const ruoloLabel: Record<string, string> = {
  presidente: 'Presidente', ds: 'Dir. Sportivo', segretario: 'Segretario',
  allenatore: 'Allenatore', osservatore: 'Osservatore', medico: 'Medico', famiglia: 'Famiglia',
}

export default function AdminUtentiPage() {
  const [utenti, setUtenti] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [ruoloFiltro, setRuoloFiltro] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('utenti')
        .select('id, nome, cognome, email, ruolo, attivo, ultimo_accesso, club_id, clubs(nome)')
        .order('cognome')
      setUtenti(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const toggleAttivo = async (id: string, attivo: boolean) => {
    await supabase.from('utenti').update({ attivo: !attivo }).eq('id', id)
    setUtenti(prev => prev.map(u => u.id === id ? { ...u, attivo: !attivo } : u))
  }

  const filtered = utenti.filter(u => {
    const nomeMatch = filtro === '' || `${u.nome} ${u.cognome} ${u.email}`.toLowerCase().includes(filtro.toLowerCase())
    const ruoloMatch = ruoloFiltro === '' || u.ruolo === ruoloFiltro
    return nomeMatch && ruoloMatch
  })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Gestione Utenti</h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 2 }}>{utenti.length} utenti nel sistema</p>
      </div>

      <div className="card" style={{ padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <input className="input" placeholder="Cerca per nome, cognome o email..." value={filtro} onChange={e => setFiltro(e.target.value)} />
        </div>
        <select className="input" style={{ width: 160 }} value={ruoloFiltro} onChange={e => setRuoloFiltro(e.target.value)}>
          <option value="">Tutti i ruoli</option>
          {Object.entries(ruoloLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 14 }}>Caricamento...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 14 }}>Nessun utente trovato</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Utente</th><th>Email</th><th>Ruolo</th><th>Club</th><th>Ultimo accesso</th><th>Stato</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.cognome} {u.nome}</td>
                    <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{u.email}</td>
                    <td><span className="badge badge-grigio" style={{ fontSize: 11 }}>{ruoloLabel[u.ruolo] ?? u.ruolo}</span></td>
                    <td style={{ fontSize: 13, color: 'var(--grigio-3)' }}>{(u.clubs as any)?.nome ?? '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)' }}>
                      {u.ultimo_accesso ? new Date(u.ultimo_accesso).toLocaleDateString('it-IT') : '—'}
                    </td>
                    <td>
                      <span className={`badge ${u.attivo ? 'badge-verde' : 'badge-rosso'}`} style={{ fontSize: 11 }}>
                        {u.attivo ? 'Attivo' : 'Inattivo'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleAttivo(u.id, u.attivo)}
                        className={`btn btn-sm ${u.attivo ? 'btn-danger' : 'btn-primary'}`}
                        style={{ fontSize: 11 }}
                      >
                        {u.attivo ? 'Disattiva' : 'Attiva'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--grigio-4)', textAlign: 'right' }}>{filtered.length} di {utenti.length} utenti</div>}
    </div>
  )
}
