'use client'
import { useState } from 'react'

export default function InfoTooltip({ testo }: { testo: string }) {
  const [visible, setVisible] = useState(false)

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        onClick={() => setVisible(v => !v)}
        title="Cosa fa questa sezione?"
        style={{
          width: 18, height: 18, borderRadius: '50%',
          background: visible ? 'rgba(200,240,0,0.15)' : 'var(--gray-light)',
          border: `1px solid ${visible ? 'var(--accent)' : 'var(--border-solid)'}`,
          cursor: 'pointer',
          color: visible ? 'var(--accent)' : 'var(--gray)',
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'background 0.15s, border-color 0.15s, color 0.15s',
          padding: 0,
        }}
      >
        ?
      </button>

      {visible && (
        <>
          {/* Overlay trasparente per chiudere cliccando fuori */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 100 }}
            onClick={() => setVisible(false)}
          />
          {/* Tooltip bubble */}
          <div style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1a1a1a',
            border: '1px solid var(--border-solid)',
            padding: '12px 14px',
            borderRadius: 2,
            zIndex: 101,
            width: 260,
            fontSize: 12,
            color: 'var(--gray)',
            lineHeight: 1.7,
            fontFamily: 'var(--font-sans)',
            fontWeight: 300,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
          }}>
            {/* Freccia */}
            <div style={{
              position: 'absolute', bottom: -5, left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: 8, height: 8,
              background: '#1a1a1a',
              border: '1px solid var(--border-solid)',
              borderTop: 'none', borderLeft: 'none',
            }} />
            {testo}
            <div style={{
              fontSize: 9, color: 'var(--accent)', marginTop: 8,
              fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
              letterSpacing: '0.15em',
            }}>
              Clicca fuori per chiudere
            </div>
          </div>
        </>
      )}
    </div>
  )
}
