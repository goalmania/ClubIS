'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const WIZARD_ROLE = 'import_wizard_segretario'

const TEMPLATE_GIOCATORI = [
  'cognome,nome,data_nascita,codice_fiscale,ruolo,piede,altezza,peso,email,telefono,numero_maglia',
  'Rossi,Mario,15/03/2001,RSSMRA01C15H501Z,Centrocampista,Destro,178,74,mario.rossi@email.it,3331234567,10',
  'Bianchi,Luca,22/07/1999,BNCLCU99L22F205X,Attaccante,Sinistro,182,78,luca.bianchi@email.it,3342345678,9',
  'Verdi,Andrea,01/01/2002,VRDNDR02A01D612Y,Difensore,Destro,185,80,andrea.verdi@email.it,3353456789,5',
].join('\n')

const TEMPLATE_FAMIGLIE = [
  'cognome_genitore,nome_genitore,email,telefono,relazione,cognome_bambino,nome_bambino,data_nascita_bambino',
  'Esposito,Antonio,antonio.esposito@gmail.com,3331122334,Padre,Esposito,Lorenzo,14/03/2016',
  'Ferrara,Maria,maria.ferrara@gmail.com,3342233445,Madre,Ferrara,Mattia,22/07/2015',
  'De Santis,Giovanni,giovanni.desantis@libero.it,3353344556,Padre,De Santis,Filippo,08/11/2016',
].join('\n')

function getTemplateContabile() {
  const y = new Date().getFullYear()
  const m = String(new Date().getMonth() + 1).padStart(2, '0')
  return [
    'data,tipo,categoria,importo,descrizione,controparte,note',
    `03/${m}/${y},entrata,Quote Associative,150.00,Quota mensile,Rossi Mario,`,
    `05/${m}/${y},uscita,Affitto Impianti,800.00,Affitto campo sportivo,Comune,`,
    `10/${m}/${y},entrata,Sponsor,500.00,Sponsorizzazione maglia,Bar Centrale,`,
    `15/${m}/${y},uscita,Arbitraggi,90.00,Compenso arbitro,AIA Sezione Bari,`,
  ].join('\n')
}

function downloadCSV(content: string, filename: string) {
  const bom = '﻿'
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

interface WizardStep {
  icon: string
  title: string
  text: string
  cta: string
  secondary: { label: string; onDownload: () => void } | null
}

const STEPS: WizardStep[] = [
  {
    icon: '⬆️',
    title: 'Importa i dati del tuo club in pochi click',
    text: "Puoi importare giocatori, famiglie, dati contabili e il calendario partite da file Excel/CSV. Segui i passaggi nell'ordine consigliato per popolare correttamente il gestionale.",
    cta: 'Inizia →',
    secondary: null,
  },
  {
    icon: '👤',
    title: '1. Inizia dai giocatori',
    text: "Carica il file Excel con l'anagrafica dei giocatori della rosa. Scarica il template di esempio per vedere il formato corretto delle colonne.",
    cta: 'Avanti →',
    secondary: {
      label: 'Scarica template giocatori',
      onDownload: () => downloadCSV(TEMPLATE_GIOCATORI, 'template-giocatori-ClubIS.csv'),
    },
  },
  {
    icon: '👨‍👩‍👧',
    title: '2. Importa le famiglie della scuola calcio',
    text: 'Carica il file con i dati di genitori e tesserati della scuola calcio. I giocatori verranno automaticamente collegati alle rispettive famiglie nel gestionale pagamenti.',
    cta: 'Avanti →',
    secondary: {
      label: 'Scarica template famiglie',
      onDownload: () => downloadCSV(TEMPLATE_FAMIGLIE, 'template-famiglie-ClubIS.csv'),
    },
  },
  {
    icon: '💰',
    title: '3. Importa i dati contabili',
    text: 'Carica il file con entrate e uscite della stagione precedente. I dati popoleranno automaticamente prima nota, rendiconto e budget del club.',
    cta: 'Avanti →',
    secondary: {
      label: 'Scarica template contabile',
      onDownload: () => downloadCSV(getTemplateContabile(), 'template-contabile-ClubIS.csv'),
    },
  },
  {
    icon: '📅',
    title: '4. Importa il calendario partite',
    text: 'Importa automaticamente le partite dal calendario della federazione inserendo il link. Le partite appariranno nel calendario e nella sezione partite.',
    cta: 'Ho capito, inizia a importare',
    secondary: null,
  },
]

export default function ImportOnboardingModal() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [animated, setAnimated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    checkFirstAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fade-in on show
  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setAnimated(true), 30)
      return () => clearTimeout(t)
    } else {
      setAnimated(false)
    }
  }, [visible])

  async function checkFirstAccess() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .eq('role', WIZARD_ROLE)
      .maybeSingle()

    if (error) return

    if (!data) {
      const { error: insertError } = await supabase
        .from('onboarding_progress')
        .insert({ user_id: user.id, role: WIZARD_ROLE })
      if (!insertError) setVisible(true)
      return
    }

    if (!data.onboarding_completed) {
      setVisible(true)
    }
  }

  async function complete() {
    if (userId) {
      await supabase
        .from('onboarding_progress')
        .update({
          onboarding_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('role', WIZARD_ROLE)
    }
    setAnimated(false)
    setTimeout(() => setVisible(false), 220)
  }

  async function handleCta() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      await complete()
    }
  }

  if (!visible) return null

  const current = STEPS[step]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: animated ? 'rgba(0,0,0,0.78)' : 'rgba(0,0,0,0)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        transition: 'background 0.22s ease',
      }}
    >
      <div
        style={{
          background: '#000',
          border: '1px solid rgba(200,240,0,0.4)',
          borderRadius: 20,
          padding: '32px 36px',
          width: '100%',
          maxWidth: 500,
          position: 'relative',
          opacity: animated ? 1 : 0,
          transform: animated ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.97)',
          transition: 'opacity 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Skip button */}
        <button
          onClick={complete}
          style={{
            position: 'absolute',
            top: 16,
            right: 20,
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.28)',
            fontSize: 12,
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          Salta ×
        </button>

        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28, justifyContent: 'center' }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 22 : 6,
                height: 6,
                borderRadius: 99,
                background:
                  i === step
                    ? '#c8f000'
                    : i < step
                      ? 'rgba(200,240,0,0.38)'
                      : 'rgba(255,255,255,0.12)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Icon */}
        <div style={{ fontSize: 52, marginBottom: 16, textAlign: 'center' }}>
          {current.icon}
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 20,
            color: '#fff',
            marginBottom: 12,
            textAlign: 'center',
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
          }}
        >
          {current.title}
        </div>

        {/* Body text */}
        <p
          style={{
            color: 'rgba(255,255,255,0.58)',
            fontSize: 14,
            lineHeight: 1.7,
            margin: '0 0 24px',
            textAlign: 'center',
          }}
        >
          {current.text}
        </p>

        {/* Secondary download button */}
        {current.secondary && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <button
              onClick={current.secondary.onDownload}
              style={{
                background: 'transparent',
                border: '1px solid rgba(200,240,0,0.38)',
                borderRadius: 8,
                color: '#c8f000',
                fontSize: 13,
                fontWeight: 600,
                padding: '9px 20px',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                transition: 'border-color 0.15s',
              }}
            >
              ↓ {current.secondary.label}
            </button>
          </div>
        )}

        {/* Primary CTA */}
        <button
          onClick={handleCta}
          style={{
            width: '100%',
            background: '#c8f000',
            border: 'none',
            borderRadius: 10,
            color: '#000',
            fontWeight: 800,
            fontSize: 15,
            padding: '13px 0',
            cursor: 'pointer',
            letterSpacing: '0.02em',
          }}
        >
          {current.cta}
        </button>

        {/* Counter */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 14,
            color: 'rgba(255,255,255,0.2)',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {step + 1} / {STEPS.length}
        </div>
      </div>
    </div>
  )
}
