'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import FormInfortunio from '@/components/forms/FormInfortunio'

export default function MedicoInfortuniPage() {
  const supabase = createClient()
  const [clubId, setClubId] = useState<string | null>(null)
  const [infortuni, setInfortuni] = useState<any[]>([])
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
        .from('infortuni')
        .select('id, tipo, zona_corpo, gravita, data_infortunio, data_rientro_prevista, data_rientro_effettiva, diagnosi, terapia, giocatori(nome, cognome, ruolo_principale)')
        .eq('club_id', utente.club_id)
        .order('data_infortunio', { ascending: false })
      setInfortuni(data ?? [])
      setLoading(false)
    }
    init()
  }, [refresh])

  const attivi = infortuni.filter(i => !i.data_rientro_effettiva)
  const risolti = infortuni.filter(i => i.data_rientro_effettiva)

  const gravitaColore: Record<string, string> = {
    lieve: 'badge-verde', moderato: 'badge-ambra', grave: 'badge-rosso',
  }

  const renderRow = (i: any) => {
    const g = i.giocatori as any
    const gg = i.data_infortunio && i.data_rientro_prevista
      ? Math.ceil((new Date(i.data_rientro_prevista).getTime() - new Date(i.data_infortunio).getTime()) / 86400000)
      : null
    return (
      <div key={i.id} style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className={`badge ${gravitaColore[i.gravita] ?? 'badge-grigio'}`}>{i.gravita}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {g?.cognome} {g?.nome}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              ({g?.ruolo_principale?.replace('_', ' ')})
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {new Date(i.data_infortunio).toLocaleDateString('it-IT')}
          </span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 3 }}>
          <strong>{i.tipo}</strong>{i.zona_corpo && ` — ${i.zona_corpo.replace('_', ' ')}`}
        </div>
        {i.diagnosi && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Diagnosi: {i.diagnosi}</div>}
        {i.terapia && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Terapia: {i.terapia}</div>}
        {i.data_rientro_prevista && !i.data_rientro_effettiva && (
          <div style={{ fontSize: 12, color: 'var(--accent-blue)', marginTop: 4 }}>
            Rientro previsto: {new Date(i.data_rientro_prevista).toLocaleDateString('it-IT')}
            {gg !== null && <> · {gg} giorni stimati</>}
          </div>
        )}
        {i.data_rientro_effettiva && (
          <div style={{ fontSize: 12, color: 'var(--accent-green)', marginTop: 4 }}>
            ✓ Rientrato il {new Date(i.data_rientro_effettiva).toLocaleDateString('it-IT')}
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Caricamento…</div>

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Infortuni</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Registro e tracking recupero</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setOpenDrawer(true)}>
          + Registra infortunio
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Totale</div>
          <div className="stat-value">{infortuni.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Attivi</div>
          <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{attivi.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Risolti</div>
          <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{risolti.length}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600, color: 'var(--accent-red)' }}>
            In corso ({attivi.length})
          </div>
          {attivi.length === 0
            ? <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nessun infortunio attivo</div>
            : attivi.map(renderRow)}
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600, color: 'var(--accent-green)' }}>
            Storico ({risolti.length})
          </div>
          {risolti.length === 0
            ? <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nessun caso archiviato</div>
            : risolti.slice(0, 10).map(renderRow)}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <Link href="/dashboard/medico" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>

      {clubId && (
        <FormInfortunio
          open={openDrawer}
          onClose={() => setOpenDrawer(false)}
          clubId={clubId}
          onSuccess={() => setRefresh(r => r + 1)}
        />
      )}
    </div>
  )
}
