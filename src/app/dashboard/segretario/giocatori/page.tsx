'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GiocatoreConTesseramento } from '@/types/database'
import Link from 'next/link'
import { matchSearch } from '@/lib/search'

const ruoloLabel: Record<string, string> = {
  portiere: 'POR', difensore_centrale: 'DC', terzino: 'TRZ',
  centrocampista_difensivo: 'CDM', centrocampista: 'CEN',
  trequartista: 'TRQ', ala: 'ALA', seconda_punta: '2AP', centravanti: 'ATT',
}

const nazBadge: Record<string, string> = {
  italiano: 'badge-verde', ue: 'badge-blu', extracomunitario: 'badge-ambra'
}

export default function GiocatoriPage() {
  const [giocatori, setGiocatori] = useState<any[]>([])
  const [filtro, setFiltro] = useState('')
  const [ruoloFiltro, setRuoloFiltro] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', (await supabase.auth.getUser()).data.user?.id!).single()
      if (!utente) return
      const { data } = await supabase
        .from('tesseramenti')
        .select(`
          id, numero_maglia, tipo, squadra_id,
          giocatori ( id, nome, cognome, data_nascita, ruolo_principale, piede, nazionalita_tipo, foto_url ),
          squadre ( nome )
        `)
        .eq('club_id', utente.club_id)
        .eq('stato', 'attivo')
        .order('giocatori(cognome)')
      setGiocatori(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = giocatori.filter(t => {
    const g = t.giocatori
    if (!g) return false
    const nomeMatch = !filtro || matchSearch(filtro, g.nome, g.cognome)
    const ruoloMatch = ruoloFiltro === '' || g.ruolo_principale === ruoloFiltro
    return nomeMatch && ruoloMatch
  })

  const calcolaEta = (nascita: string) => {
    const oggi = new Date()
    const d = new Date(nascita)
    let eta = oggi.getFullYear() - d.getFullYear()
    if (oggi.getMonth() < d.getMonth() || (oggi.getMonth() === d.getMonth() && oggi.getDate() < d.getDate())) eta--
    return eta
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Giocatori</h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 2 }}>
            {giocatori.length} tesserati stagione corrente
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm">
            ↑ Importa CSV
          </button>
          <Link href="/dashboard/segretario/giocatori/nuovo" className="btn btn-primary btn-sm">
            + Aggiungi giocatore
          </Link>
        </div>
      </div>

      {/* Filtri */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--grigio-4)' }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Cerca per nome o cognome..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
          />
        </div>
        <select
          className="input"
          style={{ width: 200 }}
          value={ruoloFiltro}
          onChange={e => setRuoloFiltro(e.target.value)}
        >
          <option value="">Tutti i ruoli</option>
          {Object.entries(ruoloLabel).map(([k, v]) => (
            <option key={k} value={k}>{v} — {k.replace('_', ' ')}</option>
          ))}
        </select>
        {(filtro || ruoloFiltro) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFiltro(''); setRuoloFiltro('') }}>
            Azzera
          </button>
        )}
      </div>

      {/* Tabella */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 14 }}>
            Caricamento giocatori...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 14 }}>
            {filtro || ruoloFiltro ? 'Nessun giocatore corrisponde ai filtri' : 'Nessun giocatore tesserato. Aggiungi il primo!'}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Giocatore</th>
                  <th>Età</th>
                  <th>Ruolo</th>
                  <th>Piede</th>
                  <th>Naz.</th>
                  <th>Squadra</th>
                  <th>Tipo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const g = t.giocatori
                  if (!g) return null
                  const iniziali = `${g.nome[0]}${g.cognome[0]}`.toUpperCase()
                  const eta = calcolaEta(g.data_nascita)
                  return (
                    <tr key={t.id}>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--grigio-4)', fontWeight: 500 }}>
                          {t.numero_maglia ? `#${t.numero_maglia}` : '—'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {g.foto_url ? (
                            <img src={g.foto_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{iniziali}</div>
                          )}
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>{g.cognome} {g.nome}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--grigio-3)' }}>{eta} anni</td>
                      <td>
                        {g.ruolo_principale ? (
                          <span className="badge badge-grigio" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                            {ruoloLabel[g.ruolo_principale] ?? g.ruolo_principale}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--grigio-3)', textTransform: 'capitalize' }}>
                        {g.piede ?? '—'}
                      </td>
                      <td>
                        <span className={`badge ${nazBadge[g.nazionalita_tipo] ?? 'badge-grigio'}`} style={{ fontSize: 11 }}>
                          {g.nazionalita_tipo?.toUpperCase().slice(0, 3) ?? '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--grigio-3)' }}>
                        {t.squadre?.nome ?? '—'}
                      </td>
                      <td>
                        <span className="badge badge-grigio" style={{ fontSize: 11 }}>{t.tipo}</span>
                      </td>
                      <td>
                        <Link
                          href={`/dashboard/segretario/giocatori/${g.id}`}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 12 }}
                        >
                          Apri →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer count */}
      {!loading && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--grigio-4)', textAlign: 'right' }}>
          {filtered.length} di {giocatori.length} giocatori
        </div>
      )}
    </div>
  )
}
