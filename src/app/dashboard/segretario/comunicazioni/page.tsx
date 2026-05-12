'use client'
import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Modal, FormField, Select, Toast, EmptyState } from '@/components/ui'

const GRUPPI_DEST = [
  { value: 'tutti_tesserati',   label: '🌐 Tutti i tesserati' },
  { value: 'prima_squadra',     label: '⚽ Prima squadra' },
  { value: 'staff_tecnico',     label: '👥 Staff tecnico' },
  { value: 'settore_giovanile', label: '🎓 Settore giovanile' },
  { value: 'famiglie',          label: '👨‍👩‍👧 Famiglie' },
]

const CANALI = [
  { value: 'in_app',   label: '📱 Solo in-app' },
  { value: 'email',    label: '📧 Solo email' },
  { value: 'entrambi', label: '📱+📧 App e email' },
]

interface Comunicazione {
  id: string
  oggetto: string
  testo: string
  destinatari_gruppo: string
  canale: string
  data_invio: string
  letta_da: string[]
  inviata_da_utente: { nome: string; cognome: string; ruolo: string } | null
}

interface FormState {
  oggetto: string
  testo: string
  destinatari_gruppo: string
  canale: string
}

const FORM_VUOTO: FormState = {
  oggetto: '', testo: '', destinatari_gruppo: 'tutti_tesserati', canale: 'in_app',
}

export default function ComunicazioniPage() {
  const [comunicazioni, setComunicazioni] = useState<Comunicazione[]>([])
  const [loading, setLoading]             = useState(true)
  const [modalAperto, setModalAperto]     = useState(false)
  const [toast, setToast]                 = useState<{ msg: string; tipo: 'success' | 'error' | 'info' } | null>(null)
  const [salvando, setSalvando]           = useState(false)
  const [espansa, setEspansa]             = useState<string | null>(null)
  const [form, setForm]                   = useState<FormState>(FORM_VUOTO)

  const carica = useCallback(async () => {
    const res = await fetch('/api/comunicazioni')
    const d = await res.json()
    setComunicazioni(d.comunicazioni ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { carica() }, [carica])

  const invia = async () => {
    if (!form.oggetto.trim() || !form.testo.trim()) {
      setToast({ msg: 'Oggetto e testo sono obbligatori', tipo: 'error' }); return
    }
    setSalvando(true)
    const res = await fetch('/api/comunicazioni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setToast({ msg: 'Comunicazione inviata con successo', tipo: 'success' })
      setModalAperto(false)
      setForm(FORM_VUOTO)
      carica()
    } else {
      const d = await res.json()
      setToast({ msg: d.error ?? 'Errore invio', tipo: 'error' })
    }
    setSalvando(false)
  }

  const gruppoLabel = (v: string) => GRUPPI_DEST.find(g => g.value === v)?.label ?? v
  const canaleLabel = (v: string) => CANALI.find(c => c.value === v)?.label ?? v

  return (
    <div>
      <PageHeader
        title="Comunicazioni"
        subtitle="Avvisi e messaggi massivi al club"
        actions={
          <button
            onClick={() => { setForm(FORM_VUOTO); setModalAperto(true) }}
            style={{
              padding: '9px 18px', background: 'var(--accent)', color: '#0a0a0a',
              border: 'none', borderRadius: 2, cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}
          >
            + Nuova comunicazione
          </button>
        }
      />

      {/* Guida */}
      <div style={{
        padding: '10px 14px', marginBottom: 20,
        background: 'rgba(200,240,0,0.04)',
        border: '1px solid rgba(200,240,0,0.12)',
        fontSize: 12, color: 'var(--grigio-4)', lineHeight: 1.6,
      }}>
        💡 Le comunicazioni vengono inviate a tutti i tesserati del gruppo selezionato con accesso a ClubIS.
        Per il canale email è necessario che i destinatari abbiano l&apos;indirizzo configurato nel profilo.
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
          Caricamento…
        </div>
      ) : comunicazioni.length === 0 ? (
        <EmptyState
          icon="📣"
          title="Nessuna comunicazione"
          subtitle="Invia avvisi, circolari o comunicati a tutto il club in un clic"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {comunicazioni.map(c => {
            const isEspansa = espansa === c.id
            const mitt = c.inviata_da_utente

            return (
              <div key={c.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <button
                  onClick={() => setEspansa(isEspansa ? null : c.id)}
                  style={{
                    width: '100%', padding: '14px 20px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>
                    {c.canale === 'email' ? '📧' : '📱'}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontWeight: 700,
                      textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.04em',
                      color: 'var(--white)', marginBottom: 4,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {c.oggetto}
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)' }}>
                      <span>{gruppoLabel(c.destinatari_gruppo)}</span>
                      <span>{canaleLabel(c.canale)}</span>
                      <span>📅 {new Date(c.data_invio).toLocaleDateString('it-IT', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}</span>
                      {mitt && <span>👤 {mitt.nome} {mitt.cognome}</span>}
                      {c.letta_da?.length > 0 && (
                        <span style={{ color: '#c8f000' }}>👁 {c.letta_da.length} letture</span>
                      )}
                    </div>
                  </div>

                  <span style={{ color: 'var(--grigio-4)', fontSize: 12, flexShrink: 0 }}>
                    {isEspansa ? '▲' : '▼'}
                  </span>
                </button>

                {isEspansa && (
                  <div style={{
                    padding: '14px 20px 18px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    background: '#111',
                  }}>
                    <div style={{ fontSize: 13, color: 'var(--grigio-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {c.testo}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {modalAperto && (
        <Modal
          open
          title="Nuova comunicazione"
          onClose={() => setModalAperto(false)}
          width={540}
        >
          <FormField label="Oggetto" required>
            <input
              className="input"
              value={form.oggetto}
              onChange={e => setForm(p => ({ ...p, oggetto: e.target.value }))}
              placeholder="Es. Convocazione allenamento straordinario"
            />
          </FormField>

          <FormField label="Testo del messaggio" required>
            <textarea
              className="input" rows={6}
              value={form.testo}
              onChange={e => setForm(p => ({ ...p, testo: e.target.value }))}
              placeholder="Scrivi il testo completo della comunicazione…"
              style={{ resize: 'vertical' }}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label="Destinatari">
              <Select
                value={form.destinatari_gruppo}
                onChange={v => setForm(p => ({ ...p, destinatari_gruppo: v }))}
                options={GRUPPI_DEST}
              />
            </FormField>
            <FormField label="Canale invio">
              <Select
                value={form.canale}
                onChange={v => setForm(p => ({ ...p, canale: v }))}
                options={CANALI}
              />
            </FormField>
          </div>

          <div style={{
            padding: '10px 14px', marginBottom: 4,
            background: 'rgba(200,240,0,0.04)',
            border: '1px solid rgba(200,240,0,0.15)',
            fontSize: 12, color: 'var(--grigio-4)',
          }}>
            📣 Invierai a: <strong style={{ color: 'var(--white)' }}>
              {GRUPPI_DEST.find(g => g.value === form.destinatari_gruppo)?.label}
            </strong> via <strong style={{ color: 'var(--white)' }}>
              {CANALI.find(c => c.value === form.canale)?.label}
            </strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button
              onClick={() => setModalAperto(false)}
              style={{
                padding: '9px 20px', background: 'transparent',
                color: 'var(--grigio-3)', border: '1px solid var(--border-solid)',
                borderRadius: 2, cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontSize: 11, textTransform: 'uppercase',
              }}
            >
              Annulla
            </button>
            <button
              onClick={invia}
              disabled={salvando}
              style={{
                padding: '9px 22px', background: 'var(--accent)', color: '#0a0a0a',
                border: 'none', borderRadius: 2, cursor: salvando ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
                opacity: salvando ? 0.6 : 1,
              }}
            >
              {salvando ? 'Invio…' : 'Invia comunicazione →'}
            </button>
          </div>
        </Modal>
      )}

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
