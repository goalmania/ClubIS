'use client'
import { useState } from 'react'
import Link from 'next/link'
import { STEPS_ONBOARDING, useOnboarding } from '@/hooks/useOnboarding'

export default function OnboardingBanner({ clubId }: { clubId: string }) {
  const { stepsCompletati, onboardingCompletato, completaStep, loading } = useOnboarding(clubId)
  const [minimizzato, setMinimizzato] = useState(false)

  if (loading || onboardingCompletato) return null

  const percCompl    = Math.round(stepsCompletati.length / STEPS_ONBOARDING.length * 100)
  const prossimoStep = STEPS_ONBOARDING.find(s => !stepsCompletati.includes(s.step))

  /* ── Versione minimizzata ── */
  if (minimizzato) return (
    <div style={{
      margin: '0 0 16px 0', padding: '10px 16px',
      background: 'rgba(200,240,0,0.06)',
      border: '1px solid rgba(200,240,0,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
          letterSpacing: '0.15em', color: 'var(--accent)', textTransform: 'uppercase',
        }}>
          SETUP {percCompl}% completato
        </span>
        <div style={{ width: 80, height: 4, background: 'var(--gray-mid)' }}>
          <div style={{ height: '100%', width: `${percCompl}%`, background: 'var(--accent)' }} />
        </div>
      </div>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setMinimizzato(false)}
        style={{ fontSize: 11 }}
      >
        Continua setup →
      </button>
    </div>
  )

  /* ── Versione espansa ── */
  return (
    <div style={{
      marginBottom: 20,
      border: '1px solid rgba(200,240,0,0.3)',
      background: 'rgba(200,240,0,0.04)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid rgba(200,240,0,0.2)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 900,
            textTransform: 'uppercase', fontSize: 14, color: 'var(--accent)',
          }}>
            🚀 Configurazione ClubIS — {percCompl}% completato
          </div>
          <div style={{
            fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)',
            marginTop: 3, letterSpacing: '0.1em',
          }}>
            {stepsCompletati.length}/{STEPS_ONBOARDING.length} PASSI COMPLETATI
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setMinimizzato(true)}
          style={{ fontSize: 11, color: 'var(--gray)' }}
        >
          Minimizza
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--gray-mid)' }}>
        <div style={{
          height: '100%', width: `${percCompl}%`,
          background: 'var(--accent)', transition: 'width 0.5s ease',
        }} />
      </div>

      {/* Step list */}
      <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {STEPS_ONBOARDING.map(step => {
          const completato = stepsCompletati.includes(step.step)
          const isCurrent  = prossimoStep?.step === step.step

          return (
            <div
              key={step.step}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px',
                background: isCurrent ? 'rgba(200,240,0,0.06)' : 'transparent',
                border: isCurrent ? '1px solid rgba(200,240,0,0.2)' : '1px solid transparent',
                opacity: completato ? 0.5 : 1,
              }}
            >
              {/* Indicatore step */}
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: completato
                  ? 'var(--accent)'
                  : isCurrent ? 'rgba(200,240,0,0.2)' : 'var(--gray-mid)',
                border: completato
                  ? 'none'
                  : `1px solid ${isCurrent ? 'var(--accent)' : 'var(--border)'}`,
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 11,
                color: completato ? '#000' : isCurrent ? 'var(--accent)' : 'var(--gray)',
              }}>
                {completato ? '✓' : step.step}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.06em',
                  color: completato ? 'var(--gray)' : 'var(--white)',
                }}>
                  {step.icona} {step.titolo}
                </div>
                {!completato && (
                  <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>
                    {step.descrizione}
                  </div>
                )}
              </div>

              {!completato && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Link
                    href={step.href}
                    onClick={() => completaStep(step.step)}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: 11 }}
                  >
                    {step.azione}
                  </Link>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => completaStep(step.step)}
                    style={{ fontSize: 10, color: 'var(--gray)' }}
                  >
                    Salta
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
