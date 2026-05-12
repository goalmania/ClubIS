'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Preferenza = {
  tipo_notifica: string
  canale_app: boolean
  canale_email: boolean
  canale_push: boolean
}

const TIPI_NOTIFICA: { key: string; label: string; area: string }[] = [
  { key: 'scadenza_certificato', label: 'Certificato medico in scadenza',    area: 'Medico' },
  { key: 'scadenza_contratto',   label: 'Contratto in scadenza',             area: 'Contratti' },
  { key: 'quota_arretrata',      label: 'Quota non pagata',                  area: 'Pagamenti' },
  { key: 'convocazione',         label: 'Nuova convocazione',                area: 'Partite' },
  { key: 'messaggio',            label: 'Nuovo messaggio',                   area: 'Comunicazioni' },
  { key: 'infortunio',           label: 'Infortunio registrato',             area: 'Medico' },
  { key: 'squalifica_figc',      label: 'Squalifica da comunicato FIGC',     area: 'FIGC' },
  { key: 'ammenda_figc',         label: 'Nuova ammenda FIGC',                area: 'FIGC' },
  { key: 'scadenza_ammenda',     label: 'Ammenda in scadenza',               area: 'FIGC' },
  { key: 'portafoglio_figc',     label: 'Saldo portafoglio FIGC basso',      area: 'FIGC' },
  { key: 'torneo_sc',            label: 'Nuovo torneo scuola calcio',        area: 'Scuola Calcio' },
  { key: 'completino_arrivato',  label: 'Completino arrivato',               area: 'Materiale' },
  { key: 'obiettivo_raggiunto',  label: 'Obiettivo raggiunto',               area: 'Obiettivi' },
  { key: 'nuova_iscrizione',     label: 'Nuova richiesta iscrizione',        area: 'Iscrizioni' },
]

const AREE = Array.from(new Set(TIPI_NOTIFICA.map(t => t.area)))

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
        background: checked ? 'var(--accent)' : '#2a2a2a',
        border: `1px solid ${checked ? 'var(--accent)' : 'var(--border-solid)'}`,
        position: 'relative', transition: 'background 0.2s, border-color 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: '50%',
        background: checked ? '#000' : '#555',
        position: 'absolute', top: 2,
        left: checked ? 19 : 3,
        transition: 'left 0.18s, background 0.2s',
      }} />
    </div>
  )
}

export default function ImpostazioniNotifichePage() {
  const supabase = createClient()
  const [userId,  setUserId]  = useState<string | null>(null)
  const [prefs,   setPrefs]   = useState<Record<string, Preferenza>>({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('preferenze_notifiche')
        .select('*')
        .eq('utente_id', user.id)

      const map: Record<string, Preferenza> = {}

      // Inizializza tutti i tipi con default
      TIPI_NOTIFICA.forEach(t => {
        map[t.key] = {
          tipo_notifica: t.key,
          canale_app:    true,
          canale_email:  false,
          canale_push:   false,
        }
      })

      // Sovrascrivi con quelli salvati
      ;(data ?? []).forEach(p => {
        map[p.tipo_notifica] = {
          tipo_notifica: p.tipo_notifica,
          canale_app:    p.canale_app,
          canale_email:  p.canale_email,
          canale_push:   p.canale_push,
        }
      })

      setPrefs(map)
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (tipo: string, canale: 'canale_app' | 'canale_email' | 'canale_push', val: boolean) => {
    setPrefs(prev => ({
      ...prev,
      [tipo]: { ...prev[tipo], [canale]: val },
    }))
  }

  const salva = async () => {
    if (!userId) return
    setSaving(true)

    const rows = Object.values(prefs).map(p => ({
      utente_id:     userId,
      tipo_notifica: p.tipo_notifica,
      canale_app:    p.canale_app,
      canale_email:  p.canale_email,
      canale_push:   p.canale_push,
    }))

    await supabase
      .from('preferenze_notifiche')
      .upsert(rows, { onConflict: 'utente_id,tipo_notifica' })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const attivaTutti = (canale: 'canale_app' | 'canale_email' | 'canale_push', val: boolean) => {
    setPrefs(prev => {
      const next = { ...prev }
      TIPI_NOTIFICA.forEach(t => {
        next[t.key] = { ...next[t.key], [canale]: val }
      })
      return next
    })
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--gray)' }}>
      Caricamento...
    </div>
  )

  const thStyle: React.CSSProperties = {
    padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em',
    color: 'var(--gray)', textAlign: 'center', background: '#0d0d0d',
    borderBottom: '1px solid var(--border-solid)', whiteSpace: 'nowrap',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)', marginBottom: 4 }}>
            Impostazioni Notifiche
          </h1>
          <p style={{ fontSize: 13, color: 'var(--gray)', fontWeight: 300 }}>
            Scegli per ogni evento su quali canali ricevere le notifiche
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saved && (
            <span style={{ fontSize: 12, color: 'var(--verde)', fontFamily: 'var(--font-mono)' }}>✓ Salvato</span>
          )}
          <button onClick={salva} disabled={saving} className="btn btn-primary btn-sm">
            {saving ? 'Salvataggio...' : 'Salva preferenze'}
          </button>
        </div>
      </div>

      {/* Legenda canali + toggle globali */}
      <div style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--gray)' }}>Attiva/disattiva tutto:</span>
        {(['canale_app', 'canale_email', 'canale_push'] as const).map(canale => {
          const label = canale === 'canale_app' ? '📱 In-app' : canale === 'canale_email' ? '✉ Email' : '🔔 Push'
          const tutti = TIPI_NOTIFICA.every(t => prefs[t.key]?.[canale])
          return (
            <div key={canale} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Toggle checked={tutti} onChange={v => attivaTutti(canale, v)} />
              <span style={{ fontSize: 12, color: 'var(--white)' }}>{label}</span>
            </div>
          )
        })}
      </div>

      {/* Tabella per area */}
      {AREE.map(area => {
        const tipiArea = TIPI_NOTIFICA.filter(t => t.area === area)
        return (
          <div key={area} style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--accent)', marginBottom: 8 }}>
              {area}
            </div>
            <div style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, overflow: 'hidden' }}>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px', borderBottom: '2px solid var(--border-solid)' }}>
                <div style={{ ...thStyle, textAlign: 'left' }}>Notifica</div>
                <div style={thStyle}>📱 In-app</div>
                <div style={thStyle}>✉ Email</div>
                <div style={thStyle}>🔔 Push</div>
              </div>

              {tipiArea.map((tipo, idx) => {
                const p = prefs[tipo.key]
                return (
                  <div
                    key={tipo.key}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px',
                      borderBottom: idx < tipiArea.length - 1 ? '1px solid var(--border-solid)' : 'none',
                      background: idx % 2 === 0 ? '#111' : '#0f0f0f',
                    }}
                  >
                    <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--white)' }}>
                      {tipo.label}
                    </div>
                    {(['canale_app', 'canale_email', 'canale_push'] as const).map(canale => (
                      <div key={canale} style={{ padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Toggle
                          checked={p?.[canale] ?? (canale === 'canale_app')}
                          onChange={v => toggle(tipo.key, canale, v)}
                        />
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Note */}
      <div style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.8, background: '#0d0d0d', border: '1px solid var(--border-solid)', borderRadius: 2, padding: '12px 16px' }}>
        <strong style={{ color: 'var(--white)' }}>Note:</strong>
        <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
          <li><strong style={{ color: 'var(--white)' }}>In-app</strong> — notifiche nel centro notifiche ClubIS (campanella in alto)</li>
          <li><strong style={{ color: 'var(--white)' }}>Email</strong> — invio all'indirizzo email del tuo account</li>
          <li><strong style={{ color: 'var(--white)' }}>Push</strong> — notifiche push browser (richiede autorizzazione)</li>
        </ul>
      </div>
    </div>
  )
}
