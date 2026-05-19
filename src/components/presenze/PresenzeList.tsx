'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, EmptyState } from '@/components/ui'
import Link from 'next/link'

interface Props {
  basePath: string           // es. '/dashboard/ds/presenze'
  nuovoAllenamentoPath?: string
  /** se true filtra per allenatore_id = user.id, altrimenti mostra tutte le sessioni del club */
  soloMie?: boolean
}

export default function PresenzeList({ basePath, nuovoAllenamentoPath, soloMie = false }: Props) {
  const supabase = createClient()
  const [sessioni, setSessioni] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      const sqAll: any[] = await fetch('/api/squadre').then(r => r.json()).catch(() => [])
      const sqIds: string[] = sqAll.map(s => s.id)

      const { data: sess } = await supabase
        .from('sessioni_allenamento')
        .select('id, data_ora, tipologia, stato, campo, durata_minuti, squadra_id, squadre(nome, categoria_eta)')
        .in('squadra_id', sqIds.length ? sqIds : ['none'])
        .order('data_ora', { ascending: false })
        .limit(60)

      const sessioniConPresenze = await Promise.all((sess ?? []).map(async s => {
        const { count: tot }      = await supabase.from('presenze').select('*', { count: 'exact', head: true }).eq('sessione_id', s.id)
        const { count: presenti } = await supabase.from('presenze').select('*', { count: 'exact', head: true }).eq('sessione_id', s.id).eq('presente', true)
        return { ...s, tot, presenti }
      }))

      setSessioni(sessioniConPresenze)
      setLoading(false)
    }
    load()
  }, [soloMie]) // eslint-disable-line react-hooks/exhaustive-deps

  const oggi = new Date()

  return (
    <div>
      <PageHeader
        title="Presenze allenamenti"
        subtitle="Seleziona una sessione per registrare o consultare le presenze"
        actions={nuovoAllenamentoPath ? (
          <Link href={nuovoAllenamentoPath} className="btn btn-primary btn-sm" data-onboarding="btn-nuova-sessione">+ Nuovo allenamento</Link>
        ) : undefined}
      />

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)' }}>Caricamento...</div>
        ) : sessioni.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Nessuna sessione"
            subtitle="Non ci sono sessioni di allenamento registrate"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Squadra</th>
                  <th>Campo</th>
                  <th>Presenze</th>
                  <th>Stato</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessioni.map(s => {
                  const data  = new Date(s.data_ora)
                  const isFut = data > oggi
                  const perc  = s.tot > 0 ? Math.round((s.presenti / s.tot) * 100) : null
                  const sq    = s.squadre as any
                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>
                          {data.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)' }}>
                          {data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={{ fontSize: 13, textTransform: 'capitalize' }}>{s.tipologia}</td>
                      <td style={{ fontSize: 13, color: 'var(--grigio-3)' }}>
                        {sq?.nome ?? '—'}
                        {sq?.categoria_eta && (
                          <span style={{ fontSize: 10, color: 'var(--grigio-4)', marginLeft: 6 }}>
                            {sq.categoria_eta.toUpperCase().replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--grigio-4)' }}>{s.campo ?? '—'}</td>
                      <td>
                        {perc !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="progress" style={{ width: 50 }}>
                              <div className="progress-fill" style={{
                                width: `${perc}%`,
                                background: perc >= 80 ? 'var(--verde)' : perc >= 60 ? 'var(--ambra)' : 'var(--rosso)',
                              }} />
                            </div>
                            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                              {s.presenti}/{s.tot}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--grigio-4)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${s.stato === 'effettuato' ? 'badge-verde' : s.stato === 'annullato' ? 'badge-rosso' : 'badge-ambra'}`}>
                          {s.stato}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`${basePath}/${s.id}`}
                          className="btn btn-sm"
                          style={{
                            background: isFut ? 'var(--verde-lt)' : 'var(--grigio-6)',
                            color: isFut ? 'var(--verde)' : 'var(--grigio-3)',
                            border: 'none', fontSize: 12,
                          }}
                        >
                          {isFut ? 'Prepara →' : 'Vedi →'}
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
    </div>
  )
}
