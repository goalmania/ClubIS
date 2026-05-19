import { getUserContext } from '@/lib/impersonation'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TrasferteCreateDrawer from './TrasferteCreateDrawer'

export default async function TMTrasfertePage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  const clubId = ctx.clubId
  if (!clubId) redirect('/auth/errore')

  const supabase = createAdminClient()
  const { data: trasferte } = await supabase
    .from('trasferte')
    .select('id, destinazione, data_partenza, data_rientro, mezzo, costo_stimato, costo_effettivo, note, stato, partita_id')
    .eq('club_id', clubId)
    .order('data_partenza', { ascending: false })

  const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  const totStimato = trasferte?.reduce((s, t) => s + Number(t.costo_stimato ?? 0), 0) ?? 0
  const totEffettivo = trasferte?.reduce((s, t) => s + Number(t.costo_effettivo ?? 0), 0) ?? 0

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div data-onboarding="btn-nuova-trasferta" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Trasferte</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Organizzazione e budget degli spostamenti</p>
        </div>
        <TrasferteCreateDrawer />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Totale trasferte</div>
          <div className="stat-value">{trasferte?.length ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Costo stimato</div>
          <div className="stat-value" style={{ fontSize: 22, color: 'var(--accent-orange)' }}>{fmt(totStimato)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Costo effettivo</div>
          <div className="stat-value" style={{ fontSize: 22, color: 'var(--accent-green)' }}>{fmt(totEffettivo)}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {(!trasferte || trasferte.length === 0) ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nessuna trasferta registrata</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)' }}>
                <th style={thStyle}>Destinazione</th>
                <th style={thStyle}>Data</th>
                <th style={thStyle}>Mezzo</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Stimato</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Effettivo</th>
                <th style={thStyle}>Stato</th>
              </tr>
            </thead>
            <tbody>
              {trasferte.map(t => (
                <tr key={t.id} style={{ borderTop: '1px solid var(--border-light)' }}>
                  <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--text-primary)' }}>{t.destinazione}</td>
                  <td style={tdStyle}>
                    {new Date(t.data_partenza).toLocaleDateString('it-IT')}
                    {t.data_rientro && t.data_rientro !== t.data_partenza && <> → {new Date(t.data_rientro).toLocaleDateString('it-IT')}</>}
                  </td>
                  <td style={tdStyle}>{t.mezzo ?? '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {t.costo_stimato ? fmt(Number(t.costo_stimato)) : '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                    {t.costo_effettivo ? fmt(Number(t.costo_effettivo)) : '—'}
                  </td>
                  <td style={tdStyle}>
                    <span className={`badge ${t.stato === 'completata' ? 'badge-verde' : t.stato === 'annullata' ? 'badge-rosso' : 'badge-blu'}`}>
                      {t.stato ?? 'programmata'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <Link href="/dashboard/team-manager" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }
const tdStyle: React.CSSProperties = { padding: '12px 14px', fontSize: 13, color: 'var(--text-secondary)' }
