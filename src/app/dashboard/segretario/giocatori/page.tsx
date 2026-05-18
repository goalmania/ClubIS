'use client'
import { useState, useEffect } from 'react'
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

const PRIMA_SQUADRA  = ['prima_squadra', 'femminile']
const SETTORE_GIOV   = ['u14','u15','u16','u17','u19','juniores','primavera']
const SCUOLA_CALCIO  = ['u6','u8','u10','u12']

type CategoriaTab = 'tutti' | 'prima_squadra' | 'giovanili' | 'scuola_calcio'

const TABS: { key: CategoriaTab; label: string }[] = [
  { key: 'tutti',         label: 'Tutti' },
  { key: 'prima_squadra', label: 'Prima Squadra' },
  { key: 'giovanili',     label: 'Settore Giovanile' },
  { key: 'scuola_calcio', label: 'Scuola Calcio' },
]

function getCategoria(categoriaEta: string | null | undefined): CategoriaTab {
  if (!categoriaEta) return 'scuola_calcio'
  if (PRIMA_SQUADRA.includes(categoriaEta)) return 'prima_squadra'
  if (SETTORE_GIOV.includes(categoriaEta)) return 'giovanili'
  return 'scuola_calcio'
}

export default function GiocatoriPage() {
  const [giocatori, setGiocatori] = useState<any[]>([])
  const [filtro, setFiltro] = useState('')
  const [ruoloFiltro, setRuoloFiltro] = useState('')
  const [categoriaTab, setCategoriaTab] = useState<CategoriaTab>('tutti')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/giocatori/lista')
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
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
    const tabMatch = categoriaTab === 'tutti' || getCategoria(t.squadre?.categoria_eta) === categoriaTab
    return nomeMatch && ruoloMatch && tabMatch
  })

  const countByTab = (tab: CategoriaTab) =>
    tab === 'tutti' ? giocatori.length : giocatori.filter(t => getCategoria(t.squadre?.categoria_eta) === tab).length

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
            {categoriaTab !== 'tutti' && ` · ${countByTab(categoriaTab)} in questa categoria`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/dashboard/segretario/import" className="btn btn-secondary btn-sm">
            ↑ Importa CSV
          </Link>
          <Link href="/dashboard/segretario/giocatori/nuovo" className="btn btn-primary btn-sm">
            + Aggiungi giocatore
          </Link>
        </div>
      </div>

      {/* Tabs categoria */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(tab => {
          const count = countByTab(tab.key)
          const active = categoriaTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setCategoriaTab(tab.key)}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                color: active ? 'var(--accent)' : 'var(--grigio-3)',
                fontFamily: 'var(--font-display)',
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: -1,
              }}
            >
              {tab.label}
              <span style={{
                fontSize: 11,
                background: active ? 'rgba(200,240,0,0.15)' : 'var(--gray-mid)',
                color: active ? 'var(--accent)' : 'var(--grigio-4)',
                padding: '1px 6px',
                borderRadius: 10,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
              }}>
                {count}
              </span>
            </button>
          )
        })}
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
