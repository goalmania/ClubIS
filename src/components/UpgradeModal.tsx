'use client'
import { useEffect } from 'react'

interface UpgradeModalProps {
  requiredPlan: string
  onClose: () => void
}

export default function UpgradeModal({ requiredPlan, onClose }: UpgradeModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          padding: '32px 36px', maxWidth: 440, width: '90%',
          display: 'flex', flexDirection: 'column', gap: 22,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(200,240,0,0.1)', border: '1px solid rgba(200,240,0,0.3)',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 900,
            textTransform: 'uppercase', fontSize: 15, letterSpacing: '0.04em',
            color: 'var(--white)',
          }}>
            Funzione bloccata
          </div>
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 13,
          color: 'var(--text-secondary)', lineHeight: 1.65,
        }}>
          Questa funzione è disponibile dal piano{' '}
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{requiredPlan}</span>.
          Aggiorna il tuo abbonamento per sbloccarla.
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href="https://dmfootballservices.com/abbonamenti"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ flex: 1, textAlign: 'center', fontSize: 13 }}
          >
            Aggiorna il piano →
          </a>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ fontSize: 13 }}
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
