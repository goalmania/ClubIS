import { createClient } from '@/lib/supabase/server'

export default async function AdminStatistichePage() {
  const supabase = createClient()

  const [
    { data: clubs },
    { data: utenti },
  ] = await Promise.all([
    supabase.from('clubs').select('id, nome, piano_abbonamento, created_at, attivo'),
    supabase.from('utenti').select('id, ruolo, attivo'),
  ])

  // Crescita club per mese (ultimi 12 mesi)
  const mesi = new Map<string, number>()
  const ora = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(ora.getFullYear(), ora.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    mesi.set(key, 0)
  }
  clubs?.forEach(c => {
    const d = new Date(c.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (mesi.has(key)) mesi.set(key, (mesi.get(key) ?? 0) + 1)
  })

  // Utenti per ruolo
  const perRuolo = new Map<string, number>()
  utenti?.forEach(u => {
    if (u.attivo) perRuolo.set(u.ruolo, (perRuolo.get(u.ruolo) ?? 0) + 1)
  })

  const ruoloLabel: Record<string, string> = {
    presidente: 'Presidente', ds: 'Dir. Sportivo', segretario: 'Segretario',
    allenatore: 'Allenatore', osservatore: 'Osservatore', medico: 'Medico', famiglia: 'Famiglia',
  }

  const maxMese = Math.max(...Array.from(mesi.values()), 1)
  const maxRuolo = Math.max(...Array.from(perRuolo.values()), 1)

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Statistiche Globali</h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>Panoramica sull&apos;utilizzo del sistema ClubIS</p>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Club totali</div>
          <div className="stat-value">{clubs?.length ?? 0}</div>
          <div className="stat-sub">{clubs?.filter(c => c.attivo).length ?? 0} attivi</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Utenti attivi</div>
          <div className="stat-value">{utenti?.filter(u => u.attivo).length ?? 0}</div>
          <div className="stat-sub">su {utenti?.length ?? 0} totali</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Media utenti/club</div>
          <div className="stat-value">
            {clubs && clubs.length > 0 ? Math.round((utenti?.length ?? 0) / clubs.length) : 0}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Crescita club */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Nuovi club per mese</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Array.from(mesi.entries()).map(([mese, count]) => (
              <div key={mese} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)', width: 50 }}>{mese}</span>
                <div style={{ flex: 1, height: 18, background: 'var(--grigio-6)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    background: 'var(--verde)',
                    width: `${(count / maxMese) * 100}%`,
                    transition: 'width 0.3s',
                    minWidth: count > 0 ? 4 : 0,
                  }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--grigio-2)', width: 20, textAlign: 'right' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Utenti per ruolo */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Utenti attivi per ruolo</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(ruoloLabel).map(([ruolo, label]) => {
              const count = perRuolo.get(ruolo) ?? 0
              return (
                <div key={ruolo} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--grigio-3)', width: 100 }}>{label}</span>
                  <div style={{ flex: 1, height: 20, background: 'var(--grigio-6)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      background: 'var(--blu)',
                      width: `${(count / maxRuolo) * 100}%`,
                      minWidth: count > 0 ? 4 : 0,
                    }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--grigio-2)', width: 30, textAlign: 'right' }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
