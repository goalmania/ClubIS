'use client'
// src/components/layout/NotificheDropdown.tsx
// Dropdown notifiche real-time con toast per nuove notifiche
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── Correzione URL legacy errati salvati in DB ────────────────────────────────
// Quando un azione_url sbagliato è stato persistito (es. percorso segretario
// anziché team-manager), questa mappa lo reindirizza al percorso corretto
// senza 404 per l'utente.
const URL_CORRECTIONS: Record<string, string> = {
  '/dashboard/segretario/materiale':      '/dashboard/team-manager/materiale',
  '/dashboard/team-manager/comunicazioni':'/dashboard/segretario/comunicazioni',
  '/dashboard/presidente/materiale':      '/dashboard/team-manager/materiale',
}

function urlSicura(url: string | null): string | null {
  if (!url) return null
  return URL_CORRECTIONS[url] ?? url
}

interface Notifica {
  id: string
  tipo: string
  titolo: string
  messaggio: string
  letta: boolean
  azione_url: string | null
  creata_at: string
  ruolo_destinatario: string | null
}

function tempoFa(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Adesso'
  if (m < 60) return `${m}m fa`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h fa`
  return `${Math.floor(h / 24)}g fa`
}

const TIPO_EMOJI: Record<string, string> = {
  alert_sistema:       '🔔',
  scadenza_certificato:'🏥',
  scadenza_contratto:  '📄',
  quota_arretrata:     '💶',
  convocazione:        '📋',
  messaggio:           '✉',
  abbonamento_cis:     '⭐',
}

const RUOLO_LABEL: Record<string, string> = {
  presidente:    'Presidente',
  segretario:    'Segretario',
  ds:            'Dir. Sportivo',
  team_manager:  'Team Manager',
  allenatore:    'Allenatore',
  medico:        'Medico',
  osservatore:   'Osservatore',
  ufficio_stampa:'Uff. Stampa',
  custode:       'Custode',
  giocatore:     'Giocatore',
  famiglia:      'Famiglia',
}

interface Props {
  userId: string
  clubId: string
  initialCount: number
}

export default function NotificheDropdown({ userId, clubId, initialCount }: Props) {
  const router                            = useRouter()
  const supabase                          = useRef(createClient()).current
  const [open, setOpen]                   = useState(false)
  const [notifiche, setNotifiche]         = useState<Notifica[]>([])
  const [nonLette, setNonLette]           = useState(initialCount)
  const [loading, setLoading]             = useState(false)
  const [toasts, setToasts]               = useState<Notifica[]>([])
  const [toastsLeaving, setToastsLeaving] = useState<Set<string>>(new Set())
  const dropdownRef                       = useRef<HTMLDivElement>(null)
  const loadedRef                         = useRef(false)

  // ── Carica notifiche via API ────────────────────────────────────────────
  const carica = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/notifiche')
    if (!res.ok) { setLoading(false); return }
    const json = await res.json()
    setNotifiche(json.notifiche ?? [])
    setNonLette(json.nonLette ?? 0)
    setLoading(false)
  }, [])

  // Carica quando si apre il panel (lazy)
  useEffect(() => {
    if (open && !loadedRef.current) {
      loadedRef.current = true
      carica()
    }
    if (open) carica()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime subscription ──────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`notifiche-${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifiche_sistema',
          filter: `destinatario_id=eq.${userId}`,
        },
        (payload) => {
          const nuova = payload.new as Notifica & { club_id?: string }
          // Scarta notifiche di altri club (il filtro postgres_changes non supporta AND)
          if ((nuova as any).club_id && (nuova as any).club_id !== clubId) return
          // Aggiorna badge
          setNonLette(prev => prev + 1)
          // Aggiorna lista se aperta
          setNotifiche(prev => [nuova, ...prev].slice(0, 40))
          // Mostra toast con auto-dismiss + slide-out
          setToasts(prev => [...prev, nuova])
          setTimeout(() => dismissToast(nuova.id), 5700)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, clubId, supabase])

  // ── Chiudi cliccando fuori ─────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ── Azioni ────────────────────────────────────────────────────────────
  const segnaLetta = async (id: string) => {
    setNotifiche(prev => prev.map(n => n.id === id ? { ...n, letta: true } : n))
    setNonLette(prev => Math.max(0, prev - 1))
    await fetch('/api/notifiche', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
  }

  const segnaLettaTutte = async () => {
    setNotifiche(prev => prev.map(n => ({ ...n, letta: true })))
    setNonLette(0)
    await fetch('/api/notifiche', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ tutti: true }),
    })
  }

  const eliminaNotifica = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotifiche(prev => prev.filter(n => n.id !== id))
    const era = notifiche.find(n => n.id === id)
    if (era && !era.letta) setNonLette(prev => Math.max(0, prev - 1))
    await fetch(`/api/notifiche?id=${id}`, { method: 'DELETE' })
  }

  const cliccaNotifica = async (n: Notifica) => {
    if (!n.letta) await segnaLetta(n.id)
    setOpen(false)
    const dest = urlSicura(n.azione_url)
    if (dest) router.push(dest)
  }

  const dismissToast = (id: string) => {
    setToastsLeaving(prev => new Set(prev).add(id))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      setToastsLeaving(prev => { const s = new Set(prev); s.delete(id); return s })
    }, 300)
  }

  const cliccaToast = async (n: Notifica) => {
    dismissToast(n.id)
    await segnaLetta(n.id)
    const dest = urlSicura(n.azione_url)
    if (dest) router.push(dest)
  }

  const eliminaLette = async () => {
    setNotifiche(prev => prev.filter(n => !n.letta))
    await fetch('/api/notifiche?lette=true', { method: 'DELETE' })
  }

  const XIcon = ({ size = 14 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
  )

  return (
    <>
      <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setOpen(v => !v)}
          className="topbar-icon-btn"
          style={{ background: open ? 'var(--surface-3)' : undefined }}
          aria-label={nonLette > 0 ? `Notifiche, ${nonLette} da leggere` : 'Notifiche'}
          aria-expanded={open}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
          </svg>
          {nonLette > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: 'var(--accent-red)', color: '#fff',
              fontSize: 11, fontWeight: 700,
              minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--black)',
            }}>
              {nonLette > 99 ? '99+' : nonLette}
            </span>
          )}
        </button>

        {open && (
          <>
          <div className="notif-backdrop" onClick={() => setOpen(false)} />
          <div className="notif-panel" role="dialog" aria-label="Notifiche">
            <div style={{ padding: '16px 16px 10px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--white)' }}>Notifiche</div>
                <div style={{ fontSize: 13, color: 'var(--gray)' }}>
                  {nonLette > 0 ? `${nonLette} da leggere` : 'Tutto letto'}
                </div>
              </div>
              {nonLette > 0 && (
                <button onClick={segnaLettaTutte} className="btn btn-sm btn-ghost">Segna tutte lette</button>
              )}
              <button onClick={() => setOpen(false)} aria-label="Chiudi" style={{ width: 30, height: 30, borderRadius: 999, border: 0, background: 'var(--surface-3)', color: 'var(--label)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XIcon size={13} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '0 8px 8px' }}>
              {loading ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--gray)', fontSize: 14 }}>Caricamento…</div>
              ) : notifiche.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--white)' }}>Nessuna notifica</div>
                  <div style={{ fontSize: 13, color: 'var(--gray)' }}>Qui trovi scadenze, pagamenti e messaggi del club.</div>
                </div>
              ) : (
                notifiche.map(n => (
                  <div
                    key={n.id}
                    onClick={() => cliccaNotifica(n)}
                    className="notif-row"
                    style={{
                      cursor: urlSicura(n.azione_url) ? 'pointer' : 'default',
                      background: n.letta ? undefined : 'rgba(200,240,0,0.05)',
                    }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                      background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, position: 'relative',
                    }}>
                      {TIPO_EMOJI[n.tipo] ?? '🔔'}
                      {!n.letta && <span style={{ position: 'absolute', top: -2, left: -2, width: 10, height: 10, borderRadius: 999, background: 'var(--accent)', border: '2px solid var(--surface-2)' }} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: n.letta ? 500 : 600, color: n.letta ? 'var(--label)' : 'var(--white)', lineHeight: 1.35 }}>
                          {n.titolo}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--gray)', flexShrink: 0 }}>{tempoFa(n.creata_at)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.4, marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                        {n.messaggio}
                      </div>
                      {n.ruolo_destinatario && RUOLO_LABEL[n.ruolo_destinatario] && (
                        <span className="badge badge-grigio" style={{ marginTop: 6 }}>{RUOLO_LABEL[n.ruolo_destinatario]}</span>
                      )}
                    </div>

                    <button onClick={(e) => eliminaNotifica(n.id, e)} className="notif-del" aria-label="Elimina notifica">
                      <XIcon size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--separator)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              {notifiche.some(n => n.letta) ? (
                <button onClick={eliminaLette} className="btn btn-sm" style={{ background: 'transparent', color: 'var(--gray)', paddingLeft: 0 }}>Elimina lette</button>
              ) : <div />}
              <button onClick={() => { setOpen(false); router.push('/dashboard/notifiche') }} className="btn btn-sm btn-ghost" style={{ paddingRight: 0 }}>
                Impostazioni
              </button>
            </div>
          </div>
          </>
        )}
      </div>

      <div className="notif-toasts">
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => cliccaToast(t)}
            className="notif-toast"
            style={{
              cursor: urlSicura(t.azione_url) ? 'pointer' : 'default',
              animation: toastsLeaving.has(t.id) ? 'toastOut 0.25s ease forwards' : 'toastIn 0.35s cubic-bezier(0.32,0.72,0,1)',
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {TIPO_EMOJI[t.tipo] ?? '🔔'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)', marginBottom: 2 }}>{t.titolo}</div>
              <div style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                {t.messaggio}
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); dismissToast(t.id) }} aria-label="Chiudi" style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', flexShrink: 0, padding: 4, display: 'flex' }}>
              <XIcon size={13} />
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
