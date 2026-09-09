'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal, Toast } from '@/components/ui'

type Props = {
  /** true = il club ha una subscription Stripe (rinnovo gestibile via toggle) */
  hasStripeSubscription: boolean
  /** true = il titolare ha già disattivato il rinnovo automatico */
  cancelAtPeriodEnd: boolean
  /** ISO date di fine periodo corrente */
  currentPeriodEnd: string | null
  /** true = scuola calcio standalone (piano unico) */
  isScuolaCalcio: boolean
}

function formatData(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function RinnovoAutomaticoControls({
  hasStripeSubscription,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  isScuolaCalcio,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [annuale, setAnnuale] = useState(false)
  // Se un PATCH scopre che la subscription Stripe non esiste più, passiamo
  // al flusso di ri-attivazione via checkout.
  const [forceActivate, setForceActivate] = useState(false)

  const mostraAttiva = !hasStripeSubscription || forceActivate

  async function patchRinnovo(azione: 'disattiva' | 'riattiva') {
    setLoading(true)
    try {
      const res = await fetch('/api/abbonamento/rinnovo-automatico', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ azione }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409 && data.error === 'no_stripe_subscription') {
        setForceActivate(true)
        setToast({ msg: 'Nessun metodo di pagamento collegato — attiva il rinnovo qui sotto', tipo: 'error' })
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Errore')
      setToast({
        msg: azione === 'disattiva' ? 'Rinnovo automatico disattivato' : 'Rinnovo automatico riattivato',
        tipo: 'success',
      })
      router.refresh()
    } catch (e) {
      setToast({ msg: (e as Error).message || 'Errore, riprova', tipo: 'error' })
    } finally {
      setLoading(false)
      setConfirmOpen(false)
    }
  }

  async function attivaRinnovo() {
    setLoading(true)
    try {
      const res = await fetch('/api/abbonamento/rinnovo-automatico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing: annuale ? 'annual' : 'monthly' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Errore nella creazione del pagamento')
      window.location.href = data.url
    } catch (e) {
      setToast({ msg: (e as Error).message || 'Errore, riprova', tipo: 'error' })
      setLoading(false)
    }
  }

  const boxStyle: React.CSSProperties = {
    padding: '14px 16px',
    borderRadius: 8,
    border: '1px solid var(--border-solid)',
    background: 'var(--gray-light)',
  }

  return (
    <div style={boxStyle}>
      <div style={{
        fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
      }}>
        Rinnovo automatico
      </div>

      {/* ── Caso 1: subscription attiva, rinnovo ON ── */}
      {!mostraAttiva && !cancelAtPeriodEnd && (
        <>
          <div style={{ fontSize: 14, color: 'var(--white)', fontWeight: 600, marginBottom: 4 }}>
            Attivo
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 12 }}>
            Prossimo rinnovo il {formatData(currentPeriodEnd)}. L&apos;addebito è automatico sulla carta registrata.
          </div>
          <button
            className="btn btn-secondary btn-sm"
            disabled={loading}
            onClick={() => setConfirmOpen(true)}
          >
            Disattiva rinnovo automatico
          </button>
        </>
      )}

      {/* ── Caso 2: subscription attiva, rinnovo disdetto ── */}
      {!mostraAttiva && cancelAtPeriodEnd && (
        <>
          <div style={{ fontSize: 14, color: 'var(--ambra)', fontWeight: 600, marginBottom: 4 }}>
            Disattivato
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 12 }}>
            L&apos;accesso resta attivo fino al {formatData(currentPeriodEnd)}, poi l&apos;abbonamento non si rinnova.
          </div>
          <button
            className="btn btn-primary btn-sm"
            disabled={loading}
            onClick={() => patchRinnovo('riattiva')}
          >
            {loading ? 'Attendi…' : 'Riattiva rinnovo automatico'}
          </button>
        </>
      )}

      {/* ── Caso 3: nessuna carta collegata ── */}
      {mostraAttiva && (
        <>
          <div style={{ fontSize: 14, color: 'var(--white)', fontWeight: 600, marginBottom: 4 }}>
            Non attivo
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 12 }}>
            Collega una carta per il rinnovo automatico. Se hai ancora periodo pagato, il primo addebito parte solo alla scadenza — nessun doppio pagamento.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {!isScuolaCalcio && (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gray)' }}>
                <input
                  type="checkbox"
                  checked={annuale}
                  onChange={e => setAnnuale(e.target.checked)}
                />
                Fatturazione annuale (−15%)
              </label>
            )}
            <button
              className="btn btn-primary btn-sm"
              disabled={loading}
              onClick={attivaRinnovo}
            >
              {loading ? 'Attendi…' : 'Attiva rinnovo automatico →'}
            </button>
          </div>
        </>
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Disattiva rinnovo automatico">
        <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 20 }}>
          L&apos;abbonamento resta attivo con tutti i dati fino al{' '}
          <strong style={{ color: 'var(--white)' }}>{formatData(currentPeriodEnd)}</strong>.
          Dopo quella data non verrà rinnovato e l&apos;accesso sarà sospeso finché non riattivi.
          Puoi riattivare il rinnovo in qualsiasi momento da questa pagina.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" disabled={loading} onClick={() => setConfirmOpen(false)}>
            Annulla
          </button>
          <button className="btn btn-danger btn-sm" disabled={loading} onClick={() => patchRinnovo('disattiva')}>
            {loading ? 'Attendi…' : 'Disattiva'}
          </button>
        </div>
      </Modal>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
