'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Toast } from '@/components/ui'

export default function AdminAbbonamentiPage() {
  const [clubs, setClubs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('clubs')
        .select('id, nome, citta, piano_abbonamento, abbonamento_scadenza, attivo')
        .order('abbonamento_scadenza', { ascending: true, nullsFirst: true })
      setClubs(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const cambiaPiano = async (id: string, piano: string) => {
    await supabase.from('clubs').update({ piano_abbonamento: piano }).eq('id', id)
    setClubs(prev => prev.map(c => c.id === id ? { ...c, piano_abbonamento: piano } : c))
    setToast('Piano aggiornato')
    setTimeout(() => setToast(''), 3000)
  }

  const oggi = new Date()
  const scaduti = clubs.filter(c => c.abbonamento_scadenza && new Date(c.abbonamento_scadenza) < oggi)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Gestione Abbonamenti</h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 2 }}>{clubs.length} club — {scaduti.length} con abbonamento scaduto</p>
      </div>

      {scaduti.length > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: 20 }}>
          <strong>{scaduti.length} club</strong> con abbonamento scaduto. Verificare e rinnovare.
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 14 }}>Caricamento...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Club</th><th>Città</th><th>Piano</th><th>Scadenza</th><th>Stato</th><th>Modifica piano</th></tr>
              </thead>
              <tbody>
                {clubs.map(c => {
                  const scaduto = c.abbonamento_scadenza && new Date(c.abbonamento_scadenza) < oggi
                  const giorniRim = c.abbonamento_scadenza
                    ? Math.ceil((new Date(c.abbonamento_scadenza).getTime() - oggi.getTime()) / 86400000)
                    : null
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.nome}</td>
                      <td style={{ fontSize: 13, color: 'var(--grigio-3)' }}>{c.citta}</td>
                      <td>
                        <span className={`badge ${c.piano_abbonamento === 'elite' ? 'badge-viola' : c.piano_abbonamento === 'pro' ? 'badge-blu' : 'badge-grigio'}`}>
                          {c.piano_abbonamento}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {c.abbonamento_scadenza ? new Date(c.abbonamento_scadenza).toLocaleDateString('it-IT') : '—'}
                        {giorniRim !== null && (
                          <span style={{ marginLeft: 8, fontSize: 11, color: scaduto ? 'var(--rosso)' : giorniRim <= 30 ? 'var(--ambra)' : 'var(--grigio-4)' }}>
                            {scaduto ? `(scaduto da ${Math.abs(giorniRim)}gg)` : `(${giorniRim}gg)`}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${c.attivo ? 'badge-verde' : 'badge-rosso'}`} style={{ fontSize: 11 }}>
                          {c.attivo ? 'Attivo' : 'Sospeso'}
                        </span>
                      </td>
                      <td>
                        <select
                          className="input"
                          style={{ width: 100, padding: '4px 8px', fontSize: 12 }}
                          value={c.piano_abbonamento}
                          onChange={e => cambiaPiano(c.id, e.target.value)}
                        >
                          <option value="base">Base</option>
                          <option value="pro">Pro</option>
                          <option value="elite">Elite</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <Toast msg={toast} tipo="success" onClose={() => setToast('')} />}
    </div>
  )
}
