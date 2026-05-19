'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type CategoriaTab = 'tutti' | 'prima_squadra' | 'settore_giovanile' | 'scuola_calcio'

const PRIMA_SQ = ['prima_squadra', 'femminile']
const SETTORE_GIO = ['u14', 'u15', 'u16', 'u17', 'u19', 'juniores', 'primavera']

function getCategoria(cat: string | null | undefined): CategoriaTab {
  if (!cat || !PRIMA_SQ.includes(cat) && !SETTORE_GIO.includes(cat)) return 'scuola_calcio'
  if (PRIMA_SQ.includes(cat)) return 'prima_squadra'
  return 'settore_giovanile'
}

const LABEL_CAT: Record<CategoriaTab, string> = {
  tutti: 'Tutte',
  prima_squadra: 'Prima Squadra',
  settore_giovanile: 'Settore Giovanile',
  scuola_calcio: 'Scuola Calcio',
}

export default function DistintePage() {
  const supabase = createClient()

  const [partite, setPartite] = useState<any[]>([])
  const [distinteMap, setDistinteMap] = useState<Map<string, any>>(new Map())
  const [loading, setLoading] = useState(true)
  const [categoriaTab, setCategoriaTab] = useState<CategoriaTab>('tutti')

  useEffect(() => {
    const load = async () => {
      const squadre: any[] = await fetch('/api/squadre').then(r => r.json()).catch(() => [])
      const squadreIds = squadre.map((s: any) => s.id)
      const squadraMap = new Map(squadre.map((s: any) => [s.id, s]))

      const { data: pp } = squadreIds.length > 0
        ? await supabase
            .from('partite')
            .select('id, avversario, data_ora, competizione, giornata, casa_trasferta, stato, squadra_id')
            .in('squadra_id', squadreIds)
            .order('data_ora', { ascending: false })
        : { data: [] as any[] }

      const arricchite = (pp ?? []).map((p: any) => ({
        ...p,
        squadra: squadraMap.get(p.squadra_id) ?? null,
      }))
      setPartite(arricchite)

      const partiteIds = arricchite.map((p: any) => p.id)
      const { data: distinte } = partiteIds.length > 0
        ? await supabase
            .from('distinte_gara')
            .select('partita_id, versione, generata_at')
            .in('partita_id', partiteIds)
        : { data: [] as any[] }
      setDistinteMap(new Map((distinte ?? []).map((d: any) => [d.partita_id, d])))
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtrate = categoriaTab === 'tutti'
    ? partite
    : partite.filter(p => getCategoria(p.squadra?.categoria_eta) === categoriaTab)

  const countCat = (c: CategoriaTab) =>
    c === 'tutti' ? partite.length : partite.filter(p => getCategoria(p.squadra?.categoria_eta) === c).length

  const totale = filtrate.length
  const generate = filtrate.filter(p => distinteMap.has(p.id)).length
  const daGenerare = totale - generate

  const fmtData = (d: string) =>
    new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
  const fmtOra = (d: string) =>
    new Date(d).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Distinte Gara</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Archivio distinte stagione corrente</p>
        </div>
      </div>

      {/* Tabs categoria */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['tutti', 'prima_squadra', 'settore_giovanile', 'scuola_calcio'] as CategoriaTab[]).map(c => (
          <button
            key={c}
            onClick={() => setCategoriaTab(c)}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              border: categoriaTab === c ? '1px solid var(--accent)' : '1px solid var(--grigio-5)',
              background: categoriaTab === c ? 'rgba(200,240,0,0.12)' : 'transparent',
              color: categoriaTab === c ? 'var(--accent)' : 'var(--grigio-3)',
              fontWeight: categoriaTab === c ? 600 : 400,
            }}
          >
            {LABEL_CAT[c]} ({countCat(c)})
          </button>
        ))}
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Partite {categoriaTab !== 'tutti' ? LABEL_CAT[categoriaTab] : 'stagione'}</div>
          <div className="stat-value">{totale}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Distinte generate</div>
          <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{generate}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Da generare</div>
          <div className="stat-value" style={{ color: daGenerare > 0 ? 'var(--accent-orange)' : 'var(--accent-green)' }}>
            {daGenerare}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Caricamento...</div>
        ) : filtrate.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nessuna partita in calendario{categoriaTab !== 'tutti' ? ` per ${LABEL_CAT[categoriaTab]}` : ''}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)' }}>
                <th style={th}>Data</th>
                <th style={th}>Avversario</th>
                <th style={th}>Categoria</th>
                <th style={th}>Competizione</th>
                <th style={th}>Giornata</th>
                <th style={th}>Distinta</th>
                <th style={{ ...th, textAlign: 'right' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtrate.map((p: any) => {
                const distinta = distinteMap.get(p.id)
                const catTab = getCategoria(p.squadra?.categoria_eta)
                const catColor = catTab === 'prima_squadra' ? 'var(--accent)' : catTab === 'settore_giovanile' ? '#388bfd' : '#66ddff'
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={td}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{fmtData(p.data_ora)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtOra(p.data_ora)}</div>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {p.casa_trasferta === 'trasferta' ? '✈ ' : '🏠 '}{p.avversario}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: catColor, background: `${catColor}18`, padding: '2px 8px', borderRadius: 10 }}>
                        {p.squadra?.nome ?? LABEL_CAT[catTab]}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.competizione ?? '—'}</span>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.giornata ? `G${p.giornata}` : '—'}</span>
                    </td>
                    <td style={td}>
                      {distinta
                        ? <span className="badge badge-verde">Generata ✓</span>
                        : <span className="badge badge-ambra">Da generare</span>}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      {distinta ? (
                        <Link href={`/dashboard/segretario/distinte/${p.id}/stampa`} className="btn btn-ghost btn-sm">Vedi</Link>
                      ) : (
                        <Link href={`/dashboard/segretario/distinte/${p.id}`} className="btn btn-primary btn-sm" data-onboarding="btn-genera-distinta">Genera distinta</Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const th: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)',
  borderBottom: '1px solid var(--border)',
}
const td: React.CSSProperties = { padding: '12px 16px', fontSize: 13, verticalAlign: 'middle' }
