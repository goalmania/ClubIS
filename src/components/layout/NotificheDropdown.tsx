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
  messaggio:           '✉️',
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
          const nuova = payload.new as Notifica
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
  }, [userId, supabase])

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

  return (
    <>
      {/* ── Bell button ──────────────────────────────────────────────── */}
      <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            8,
            padding:        '6px 12px',
            background:     open ? 'rgba(200,240,0,0.12)' : 'rgba(200,240,0,0.06)',
            border:         '1px solid rgba(200,240,0,0.2)',
            borderRadius:   4,
            cursor:         'pointer',
            color:          'var(--white)',
            transition:     'background 0.15s',
            position:       'relative',
          }}
          aria-label="Notifiche"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Notifiche
          </span>
          {nonLette > 0 && (
            <span style={{
              background:    '#ef4444',
              color:         '#fff',
              fontSize:      10,
              fontWeight:    700,
              fontFamily:    'var(--font-mono)',
              padding:       '1px 6px',
              borderRadius:  10,
              minWidth:      18,
              textAlign:     'center',
              lineHeight:    '16px',
            }}>
              {nonLette > 99 ? '99+' : nonLette}
            </span>
          )}
        </button>

        {/* ── Dropdown panel ──────────────────────────────────────────── */}
        {open && (
          <div style={{
            position:    'absolute',
            top:         'calc(100% + 8px)',
            right:       0,
            width:       380,
            maxHeight:   520,
            background:  '#111',
            border:      '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            boxShadow:   '0 8px 40px rgba(0,0,0,0.6)',
            zIndex:      1000,
            display:     'flex',
            flexDirection: 'column',
            overflow:    'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding:       '14px 16px',
              borderBottom:  '1px solid rgba(255,255,255,0.08)',
              display:       'flex',
              alignItems:    'center',
              justifyContent:'space-between',
              flexShrink:    0,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--white)' }}>
                  Notifiche
                  {nonLette > 0 && (
                    <span style={{
                      marginLeft: 8, background: '#ef4444', color: '#fff',
                      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                    }}>
                      {nonLette} nuove
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Aggiornate in tempo reale</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {nonLette > 0 && (
                  <button
                    onClick={segnaLettaTutte}
                    style={{
                      fontSize: 11, color: '#c8f000', background: 'none',
                      border: '1px solid rgba(200,240,0,0.3)', borderRadius: 4,
                      padding: '4px 10px', cursor: 'pointer', fontWeight: 600,
                    }}
                  >
                    Segna tutte lette
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Lista */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loading ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#666', fontSize: 13 }}>
                  Caricamento…
                </div>
              ) : notifiche.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
                  <div style={{ fontSize: 13, color: '#666' }}>Nessuna notifica</div>
                </div>
              ) : (
                notifiche.map(n => (
                  <div
                    key={n.id}
                    onClick={() => cliccaNotifica(n)}
                    style={{
                      padding:      '13px 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor:       urlSicura(n.azione_url) ? 'pointer' : 'default',
                      background:   n.letta ? 'transparent' : 'rgba(200,240,0,0.04)',
                      display:      'flex',
                      gap:          12,
                      alignItems:   'flex-start',
                      transition:   'background 0.1s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = n.letta ? 'transparent' : 'rgba(200,240,0,0.04)' }}
                  >
                    {/* Dot non letta */}
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                      background: n.letta ? 'transparent' : '#c8f000',
                      border: n.letta ? '1px solid rgba(255,255,255,0.15)' : 'none',
                    }} />

                    {/* Emoji tipo */}
                    <div style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.2 }}>
                      {TIPO_EMOJI[n.tipo] ?? '🔔'}
                    </div>

                    {/* Contenuto */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                        <div style={{
                          fontSize:   13,
                          fontWeight: n.letta ? 400 : 700,
                          color:      n.letta ? '#ccc' : '#fff',
                          lineHeight: 1.35,
                        }}>
                          {n.titolo}
                        </div>
                        {n.ruolo_destinatario && RUOLO_LABEL[n.ruolo_destinatario] && (
                          <span style={{
                            fontSize: 9, padding: '1px 5px',
                            background: 'rgba(200,240,0,0.1)',
                            border: '1px solid rgba(200,240,0,0.25)',
                            color: '#c8f000', borderRadius: 3,
                            fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                            textTransform: 'uppercase', flexShrink: 0,
                          }}>
                            {RUOLO_LABEL[n.ruolo_destinatario]}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize:   12,
                        color:      '#888',
                        lineHeight: 1.4,
                        overflow:   'hidden',
                        display:    '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                      }}>
                        {n.messaggio}
                      </div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
                        {tempoFa(n.creata_at)}
                        {urlSicura(n.azione_url) && (
                          <span style={{ marginLeft: 6, color: '#c8f000', opacity: 0.7 }}>→ Vai</span>
                        )}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={(e) => eliminaNotifica(n.id, e)}
                      style={{
                        background: 'none', border: 'none', color: '#444',
                        cursor: 'pointer', fontSize: 14, flexShrink: 0,
                        padding: '0 2px',
                        opacity: 0,
                        transition: 'opacity 0.1s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0' }}
                      aria-label="Elimina"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding:        '10px 16px',
              borderTop:      '1px solid rgba(255,255,255,0.08)',
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'center',
              flexShrink:     0,
            }}>
              {notifiche.some(n => n.letta) ? (
                <button
                  onClick={eliminaLette}
                  style={{
                    background: 'none', border: 'none', color: '#666',
                    fontSize: 11, cursor: 'pointer',
                  }}
                >
                  Elimina lette
                </button>
              ) : <div />}
              <button
                onClick={() => { setOpen(false); router.push('/dashboard/notifiche') }}
                style={{
                  background: 'none', border: 'none', color: '#c8f000',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Impostazioni notifiche →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Toast per notifiche in arrivo ────────────────────────────── */}
      <div style={{
        position: 'fixed',
        bottom:   24,
        right:    24,
        zIndex:   9999,
        display:  'flex',
        flexDirection: 'column',
        gap:      10,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => cliccaToast(t)}
            style={{
              background:   '#1a1a1a',
              border:       '1px solid rgba(200,240,0,0.3)',
              borderLeft:   '3px solid #c8f000',
              borderRadius: 8,
              padding:      '14px 16px',
              width:        340,
              cursor:       urlSicura(t.azione_url) ? 'pointer' : 'default',
              boxShadow:    '0 4px 24px rgba(0,0,0,0.5)',
              pointerEvents:'auto',
              animation:    toastsLeaving.has(t.id) ? 'slideOutRight 0.3s ease forwards' : 'slideInRight 0.3s ease',
              display:      'flex',
              gap:          12,
              alignItems:   'flex-start',
            }}
          >
            <div style={{ fontSize: 20, flexShrink: 0 }}>
              {TIPO_EMOJI[t.tipo] ?? '🔔'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
                {t.titolo}
              </div>
              <div style={{
                fontSize: 12, color: '#999', lineHeight: 1.35,
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
              }}>
                {t.messaggio}
              </div>
              {urlSicura(t.azione_url) && (
                <div style={{ fontSize: 11, color: '#c8f000', marginTop: 5, fontWeight: 600 }}>
                  Tocca per vedere →
                </div>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); dismissToast(t.id) }}
              style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0);   opacity: 1; }
          to   { transform: translateX(120%); opacity: 0; }
        }
      `}</style>
    </>
  )
}
