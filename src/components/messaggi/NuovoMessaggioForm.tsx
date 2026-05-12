'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { FormField, Select, Toast, BackButton } from '@/components/ui'

const RUOLI_LABEL: Record<string, string> = {
  presidente:   'Presidente',
  ds:           'Direttore Sportivo',
  segretario:   'Segretario',
  allenatore:   'Allenatore',
  medico:       'Medico',
  osservatore:  'Osservatore',
  team_manager: 'Team Manager',
  famiglia:     'Famiglie',
  giocatore:    'Giocatori',
}

const TIPI_MESSAGGIO = [
  { value: 'comunicazione', label: '📢 Comunicazione' },
  { value: 'avviso',        label: '⚠️ Avviso urgente' },
  { value: 'convocazione',  label: '⚽ Convocazione' },
  { value: 'alert_tecnico', label: '📋 Note tecniche' },
]

type Dest = 'tutti' | 'ruolo' | 'singolo'

interface Props {
  backUrl: string
}

export default function NuovoMessaggioForm({ backUrl }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [clubId,      setClubId]      = useState('')
  const [userId,      setUserId]      = useState('')
  const [userRuolo,   setUserRuolo]   = useState('')
  const [utenti,      setUtenti]      = useState<{ id: string; nome: string; cognome: string; ruolo: string }[]>([])
  const [destinatario, setDestinatario] = useState<Dest>('tutti')
  const [ruoloTarget, setRuoloTarget] = useState('')
  const [utenteSel,   setUtenteSel]   = useState('')
  const [titolo,      setTitolo]      = useState('')
  const [corpo,       setCorpo]       = useState('')
  const [tipo,        setTipo]        = useState('comunicazione')
  const [fissato,     setFissato]     = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [toast,       setToast]       = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !mounted) return
      setUserId(user.id)

      const { data: utente } = await supabase
        .from('utenti').select('club_id, ruolo').eq('id', user.id).single()
      if (!utente || !mounted) return
      setClubId(utente.club_id)
      setUserRuolo(utente.ruolo ?? '')

      const { data: tutti } = await supabase
        .from('utenti')
        .select('id, nome, cognome, ruolo')
        .eq('club_id', utente.club_id)
        .eq('attivo', true)
        .neq('id', user.id)
        .order('cognome')
      if (mounted) setUtenti(tutti ?? [])
    }
    load()
    return () => { mounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const invia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titolo.trim() || !corpo.trim()) {
      setToast({ msg: 'Titolo e testo sono obbligatori', tipo: 'error' })
      return
    }
    if (destinatario === 'ruolo' && !ruoloTarget) {
      setToast({ msg: 'Seleziona un ruolo destinatario', tipo: 'error' })
      return
    }
    if (destinatario === 'singolo' && !utenteSel) {
      setToast({ msg: 'Seleziona un destinatario', tipo: 'error' })
      return
    }
    setLoading(true)

    const payload: Record<string, unknown> = {
      club_id:    clubId,
      mittente_id: userId,
      titolo:     titolo.trim(),
      corpo:      corpo.trim(),
      tipo,
      destinatari: [],
      inviato_at: new Date().toISOString(),
      fissato,
      tipo_comunicazione: fissato ? 'bacheca_post' : 'messaggio',
    }

    if (destinatario === 'ruolo' && ruoloTarget) {
      payload.destinatari_ruolo = JSON.stringify([ruoloTarget])
    } else if (destinatario === 'singolo' && utenteSel) {
      payload.destinatari_utente_ids = JSON.stringify([utenteSel])
    }

    const { data: inserted, error } = await supabase.from('messaggi').insert(payload).select('id').single()
    setLoading(false)

    if (error || !inserted) {
      setToast({ msg: error?.message ?? 'Errore invio', tipo: 'error' })
      return
    }

    // Calcola destinatari e crea notifiche_sistema
    const RUOLO_URL: Record<string, string> = {
      presidente:   '/dashboard/presidente/messaggi',
      ds:           '/dashboard/ds/messaggi',
      segretario:   '/dashboard/segretario/messaggi',
      allenatore:   '/dashboard/allenatore/messaggi',
      medico:       '/dashboard/medico/messaggi',
      osservatore:  '/dashboard/osservatore/messaggi',
      team_manager: '/dashboard/team-manager/comunicazioni',
      giocatore:    '/dashboard/giocatore/comunicazioni',
      famiglia:     '/dashboard/famiglia/messaggi',
    }
    let recipientIds: string[] = []
    if (destinatario === 'tutti') {
      recipientIds = utenti.map(u => u.id)
    } else if (destinatario === 'ruolo' && ruoloTarget) {
      recipientIds = utenti.filter(u => u.ruolo === ruoloTarget).map(u => u.id)
    } else if (destinatario === 'singolo' && utenteSel) {
      recipientIds = [utenteSel]
    }
    if (recipientIds.length > 0) {
      await supabase.from('notifiche_sistema').insert(
        recipientIds.map(id => {
          const dest = utenti.find(u => u.id === id)
          return {
            club_id:            clubId,
            destinatario_id:    id,
            ruolo_destinatario: dest?.ruolo ?? null,
            tipo:               'messaggio',
            titolo:             `Nuovo messaggio: ${titolo.trim()}`,
            messaggio:          corpo.trim().slice(0, 220),
            azione_url:         RUOLO_URL[dest?.ruolo ?? ''] ?? backUrl,
            letta:              false,
          }
        }),
      )
    }

    setToast({ msg: 'Messaggio inviato ✓', tipo: 'success' })
    const redirectUrl = fissato ? `${backUrl}?tab=bacheca` : backUrl
    setTimeout(() => router.push(redirectUrl), 900)
  }

  return (
    <div style={{ maxWidth: 660, margin: '0 auto' }}>
      <BackButton label="Messaggi" />

      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26,
          textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--white)',
        }}>
          Nuovo messaggio
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', marginTop: 6 }}>
          Invia una comunicazione ai membri del club
        </div>
      </div>

      <form onSubmit={invia}>
        <div style={{
          border: '1px solid var(--border)', background: 'var(--bg-card)',
          padding: '20px 24px', marginBottom: 16,
          display: 'flex', flexDirection: 'column', gap: 18,
        }}>

          {/* Tipo destinatario */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Destinatari
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([
                { key: 'tutti',   label: '🌐 Tutto il club' },
                { key: 'ruolo',   label: '👥 Per ruolo' },
                { key: 'singolo', label: '👤 Singolo' },
              ] as const).map(d => (
                <button
                  key={d.key} type="button"
                  onClick={() => setDestinatario(d.key)}
                  className={`btn btn-sm ${destinatario === d.key ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 11 }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {destinatario === 'ruolo' && (
            <FormField label="Ruolo destinatario">
              <Select
                value={ruoloTarget}
                onChange={setRuoloTarget}
                placeholder="Seleziona ruolo..."
                options={Object.entries(RUOLI_LABEL).map(([k, v]) => ({ value: k, label: v }))}
              />
            </FormField>
          )}

          {destinatario === 'singolo' && (
            <FormField label="Destinatario">
              <Select
                value={utenteSel}
                onChange={setUtenteSel}
                placeholder="Seleziona persona..."
                options={utenti.map(u => ({
                  value: u.id,
                  label: `${u.cognome} ${u.nome} — ${RUOLI_LABEL[u.ruolo] ?? u.ruolo}`,
                }))}
              />
            </FormField>
          )}

          {/* Tipo messaggio */}
          <FormField label="Tipo">
            <Select value={tipo} onChange={setTipo} options={TIPI_MESSAGGIO} />
          </FormField>

          {/* Titolo */}
          <FormField label="Titolo" required>
            <input
              className="input"
              value={titolo}
              onChange={e => setTitolo(e.target.value)}
              placeholder="Oggetto del messaggio"
              required
            />
          </FormField>

          {/* Testo */}
          <FormField label="Testo" required>
            <textarea
              className="input"
              value={corpo}
              onChange={e => setCorpo(e.target.value)}
              rows={6}
              placeholder="Scrivi il testo del messaggio..."
              style={{ resize: 'vertical' }}
              required
            />
          </FormField>

          {/* Fissa in bacheca */}
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={fissato}
              onChange={e => setFissato(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
            />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--white)' }}>
                📌 Fissa in bacheca
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>
                Il messaggio sarà visibile come post fissato nella bacheca del club
              </div>
            </div>
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={() => router.back()}>
            Annulla
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Invio in corso...' : 'Invia messaggio →'}
          </button>
        </div>
      </form>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
