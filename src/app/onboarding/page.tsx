'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── Tipi ────────────────────────────────────────────────────────────────────

type StepId = 1 | 2 | 3 | 4

interface ClubData {
  nome: string
  citta: string
  provincia: string
  categoria: string
  anno_fondazione: string
  colori_sociali: string
}

interface InvitoStaff {
  ruolo: string
  label: string
  email: string
}

const CATEGORIE_GIOVANILI = [
  { id: 'u6',  label: 'Scuola Calcio U6-U8' },
  { id: 'u10', label: 'Pulcini U9-U10' },
  { id: 'u12', label: 'Pulcini U11-U12' },
  { id: 'u14', label: 'Esordienti U13-U14' },
  { id: 'u16', label: 'Giovanissimi U15-U16' },
  { id: 'u18', label: 'Allievi U17-U18' },
  { id: 'u20', label: 'Primavera U19-U20' },
]

const RUOLI_STAFF: InvitoStaff[] = [
  { ruolo: 'segretario',      label: 'Segretario',         email: '' },
  { ruolo: 'ds',              label: 'Direttore Sportivo', email: '' },
  { ruolo: 'team_manager',    label: 'Team Manager',       email: '' },
  { ruolo: 'allenatore',      label: 'Allenatore (prima squadra)', email: '' },
  { ruolo: 'medico',          label: 'Medico Sociale',     email: '' },
  { ruolo: 'ufficio_stampa',  label: 'Addetto Stampa',     email: '' },
]

const CATEGORIE_SELECT = [
  { value: 'serie_d',          label: 'Serie D' },
  { value: 'eccellenza',       label: 'Eccellenza' },
  { value: 'promozione',       label: 'Promozione' },
  { value: 'prima_categoria',  label: 'Prima Categoria' },
  { value: 'scuola_calcio',    label: 'Altro' },
]

// ── Stili condivisi ──────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--white)',
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: 'var(--gray)',
  marginBottom: 6,
}

// ── Componente principale ────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<StepId>(1)
  const [clubId, setClubId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [inviatoCount, setInviatoCount] = useState(0)

  // Step 1
  const [clubData, setClubData] = useState<ClubData>({
    nome: '', citta: '', provincia: '', categoria: 'eccellenza',
    anno_fondazione: '', colori_sociali: '',
  })

  // Step 2
  const [categorieSelezionate, setCategorieSelezionate] = useState<string[]>([])

  // Step 3
  const [staff, setStaff] = useState<InvitoStaff[]>(RUOLI_STAFF.map(r => ({ ...r })))

  // Carica lo step corrente dal DB all'avvio
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: utente } = await supabase
        .from('utenti').select('club_id, ruolo').eq('id', user.id).maybeSingle()
      if (!utente?.club_id) return

      // Solo il presidente può completare l'onboarding
      if (utente.ruolo && utente.ruolo !== 'presidente') {
        router.push('/dashboard')
        return
      }

      setClubId(utente.club_id)

      const { data: club } = await supabase
        .from('clubs')
        .select('onboarding_step, onboarding_completed, nome, citta, provincia, categoria, anno_fondazione, colori_sociali')
        .eq('id', utente.club_id)
        .maybeSingle()

      if (!club) return

      // Se già completato → redirect dashboard
      if (club.onboarding_completed) {
        router.push('/dashboard/presidente')
        return
      }

      const savedStep = Math.max(1, Math.min(4, club.onboarding_step ?? 1)) as StepId
      setStep(savedStep)

      if (club.nome) {
        setClubData({
          nome: club.nome ?? '',
          citta: club.citta ?? '',
          provincia: club.provincia ?? '',
          categoria: club.categoria ?? 'eccellenza',
          anno_fondazione: club.anno_fondazione ? String(club.anno_fondazione) : '',
          colori_sociali: club.colori_sociali ?? '',
        })
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveStep = useCallback(async (nextStep: StepId) => {
    if (!clubId) return
    await supabase.from('clubs').update({ onboarding_step: nextStep }).eq('id', clubId)
  }, [clubId, supabase])

  // ── STEP 1: Salva dati club ──────────────────────────────────────────────
  async function handleStep1() {
    if (!clubId || !clubData.nome.trim() || !clubData.citta.trim()) return
    setSaving(true)
    await supabase.from('clubs').update({
      nome:            clubData.nome.trim(),
      citta:           clubData.citta.trim(),
      provincia:       clubData.provincia.trim() || null,
      categoria:       clubData.categoria,
      anno_fondazione: clubData.anno_fondazione ? parseInt(clubData.anno_fondazione) : null,
      colori_sociali:  clubData.colori_sociali.trim() || null,
    }).eq('id', clubId)
    await saveStep(2)
    setStep(2)
    setSaving(false)
  }

  // ── STEP 2: Crea squadre ─────────────────────────────────────────────────
  async function handleStep2() {
    if (!clubId) return
    setSaving(true)

    const squadre = [
      { nome: 'Prima Squadra', categoria_eta: 'prima_squadra' },
      ...categorieSelezionate.map(cat => ({
        nome: CATEGORIE_GIOVANILI.find(c => c.id === cat)?.label ?? cat,
        categoria_eta: cat,
      })),
    ]

    await fetch('/api/onboarding/crea-squadre', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ squadre }),
    })

    await saveStep(3)
    setStep(3)
    setSaving(false)
  }

  // ── STEP 3: Invia inviti staff ───────────────────────────────────────────
  async function handleStep3(skipInvites = false) {
    if (!clubId) return
    setSaving(true)

    let count = 0
    if (!skipInvites) {
      const emailsValide = staff.filter(s => s.email.trim())
      for (const membro of emailsValide) {
        try {
          await fetch('/api/inviti/genera', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ruolo: membro.ruolo, scadenzaGiorni: 30 }),
          })
          count++
        } catch { /* ignora singoli errori */ }
      }
    }

    setInviatoCount(count)
    await saveStep(4)
    setStep(4)
    setSaving(false)
  }

  // ── STEP 4: Completa onboarding ──────────────────────────────────────────
  async function handleComplete() {
    if (!clubId) return
    setSaving(true)
    await supabase.from('clubs').update({
      onboarding_completed: true,
      onboarding_step: 4,
    }).eq('id', clubId)
    router.push('/dashboard/presidente')
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--black)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px 80px',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <img src="/clubis-logo.png" alt="ClubIS" style={{ height: 52, display: 'inline-block' }} />
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: 580, marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          {['Club', 'Squadre', 'Staff', 'Pronti'].map((label, i) => {
            const n = (i + 1) as StepId
            const done = step > n
            const active = step === n
            return (
              <div key={n} style={{ textAlign: 'center', flex: 1 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', margin: '0 auto 6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? 'var(--accent)' : active ? 'rgba(200,240,0,0.15)' : 'var(--surface)',
                  border: `1px solid ${done || active ? 'var(--accent)' : 'var(--border)'}`,
                  fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 12,
                  color: done ? '#000' : active ? 'var(--accent)' : 'var(--gray)',
                }}>
                  {done ? '✓' : n}
                </div>
                <div style={{
                  fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: active ? 'var(--accent)' : done ? 'var(--white)' : 'var(--gray)',
                }}>
                  {label}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ height: 3, background: 'var(--border)', position: 'relative' }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, height: '100%',
            background: 'var(--accent)',
            width: `${((step - 1) / 3) * 100}%`,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Card wizard */}
      <div style={{
        width: '100%', maxWidth: 580,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        padding: '40px 36px',
      }}>

        {/* ─── STEP 1 ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20,
              textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--white)',
              marginBottom: 6,
            }}>
              Crea il tuo club
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 32 }}>
              Inserisci le informazioni base del tuo club. Potrai completarle in seguito.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>Nome società *</label>
                <input style={inputStyle} placeholder="es. ASD Atletico Roma"
                  value={clubData.nome}
                  onChange={e => setClubData(d => ({ ...d, nome: e.target.value }))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Città *</label>
                  <input style={inputStyle} placeholder="Roma"
                    value={clubData.citta}
                    onChange={e => setClubData(d => ({ ...d, citta: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Prov.</label>
                  <input style={inputStyle} placeholder="RM" maxLength={2}
                    value={clubData.provincia}
                    onChange={e => setClubData(d => ({ ...d, provincia: e.target.value }))} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Categoria</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={clubData.categoria}
                  onChange={e => setClubData(d => ({ ...d, categoria: e.target.value }))}
                >
                  {CATEGORIE_SELECT.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Anno fondazione</label>
                  <input style={inputStyle} placeholder="1985" type="number" min={1800} max={2030}
                    value={clubData.anno_fondazione}
                    onChange={e => setClubData(d => ({ ...d, anno_fondazione: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Colori sociali</label>
                  <input style={inputStyle} placeholder="Blu e giallo"
                    value={clubData.colori_sociali}
                    onChange={e => setClubData(d => ({ ...d, colori_sociali: e.target.value }))} />
                </div>
              </div>
            </div>

            <button
              onClick={handleStep1}
              disabled={saving || !clubData.nome.trim() || !clubData.citta.trim()}
              style={{
                marginTop: 36, width: '100%', padding: '14px 24px',
                background: 'var(--accent)', color: '#000',
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14,
                textTransform: 'uppercase', letterSpacing: '0.08em', border: 'none',
                cursor: saving || !clubData.nome.trim() || !clubData.citta.trim() ? 'not-allowed' : 'pointer',
                opacity: saving || !clubData.nome.trim() || !clubData.citta.trim() ? 0.5 : 1,
              }}
            >
              {saving ? 'Salvataggio...' : 'Avanti →'}
            </button>
          </div>
        )}

        {/* ─── STEP 2 ─────────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20,
              textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--white)',
              marginBottom: 6,
            }}>
              Configura le tue squadre
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Seleziona le categorie giovanili attive nel tuo club. La prima squadra è sempre inclusa.
            </p>

            {/* Prima squadra — sempre presente */}
            <div style={{
              padding: '12px 16px', marginBottom: 16,
              background: 'rgba(200,240,0,0.06)',
              border: '1px solid rgba(200,240,0,0.3)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 18, height: 18, background: 'var(--accent)', borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)' }}>Prima Squadra</div>
                <div style={{ fontSize: 11, color: 'var(--gray)' }}>Sempre inclusa</div>
              </div>
            </div>

            {/* Settore giovanile */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
              {CATEGORIE_GIOVANILI.map(cat => {
                const sel = categorieSelezionate.includes(cat.id)
                return (
                  <label key={cat.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', cursor: 'pointer',
                    border: `1px solid ${sel ? 'rgba(200,240,0,0.4)' : 'var(--border)'}`,
                    background: sel ? 'rgba(200,240,0,0.05)' : 'transparent',
                  }}>
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => setCategorieSelezionate(prev =>
                        sel ? prev.filter(c => c !== cat.id) : [...prev, cat.id]
                      )}
                      style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--white)' }}>{cat.label}</span>
                  </label>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep(1)} style={{
                flex: '0 0 auto', padding: '13px 20px',
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--gray)', cursor: 'pointer', fontFamily: 'var(--font-display)',
                fontWeight: 700, fontSize: 13,
              }}>
                ← Indietro
              </button>
              <button onClick={handleStep2} disabled={saving} style={{
                flex: 1, padding: '13px 20px',
                background: 'var(--accent)', color: '#000',
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14,
                textTransform: 'uppercase', letterSpacing: '0.06em', border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
              }}>
                {saving ? 'Salvataggio...' : 'Avanti →'}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3 ─────────────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20,
              textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--white)',
              marginBottom: 6,
            }}>
              Invita il tuo staff
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>
              Inserisci le email dei tuoi collaboratori. Riceveranno un invito per creare il proprio account.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
              {staff.map((membro, idx) => (
                <div key={membro.ruolo} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {membro.label}
                  </div>
                  <input
                    type="email"
                    placeholder={`email@club.it (opzionale)`}
                    style={inputStyle}
                    value={membro.email}
                    onChange={e => {
                      const updated = [...staff]
                      updated[idx] = { ...updated[idx], email: e.target.value }
                      setStaff(updated)
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => setStep(2)} style={{
                padding: '13px 20px',
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--gray)', cursor: 'pointer', fontFamily: 'var(--font-display)',
                fontWeight: 700, fontSize: 13,
              }}>
                ← Indietro
              </button>
              <button onClick={() => handleStep3(false)} disabled={saving} style={{
                flex: 1, padding: '13px 20px',
                background: 'var(--accent)', color: '#000',
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14,
                textTransform: 'uppercase', letterSpacing: '0.06em', border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
              }}>
                {saving ? 'Invio...' : 'Avanti →'}
              </button>
              <button onClick={() => handleStep3(true)} disabled={saving} style={{
                padding: '13px 16px',
                background: 'transparent', border: 'none',
                color: 'var(--gray)', cursor: 'pointer', fontSize: 12,
                textDecoration: 'underline',
              }}>
                Salta, lo faccio dopo
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 4 ─────────────────────────────────────────────── */}
        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, margin: '0 auto 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(200,240,0,0.1)', border: '1px solid rgba(200,240,0,0.4)',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>

            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22,
              textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--white)',
              marginBottom: 12,
            }}>
              Sei pronto!
            </h2>

            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 32 }}>
              Il tuo ClubIS è configurato. Inizia dalla dashboard per esplorare tutte le funzionalità.
            </p>

            {/* Riepilogo */}
            <div style={{
              textAlign: 'left', padding: '20px 24px', marginBottom: 32,
              border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 12 }}>
                Riepilogo configurazione
              </div>
              <div style={{ fontSize: 13, color: 'var(--white)', marginBottom: 6 }}>
                <strong>Club:</strong> {clubData.nome || '—'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--white)', marginBottom: 6 }}>
                <strong>Categorie configurate:</strong> Prima Squadra
                {categorieSelezionate.length > 0 && ` + ${categorieSelezionate.length} giovanili`}
              </div>
              <div style={{ fontSize: 13, color: 'var(--white)' }}>
                <strong>Inviti inviati:</strong> {inviatoCount}
              </div>
            </div>

            <button onClick={handleComplete} disabled={saving} style={{
              width: '100%', padding: '16px 24px',
              background: 'var(--accent)', color: '#000',
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15,
              textTransform: 'uppercase', letterSpacing: '0.08em', border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
            }}>
              {saving ? 'Accesso in corso...' : 'Entra nella tua dashboard →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
