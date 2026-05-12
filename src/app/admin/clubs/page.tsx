'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [pianoFiltro, setPianoFiltro] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('clubs')
        .select('id, nome, citta, categoria, piano_abbonamento, attivo, created_at, email_ufficiale')
        .order('created_at', { ascending: false })
      setClubs(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const toggleStato = async (id: string, attivo: boolean) => {
    await fetch('/api/admin/sospendi-club', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, attivo: !attivo }),
    })
    setClubs(prev => prev.map(c => c.id === id ? { ...c, attivo: !attivo } : c))
  }

  const filtered = clubs.filter(c => {
    const nomeMatch = filtro === '' || c.nome.toLowerCase().includes(filtro.toLowerCase()) || c.citta.toLowerCase().includes(filtro.toLowerCase())
    const pianoMatch = pianoFiltro === '' || c.piano_abbonamento === pianoFiltro
    return nomeMatch && pianoMatch
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Gestione Club</h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 2 }}>{clubs.length} club registrati</p>
        </div>
        <Link href="/admin/clubs/nuovo" className="btn btn-primary btn-sm">+ Nuovo club</Link>
      </div>

      <div className="card" style={{ padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            className="input"
            placeholder="Cerca club per nome o città..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
          />
        </div>
        <select className="input" style={{ width: 160 }} value={pianoFiltro} onChange={e => setPianoFiltro(e.target.value)}>
          <option value="">Tutti i piani</option>
          <option value="base">Base</option>
          <option value="pro">Pro</option>
          <option value="elite">Elite</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 14 }}>Caricamento...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 14 }}>Nessun club trovato</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Club</th>
                  <th>Città</th>
                  <th>Categoria</th>
                  <th>Piano</th>
                  <th>Stato</th>
                  <th>Data reg.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.nome}</td>
                    <td style={{ fontSize: 13, color: 'var(--grigio-3)' }}>{c.citta}</td>
                    <td><span className="badge badge-grigio" style={{ fontSize: 11, textTransform: 'capitalize' }}>{c.categoria.replace(/_/g, ' ')}</span></td>
                    <td>
                      <span className={`badge ${c.piano_abbonamento === 'elite' ? 'badge-viola' : c.piano_abbonamento === 'pro' ? 'badge-blu' : 'badge-grigio'}`}>
                        {c.piano_abbonamento}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${c.attivo ? 'badge-verde' : 'badge-rosso'}`}>
                        {c.attivo ? 'Attivo' : 'Sospeso'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(c.created_at).toLocaleDateString('it-IT')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link href={`/admin/clubs/${c.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
                          Dettaglio
                        </Link>
                        <button
                          onClick={() => toggleStato(c.id, c.attivo)}
                          className={`btn btn-sm ${c.attivo ? 'btn-danger' : 'btn-primary'}`}
                          style={{ fontSize: 12 }}
                        >
                          {c.attivo ? 'Sospendi' : 'Attiva'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
