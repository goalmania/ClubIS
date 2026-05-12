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
        .select('id, nome, citta, plan_status, plan_tier, trial_ends_at, current_period_end, dmscout_abbonamento_attivo, dmscout_abbonamento_scadenza, attivo')
        .order('nome')
      setClubs(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const cambiaStato = async (id: string, plan_status: string, plan_tier: string) => {
    await supabase.from('clubs').update({ plan_status, plan_tier }).eq('id', id)
    setClubs(prev => prev.map(c => c.id === id ? { ...c, plan_status, plan_tier } : c))
    setToast('Piano aggiornato')
    setTimeout(() => setToast(''), 3000)
  }

  const oggi = new Date()

  const trialAttivi = clubs.filter(c => c.plan_status === 'trial' && c.trial_ends_at && new Date(c.trial_ends_at) > oggi)
  const trialScaduti = clubs.filter(c => c.plan_status === 'trial' && c.trial_ends_at && new Date(c.trial_ends_at) <= oggi)
  const abbonatiAttivi = clubs.filter(c => c.plan_status === 'active')
  const scaduti = clubs.filter(c => c.plan_status === 'expired' || c.plan_status === 'inactive')

  function statoClubIS(c: any) {
    if (c.plan_status === 'trial') {
      const gg = c.trial_ends_at
        ? Math.ceil((new Date(c.trial_ends_at).getTime() - oggi.getTime()) / 86400000)
        : null
      if (gg !== null && gg > 0) return { label: `Trial (${gg}gg)`, cls: 'badge-ambra' }
      return { label: 'Trial scaduto', cls: 'badge-rosso' }
    }
    if (c.plan_status === 'active') return { label: 'Attivo', cls: 'badge-verde' }
    if (c.plan_status === 'expired') return { label: 'Scaduto', cls: 'badge-rosso' }
    return { label: 'Inattivo', cls: 'badge-grigio' }
  }

  function statoDMScout(c: any) {
    if (!c.dmscout_abbonamento_attivo) return { label: 'Non attivo', cls: 'badge-grigio' }
    if (c.dmscout_abbonamento_scadenza && new Date(c.dmscout_abbonamento_scadenza) < oggi)
      return { label: 'Scaduto', cls: 'badge-rosso' }
    const gg = c.dmscout_abbonamento_scadenza
      ? Math.ceil((new Date(c.dmscout_abbonamento_scadenza).getTime() - oggi.getTime()) / 86400000)
      : null
    if (gg !== null && gg <= 7) return { label: `Attivo (${gg}gg)`, cls: 'badge-ambra' }
    return { label: 'Attivo', cls: 'badge-verde' }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Gestione Abbonamenti</h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 2 }}>
          {clubs.length} club — {abbonatiAttivi.length} attivi · {trialAttivi.length} in trial · {scaduti.length + trialScaduti.length} scaduti
        </p>
      </div>

      {/* Sommario */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Attivi', valore: abbonatiAttivi.length, cls: 'badge-verde' },
          { label: 'In trial', valore: trialAttivi.length, cls: 'badge-ambra' },
          { label: 'Trial scaduto', valore: trialScaduti.length, cls: 'badge-rosso' },
          { label: 'Scaduti/Inattivi', valore: scaduti.length, cls: 'badge-rosso' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.valore}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 14 }}>Caricamento...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Club</th>
                  <th>Città</th>
                  <th>ClubIS</th>
                  <th>Piano</th>
                  <th>Scadenza ClubIS</th>
                  <th>DM Scout</th>
                  <th>Scadenza DM Scout</th>
                  <th>Modifica piano</th>
                </tr>
              </thead>
              <tbody>
                {clubs.map(c => {
                  const cs = statoClubIS(c)
                  const ds = statoDMScout(c)
                  const scadenzaClubIS = c.plan_status === 'trial' ? c.trial_ends_at : c.current_period_end
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.nome}</td>
                      <td style={{ fontSize: 13, color: 'var(--grigio-3)' }}>{c.citta}</td>
                      <td><span className={`badge ${cs.cls}`}>{cs.label}</span></td>
                      <td>
                        <span className={`badge ${c.plan_tier === 'elite' ? 'badge-viola' : c.plan_tier === 'pro' ? 'badge-blu' : 'badge-grigio'}`}>
                          {c.plan_tier ?? '—'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {scadenzaClubIS ? new Date(scadenzaClubIS).toLocaleDateString('it-IT') : '—'}
                      </td>
                      <td><span className={`badge ${ds.cls}`}>{ds.label}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {c.dmscout_abbonamento_scadenza
                          ? new Date(c.dmscout_abbonamento_scadenza).toLocaleDateString('it-IT')
                          : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <select
                            className="input"
                            style={{ width: 90, padding: '4px 8px', fontSize: 12 }}
                            value={c.plan_tier ?? 'starter'}
                            onChange={e => cambiaStato(c.id, c.plan_status, e.target.value)}
                          >
                            <option value="starter">Starter</option>
                            <option value="pro">Pro</option>
                            <option value="elite">Elite</option>
                          </select>
                          <select
                            className="input"
                            style={{ width: 90, padding: '4px 8px', fontSize: 12 }}
                            value={c.plan_status ?? 'inactive'}
                            onChange={e => cambiaStato(c.id, e.target.value, c.plan_tier ?? 'starter')}
                          >
                            <option value="trial">Trial</option>
                            <option value="active">Active</option>
                            <option value="expired">Expired</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
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
