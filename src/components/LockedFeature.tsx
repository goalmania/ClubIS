'use client'
import { useState } from 'react'
import UpgradeModal from '@/components/UpgradeModal'

interface LockedFeatureProps {
  requiredPlan: string
  children: React.ReactNode
}

export default function LockedFeature({ requiredPlan, children }: LockedFeatureProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        style={{ position: 'relative', cursor: 'pointer' }}
        onClick={() => setShowModal(true)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowModal(true) }}
        aria-label={`Funzione disponibile dal piano ${requiredPlan}. Clicca per saperne di più.`}
      >
        {/* Contenuto dimmerato e non interagibile */}
        <div style={{ opacity: 0.3, pointerEvents: 'none', userSelect: 'none' }}>
          {children}
        </div>

        {/* Overlay lucchetto centrato */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            background: 'var(--bg-card)', border: '1px solid rgba(200,240,0,0.35)',
            padding: '14px 22px',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--accent)', letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              Piano {requiredPlan}
            </span>
          </div>
        </div>
      </div>

      {showModal && (
        <UpgradeModal requiredPlan={requiredPlan} onClose={() => setShowModal(false)} />
      )}
    </>
  )
}
