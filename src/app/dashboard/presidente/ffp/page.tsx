import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function FFPBudgetPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: utente, error: utenteError } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (utenteError || !utente) redirect('/auth/errore')
  const clubId = utente.club_id

  const { data: movimenti } = await supabase
    .from('prima_nota')
    .select('tipo, importo, categoria, data, descrizione')
    .eq('club_id', clubId)
    .order('data', { ascending: false })

  const fmt = (n: number) =>
    n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  const totEntrate = movimenti?.filter(m => m.tipo === 'entrata').reduce((s, m) => s + Number(m.importo), 0) ?? 0
  const totUscite  = movimenti?.filter(m => m.tipo === 'uscita').reduce((s, m) => s + Number(m.importo), 0) ?? 0
  const saldo      = totEntrate - totUscite
  const ffpRatio   = totEntrate > 0 ? ((totUscite / totEntrate) * 100).toFixed(1) : '0.0'
  const ffpOk      = totUscite <= totEntrate

  // Group by category
  const catEntrate: Record<string, number> = {}
  const catUscite:  Record<string, number> = {}
  movimenti?.forEach(m => {
    const cat = m.categoria ?? 'altro'
    if (m.tipo === 'entrata') catEntrate[cat] = (catEntrate[cat] ?? 0) + Number(m.importo)
    else catUscite[cat] = (catUscite[cat] ?? 0) + Number(m.importo)
  })

  const entrateRows = Object.entries(catEntrate).sort((a, b) => b[1] - a[1])
  const usciteRows  = Object.entries(catUscite).sort((a, b) => b[1] - a[1])

  const barW = (val: number, max: number) => max > 0 ? Math.max(2, (val / max) * 100) : 2
  const maxEntrata = Math.max(...Object.values(catEntrate), 1)
  const maxUscita  = Math.max(...Object.values(catUscite), 1)

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>FFP / Budget</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Fair Play Finanziario — panoramica entrate vs uscite per categoria
        </p>
      </div>

      {/* FFP Status Alert */}
      <div
        data-onboarding="section-ffp-banner"
        className={ffpOk ? 'alert alert-success' : 'alert alert-danger'}
        style={{ marginBottom: 20 }}
      >
        {ffpOk
          ? `Situazione FFP positiva — le uscite coprono il ${ffpRatio}% delle entrate`
          : `Attenzione: le uscite (${fmt(totUscite)}) superano le entrate (${fmt(totEntrate)})`
        }
      </div>

      {/* KPI stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Budget Totale Entrate</div>
          <div className="stat-value" style={{ fontSize: 22, color: 'var(--accent-green)' }}>{fmt(totEntrate)}</div>
          <div className="stat-sub">{movimenti?.filter(m => m.tipo === 'entrata').length ?? 0} movimenti</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Totale Uscite</div>
          <div className="stat-value" style={{ fontSize: 22, color: 'var(--accent-red)' }}>{fmt(totUscite)}</div>
          <div className="stat-sub">{movimenti?.filter(m => m.tipo === 'uscita').length ?? 0} movimenti</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Saldo Netto</div>
          <div
            className="stat-value"
            style={{ fontSize: 22, color: saldo >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
          >
            {saldo >= 0 ? '+' : ''}{fmt(saldo)}
          </div>
          <div className="stat-sub">entrate - uscite</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Indice FFP</div>
          <div
            className="stat-value"
            style={{ fontSize: 22, color: ffpOk ? 'var(--accent-green)' : 'var(--accent-red)' }}
          >
            {ffpRatio}%
          </div>
          <div className="stat-sub">uscite / entrate</div>
        </div>
      </div>

      {/* FFP Progress bar */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Rapporto Uscite / Entrate</span>
          <span style={{ fontSize: 13, color: ffpOk ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
            {ffpRatio}% {ffpOk ? '— In regola' : '— Fuori soglia'}
          </span>
        </div>
        <div style={{ height: 10, background: 'var(--bg-input)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(Number(ffpRatio), 100)}%`,
            background: ffpOk ? 'var(--accent-green)' : 'var(--accent-red)',
            borderRadius: 6,
            transition: 'width 0.4s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>0%</span>
          <span style={{ fontSize: 11, color: 'var(--accent-orange)' }}>Soglia 100%</span>
        </div>
      </div>

      {/* Category tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Entrate per categoria */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            fontSize: 14, fontWeight: 600,
            color: 'var(--accent-green)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>Entrate per categoria</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt(totEntrate)}</span>
          </div>
          {entrateRows.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nessuna entrata registrata
            </div>
          )}
          {entrateRows.map(([cat, imp]) => (
            <div key={cat} style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--border-light)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  {cat.replace(/_/g, ' ')}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--accent-green)' }}>
                  {fmt(imp)}
                </span>
              </div>
              <div style={{ height: 4, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${barW(imp, maxEntrata)}%`,
                  background: 'var(--accent-green)',
                  borderRadius: 3,
                }} />
              </div>
            </div>
          ))}
          {entrateRows.length > 0 && (
            <div style={{
              padding: '11px 18px',
              display: 'flex', justifyContent: 'space-between',
              background: 'var(--accent-green-lt)',
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Totale</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--accent-green)' }}>{fmt(totEntrate)}</span>
            </div>
          )}
        </div>

        {/* Uscite per categoria */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            fontSize: 14, fontWeight: 600,
            color: 'var(--accent-red)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>Uscite per categoria</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt(totUscite)}</span>
          </div>
          {usciteRows.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nessuna uscita registrata
            </div>
          )}
          {usciteRows.map(([cat, imp]) => (
            <div key={cat} style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--border-light)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  {cat.replace(/_/g, ' ')}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--accent-red)' }}>
                  {fmt(imp)}
                </span>
              </div>
              <div style={{ height: 4, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${barW(imp, maxUscita)}%`,
                  background: 'var(--accent-red)',
                  borderRadius: 3,
                }} />
              </div>
            </div>
          ))}
          {usciteRows.length > 0 && (
            <div style={{
              padding: '11px 18px',
              display: 'flex', justifyContent: 'space-between',
              background: 'var(--accent-red-lt)',
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-red)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Totale</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--accent-red)' }}>{fmt(totUscite)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary footer card */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Riepilogo Finanziario
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
          {[
            { label: 'Budget Entrate', value: fmt(totEntrate), color: 'var(--accent-green)' },
            { label: 'Totale Uscite', value: fmt(totUscite), color: 'var(--accent-red)' },
            { label: 'Residuo', value: fmt(Math.max(saldo, 0)), color: saldo >= 0 ? 'var(--accent-blue)' : 'var(--accent-red)' },
          ].map((item, i) => (
            <div
              key={item.label}
              style={{
                padding: '14px 20px',
                borderRight: i < 2 ? '1px solid var(--border)' : undefined,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: item.color, fontFamily: 'var(--font-mono)' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
