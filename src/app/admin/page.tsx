import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ClubListWithViewAs from '@/components/admin/ClubListWithViewAs'

export default async function AdminDashboard() {
  const supabase = createClient()

  const [
    { count: totClub },
    { count: totUtenti },
    { count: totGiocatori },
    { data: clubAll },
    { data: pianiData },
  ] = await Promise.all([
    supabase.from('clubs').select('*', { count: 'exact', head: true }),
    supabase.from('utenti').select('*', { count: 'exact', head: true }),
    supabase.from('tesseramenti').select('*', { count: 'exact', head: true }).eq('stato', 'attivo'),
    supabase.from('clubs').select('id, nome, citta, categoria, piano_abbonamento, created_at, attivo')
      .order('created_at', { ascending: false }),
    supabase.from('clubs').select('piano_abbonamento'),
  ])

  const piani = { base: 0, pro: 0, elite: 0 }
  pianiData?.forEach(c => { if (c.piano_abbonamento in piani) piani[c.piano_abbonamento as keyof typeof piani]++ })

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>Pannello Admin</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Gestione globale ClubIS — The Intelligence System
        </p>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard label="Club attivi" value={totClub ?? 0} />
        <StatCard label="Utenti totali" value={totUtenti ?? 0} />
        <StatCard label="Giocatori tesserati" value={totGiocatori ?? 0} />
        <div className="stat-card">
          <div className="stat-label">Per piano</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <span className="badge badge-grigio">Base: {piani.base}</span>
            <span className="badge badge-blu">Pro: {piani.pro}</span>
            <span className="badge badge-viola">Elite: {piani.elite}</span>
          </div>
        </div>
      </div>

      {/* Club con visualizza come */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Club registrati — Accesso dashboard
            </span>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Clicca "Visualizza come" per entrare nella dashboard di un club con qualsiasi ruolo
            </div>
          </div>
          <Link href="/admin/clubs" style={{ fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>
            Gestisci tutti →
          </Link>
        </div>
        <ClubListWithViewAs clubs={clubAll ?? []} />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  )
}
