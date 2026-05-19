'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useOnboarding } from '@/lib/onboarding/OnboardingContext'

interface TooltipPos {
  top: number
  left: number
}

function calcPosition(
  targetEl: Element,
  tooltipW: number,
  tooltipH: number
): TooltipPos {
  const rect = targetEl.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const gap = 14

  // below
  if (rect.bottom + tooltipH + gap < vh) {
    return {
      top: rect.bottom + gap,
      left: Math.min(Math.max(rect.left, 16), vw - tooltipW - 16),
    }
  }
  // above
  if (rect.top - tooltipH - gap > 0) {
    return {
      top: rect.top - tooltipH - gap,
      left: Math.min(Math.max(rect.left, 16), vw - tooltipW - 16),
    }
  }
  // right
  if (rect.right + tooltipW + gap < vw) {
    return {
      top: Math.min(Math.max(rect.top, 16), vh - tooltipH - 16),
      left: rect.right + gap,
    }
  }
  // left
  if (rect.left - tooltipW - gap > 0) {
    return {
      top: Math.min(Math.max(rect.top, 16), vh - tooltipH - 16),
      left: rect.left - tooltipW - gap,
    }
  }
  // center fallback
  return {
    top: Math.max((vh - tooltipH) / 2, 16),
    left: Math.max((vw - tooltipW) / 2, 16),
  }
}

export default function OnboardingTooltip() {
  const {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    phase,
    goToGuide,
    nextStep,
    skipStep,
    skipAll,
    confirmSkipAll,
    setConfirmSkipAll,
  } = useOnboarding()

  const pathname = usePathname()
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<TooltipPos | null>(null)
  const [visible, setVisible] = useState(false)
  const highlightedEl = useRef<Element | null>(null)

  const clearHighlight = useCallback(() => {
    if (highlightedEl.current) {
      highlightedEl.current.classList.remove('onboarding-spotlight')
      ;(highlightedEl.current as HTMLElement).style.removeProperty('position')
      ;(highlightedEl.current as HTMLElement).style.removeProperty('z-index')
      highlightedEl.current = null
    }
  }, [])

  const positionTooltip = useCallback(() => {
    if (!currentStep || phase !== 'guide') return
    const targetEl = document.querySelector(currentStep.targetSelector)
    const tooltipEl = tooltipRef.current
    if (!tooltipEl) return

    clearHighlight()

    if (targetEl) {
      ;(targetEl as HTMLElement).style.position = 'relative'
      ;(targetEl as HTMLElement).style.zIndex = '10000'
      targetEl.classList.add('onboarding-spotlight')
      highlightedEl.current = targetEl
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => {
        const tw = tooltipEl.offsetWidth || 340
        const th = tooltipEl.offsetHeight || 180
        setPos(calcPosition(targetEl, tw, th))
      }, 350)
    } else {
      const tw = tooltipEl.offsetWidth || 340
      const th = tooltipEl.offsetHeight || 180
      const vw = window.innerWidth
      const vh = window.innerHeight
      setPos({
        top: Math.max((vh - th) / 2, 16),
        left: Math.max((vw - tw) / 2, 16),
      })
    }
  }, [currentStep, phase, clearHighlight])

  // Fade-in whenever step or phase changes
  useEffect(() => {
    if (!isActive || !currentStep) {
      setVisible(false)
      return
    }
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [isActive, currentStep, phase])

  // Apply spotlight when in guide phase (or when pathname changes)
  useEffect(() => {
    if (!isActive || !currentStep || phase !== 'guide') {
      clearHighlight()
      return
    }
    positionTooltip()
  }, [isActive, currentStep, phase, pathname, positionTooltip, clearHighlight])

  useEffect(() => () => clearHighlight(), [clearHighlight])

  if (!isActive || !currentStep) return null

  const progress = ((currentStepIndex + 1) / totalSteps) * 100

  const guideStyle: React.CSSProperties = pos
    ? { top: pos.top, left: pos.left }
    : { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    width: 340,
    maxWidth: 'calc(100vw - 32px)',
    background: '#000',
    border: '1px solid rgba(200,240,0,0.4)',
    borderRadius: 16,
    padding: '18px 20px 14px',
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.97)',
    transition: 'opacity 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
    ...(phase === 'problem' ? { bottom: 24, right: 24 } : guideStyle),
  }

  return (
    <>
      {/* Dim overlay in guide phase */}
      {phase === 'guide' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0)',
            zIndex: 9998,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Skip-all confirm dialog */}
      {confirmSkipAll && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.72)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#000',
              border: '1px solid rgba(200,240,0,0.4)',
              borderRadius: 16,
              padding: '28px 32px',
              width: 340,
              maxWidth: '90vw',
            }}
          >
            <div style={{ color: '#c8f000', fontWeight: 700, fontSize: 15, marginBottom: 10 }}>
              Saltare tutta la guida?
            </div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1.5, margin: '0 0 20px' }}>
              Potrai sempre trovare aiuto nella documentazione. L&apos;onboarding non verrà più mostrato.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={skipAll}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 13,
                  padding: '9px 0',
                  cursor: 'pointer',
                }}
              >
                Sì, salta tutto
              </button>
              <button
                onClick={() => setConfirmSkipAll(false)}
                style={{
                  flex: 1,
                  background: '#c8f000',
                  border: 'none',
                  borderRadius: 8,
                  color: '#000',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '9px 0',
                  cursor: 'pointer',
                }}
              >
                Continua la guida
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip card */}
      <div ref={tooltipRef} className="onboarding-tooltip-card" style={tooltipStyle}>
        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div
            style={{
              flex: 1,
              height: 3,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 99,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: '#c8f000',
                borderRadius: 99,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
            {currentStepIndex + 1} di {totalSteps}
          </span>
        </div>

        {phase === 'problem' ? (
          <ProblemPhase
            step={currentStep}
            onDiscover={goToGuide}
            onSkip={skipStep}
            onSkipAll={() => setConfirmSkipAll(true)}
          />
        ) : (
          <GuidePhase
            step={currentStep}
            onNext={nextStep}
            onDone={() => setConfirmSkipAll(true)}
          />
        )}
      </div>
    </>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

type Step = NonNullable<ReturnType<typeof useOnboarding>['currentStep']>

function ProblemPhase({
  step,
  onDiscover,
  onSkip,
  onSkipAll,
}: {
  step: Step
  onDiscover: () => void
  onSkip: () => void
  onSkipAll: () => void
}) {
  return (
    <>
      <div style={{ color: '#c8f000', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
        💡 Lo sapevi?
      </div>
      <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 1.55, margin: '0 0 10px' }}>
        {step.problem}
      </p>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: '0 0 16px' }}>
        ClubIS risolve questo con:{' '}
        <span style={{ color: '#c8f000', fontWeight: 700 }}>✦ {step.title}</span>
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onDiscover}
            style={{
              background: '#c8f000',
              border: 'none',
              borderRadius: 8,
              color: '#000',
              fontWeight: 700,
              fontSize: 12,
              padding: '8px 14px',
              cursor: 'pointer',
            }}
          >
            Scopri come →
          </button>
          <button
            onClick={onSkip}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.38)', fontSize: 12, padding: '8px 8px', cursor: 'pointer' }}
          >
            Salta
          </button>
        </div>
        <button
          onClick={onSkipAll}
          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.22)', fontSize: 11, padding: '4px 0', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Salta tutto
        </button>
      </div>
    </>
  )
}

function GuidePhase({
  step,
  onNext,
  onDone,
}: {
  step: Step
  onNext: () => void
  onDone: () => void
}) {
  return (
    <>
      <div style={{ color: '#c8f000', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
        👆 Inizia da qui — {step.title}
      </div>
      <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 1.55, margin: '0 0 16px' }}>
        {step.guideText}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onNext}
          style={{
            background: '#c8f000',
            border: 'none',
            borderRadius: 8,
            color: '#000',
            fontWeight: 700,
            fontSize: 12,
            padding: '8px 14px',
            cursor: 'pointer',
          }}
        >
          Avanti →
        </button>
        <button
          onClick={onDone}
          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 11, padding: '4px 0', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Fine guida
        </button>
      </div>
    </>
  )
}
