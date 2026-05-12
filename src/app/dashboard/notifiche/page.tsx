'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Toast } from '@/components/ui'

type CISContestoRuolo = 'presidente' | 'segretario' | 'team_manager' | 'allenatore' | 'medico' | 'giocatore' | 'famiglia'
type CISFrequenza = 'immediata' | 'giornaliera' | 'disattivata'

type Preferences = {
  contesto_ruolo: CISContestoRuolo
  canale_push_enabled: boolean
  canale_email_enabled: boolean
  canale_interna_enabled: boolean
  frequenza_interna: CISFrequenza
  frequenza_email: CISFrequenza
}

const CONTEXTS: { key: CISContestoRuolo; label: string }[] = [
  { key: 'presidente', label: 'Presidente' },
  { key: 'segretario', label: 'Segretario' },
  { key: 'team_manager', label: 'Team Manager' },
  { key: 'allenatore', label: 'Allenatore' },
  { key: 'medico', label: 'Medico' },
  { key: 'giocatore', label: 'Giocatore' },
  { key: 'famiglia', label: 'Famiglia' },
]

const DEFAULT_PREFS = (contesto: CISContestoRuolo): Preferences => ({
  contesto_ruolo: contesto,
  canale_push_enabled: true,
  canale_email_enabled: true,
  canale_interna_enabled: true,
  frequenza_interna: 'immediata',
  frequenza_email: 'immediata',
})

export default function NotifichePreferencesPage() {
  const supabase = useMemo(() => createClient(), [])

  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushSubEndpoint, setPushSubEndpoint] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<Record<CISContestoRuolo, Preferences>>(() => {
    const init = {} as any
    for (const c of CONTEXTS) init[c.key] = DEFAULT_PREFS(c.key)
    return init
  })
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' | 'info' } | null>(null)

  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
    return outputArray
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('cis_notification_preferences')
        .select('*')
        .eq('utente_id', user.id)

      const next = { ...prefs }
      for (const row of data ?? []) {
        const key = row.contesto_ruolo as CISContestoRuolo
        next[key] = {
          contesto_ruolo: key,
          canale_push_enabled: row.canale_push_enabled ?? true,
          canale_email_enabled: row.canale_email_enabled ?? true,
          canale_interna_enabled: row.canale_interna_enabled ?? true,
          frequenza_interna: row.frequenza_interna ?? 'immediata',
          frequenza_email: row.frequenza_email ?? 'immediata',
        }
      }
      setPrefs(next)

      // Push subscription status
      const { data: subs } = await supabase
        .from('cis_push_subscriptions')
        .select('endpoint')
        .eq('utente_id', user.id)
        .limit(5)

      const endpoint = (subs?.[0] as any)?.endpoint ?? null
      setPushSubEndpoint(endpoint)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    load()
  }, [])

  const updatePref = (contesto: CISContestoRuolo, patch: Partial<Preferences>) => {
    setPrefs(prev => ({
      ...prev,
      [contesto]: { ...prev[contesto], ...patch, contesto_ruolo: contesto },
    }))
  }

  const save = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const rows = (Object.keys(prefs) as CISContestoRuolo[]).map(k => ({
        utente_id: userId,
        contesto_ruolo: k,
        canale_push_enabled: prefs[k].canale_push_enabled,
        canale_email_enabled: prefs[k].canale_email_enabled,
        canale_interna_enabled: prefs[k].canale_interna_enabled,
        frequenza_interna: prefs[k].frequenza_interna,
        frequenza_email: prefs[k].frequenza_email,
      }))

      const { error } = await supabase
        .from('cis_notification_preferences')
        .upsert(rows, { onConflict: 'utente_id,contesto_ruolo' })

      if (error) throw error

      setToast({ msg: 'Preferenze salvate', tipo: 'success' })
    } catch (e: any) {
      setToast({ msg: e.message ?? 'Errore salvataggio', tipo: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const subscribePush = async () => {
    if (!userId) return
    setPushLoading(true)
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setToast({ msg: 'WebPush non supportato dal browser', tipo: 'error' })
        return
      }
      if (!VAPID_PUBLIC_KEY) {
        setToast({ msg: 'VAPID_PUBLIC_KEY non configurata (env NEXT_PUBLIC_VAPID_PUBLIC_KEY)', tipo: 'error' })
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setToast({ msg: 'Permesso notifiche non concesso', tipo: 'error' })
        return
      }

      const registration = await navigator.serviceWorker.register('/cis-sw.js')

      const existing = await registration.pushManager.getSubscription()
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)

      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })

      const subJson = subscription.toJSON() as any

      const { error } = await supabase
        .from('cis_push_subscriptions')
        .upsert(
          [
            {
              utente_id: userId,
              endpoint: subJson.endpoint,
              p256dh: subJson.keys?.p256dh,
              auth: subJson.keys?.auth,
            },
          ],
          { onConflict: 'utente_id,endpoint' },
        )

      if (error) throw error

      setPushSubEndpoint(subJson.endpoint)
      setToast({ msg: 'Push abilitato', tipo: 'success' })
    } catch (e: any) {
      setToast({ msg: e.message ?? 'Errore abilitazione push', tipo: 'error' })
    } finally {
      setPushLoading(false)
    }
  }

  const unsubscribePush = async () => {
    if (!userId) return
    setPushLoading(true)
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        setToast({ msg: 'Nessun service worker attivo', tipo: 'info' })
        return
      }

      const subscription = await registration.pushManager.getSubscription()
      if (subscription) await subscription.unsubscribe()

      if (pushSubEndpoint) {
        const { error } = await supabase
          .from('cis_push_subscriptions')
          .delete()
          .eq('utente_id', userId)
          .eq('endpoint', pushSubEndpoint)
        if (error) throw error
      }

      setPushSubEndpoint(null)
      setToast({ msg: 'Push disabilitato', tipo: 'success' })
    } catch (e: any) {
      setToast({ msg: e.message ?? 'Errore disabilitazione push', tipo: 'error' })
    } finally {
      setPushLoading(false)
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Notifiche</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Preferenze ClubIS per ruolo · canali e frequenze
        </p>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {CONTEXTS.map(c => {
            const p = prefs[c.key]
            return (
              <div
                key={c.key}
                style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--bg-input)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{c.label}</div>
                  <span className="badge badge-grigio" style={{ opacity: 0.85 }}>{c.key}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>Push</label>
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${p.canale_push_enabled ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => updatePref(c.key, { canale_push_enabled: !p.canale_push_enabled })}
                      >
                        {p.canale_push_enabled ? 'Attivo' : 'Disattivo'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>Email</label>
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${p.canale_email_enabled ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => updatePref(c.key, { canale_email_enabled: !p.canale_email_enabled })}
                      >
                        {p.canale_email_enabled ? 'Attivo' : 'Disattivo'}
                      </button>
                      <select
                        className="input"
                        value={p.frequenza_email}
                        disabled={!p.canale_email_enabled}
                        onChange={(e) => updatePref(c.key, { frequenza_email: e.target.value as CISFrequenza })}
                        style={{ width: '100%' }}
                      >
                        <option value="immediata">Immediata</option>
                        <option value="giornaliera">Giornaliera</option>
                        <option value="disattivata">Disattivata</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>Notifica interna</label>
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${p.canale_interna_enabled ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => updatePref(c.key, { canale_interna_enabled: !p.canale_interna_enabled })}
                      >
                        {p.canale_interna_enabled ? 'Attivo' : 'Disattivo'}
                      </button>
                      <select
                        className="input"
                        value={p.frequenza_interna}
                        disabled={!p.canale_interna_enabled}
                        onChange={(e) => updatePref(c.key, { frequenza_interna: e.target.value as CISFrequenza })}
                        style={{ width: '100%' }}
                      >
                        <option value="immediata">Immediata</option>
                        <option value="giornaliera">Giornaliera</option>
                        <option value="disattivata">Disattivata</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* WebPush */}
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>WebPush</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {pushSubEndpoint ? `Sottoscrizione attiva` : `Non abilitato`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {!pushSubEndpoint ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={subscribePush} disabled={pushLoading}>
                  {pushLoading ? 'Abilitazione…' : 'Abilita Push'}
                </button>
              ) : (
                <button type="button" className="btn btn-secondary btn-sm" onClick={unsubscribePush} disabled={pushLoading}>
                  {pushLoading ? 'Disabilitazione…' : 'Disabilita Push'}
                </button>
              )}
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Nota: la consegna via Push avviene solo se il canale Push è abilitato nelle preferenze per il relativo ruolo.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }}>
          <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>
            Annulla
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={loading}>
            {loading ? 'Salvataggio…' : 'Salva preferenze'}
          </button>
        </div>
      </div>

      {toast && (
        <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />
      )}
    </div>
  )
}

