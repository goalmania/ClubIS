'use client'
import FeatureGate from '@/components/FeatureGate'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import FormVisita from '@/components/forms/FormVisita'

export default function MedicoVisitePage() {
  const supabase = createClient()
  const [clubId, setClubId] = useState<string | null>(null)
  const [visite, setVisite] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openDrawer, setOpenDrawer] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
      if (!utente) return
      setClubId(utente.club_id)

      const { data } = await supabase
        .from('visite_mediche')
        .select('id, tipo, data, esito, note, struttura, giocatori(nome, cognome)')
        .eq('club_id', utente.club_id)
        .order('data', { ascending: false })
      setVisite(data ?? [])
      setLoading(false)
    }
    init()
  }, [refresh])

  const oggiStr = new Date().toISOString().split('T')[0]
  const future = visite.filter(v => v.data >= oggiStr)
  const passate = visite.filter(v => v.data < oggiStr)

  const esitoBadge: Record<string, string> = {
    idoneo: 'badge-verde', non_idoneo: 'badge-rosso', sospesa: 'badge-ambra', in_attesa: 'badge-grigio',
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Caricamento…</div>

  return (
    <FeatureGate feature="visite_mediche" featureLabel="Visite Mediche">
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Visite mediche</h1>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Agenda visite e idoneità agonistica</p>
            </div>
            <button data-onboarding="btn-nuova-visita" className="btn btn-primary btn-sm" onClick={() => setOpenDrawer(true)}>
              + Pianifica visita
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600, color: 'var(--accent-blue)' }}>
                In programma ({future.length})
              </div>
              {future.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nessuna visita pianificata</div>
              ) : future.map(v => {
                const g: any = v.giocatori
                return (
                  <div key={v.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 44, textAlign: 'center', padding: '4px 0', borderRadius: 6, background: 'var(--accent-blue-lt)', color: 'var(--accent-blue)', flexShrink: 0 }}>
                      <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase' }}>{new Date(v.data).toLocaleDateString('it-IT', { month: 'short' })}</div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{new Date(v.data).getDate()}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{g?.cognome} {g?.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.tipo?.replace('_', ' ')}{v.struttura && ` · ${v.struttura}`}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Effettuate ({passate.length})
              </div>
              {passate.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nessuno storico</div>
              ) : passate.slice(0, 15).map(v => {
                const g: any = v.giocatori
                return (
                  <div key={v.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{g?.cognome} {g?.nome}</span>
                      {v.esito && <span className={`badge ${esitoBadge[v.esito] ?? 'badge-grigio'}`}>{v.esito.replace('_', ' ')}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {v.tipo?.replace('_', ' ')} · {new Date(v.data).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <Link href="/dashboard/medico" className="btn btn-secondary btn-sm">← Dashboard</Link>
          </div>

          {clubId && (
            <FormVisita
              open={openDrawer}
              onClose={() => setOpenDrawer(false)}
              clubId={clubId}
              onSuccess={() => setRefresh(r => r + 1)}
            />
          )}
        </div>
    </FeatureGate>
  )
}
