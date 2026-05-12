import Link from 'next/link'

interface UpgradeBannerProps {
  feature: string
  requiredPlan: string
}

export default function UpgradeBanner({ feature, requiredPlan }: UpgradeBannerProps) {
  return (
    <div style={{
      border: '1px solid rgba(200,240,0,0.25)',
      background: 'rgba(200,240,0,0.04)',
      padding: '24px 28px',
      display: 'flex',
      alignItems: 'center',
      gap: 20,
    }}>
      {/* Icona lucchetto */}
      <div style={{
        width: 48, height: 48, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(200,240,0,0.1)',
        border: '1px solid rgba(200,240,0,0.3)',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 900,
          textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.04em',
          color: 'var(--white)', marginBottom: 4,
        }}>
          {feature}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Questa funzione è disponibile dal piano{' '}
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{requiredPlan}</span>.
          Aggiorna il tuo abbonamento per sbloccarla.
        </div>
      </div>

      <Link
        href="https://dmfootballservices.com/abbonamenti"
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary"
        style={{ flexShrink: 0, fontSize: 13 }}
      >
        Aggiorna il piano →
      </Link>
    </div>
  )
}
