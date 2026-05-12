'use client'

import { useState } from 'react'
import QuickPianoPagamento, { type TemplateRata } from '@/components/forms/QuickPianoPagamento'

type Template = { nome: string; rate: TemplateRata[] }

const TEMPLATES_SCUOLA: Template[] = [
  {
    nome: 'Quota mensile famiglie',
    rate: Array.from({ length: 10 }, (_, i) => ({ numero: i + 1, importoDef: 80, mesiDaOggi: i })),
  },
  {
    nome: 'Iscrizione stagionale',
    rate: [{ numero: 1, importoDef: 200, mesiDaOggi: 0 }],
  },
  {
    nome: 'Kit divisa',
    rate: [
      { numero: 1, importoDef: 75, mesiDaOggi: 0 },
      { numero: 2, importoDef: 75, mesiDaOggi: 1 },
    ],
  },
  {
    nome: 'Campo estivo / torneo',
    rate: [{ numero: 1, importoDef: 150, mesiDaOggi: 0 }],
  },
]

const TEMPLATES_DILETT: Template[] = [
  {
    nome: 'Rimborso mensile giocatore',
    rate: Array.from({ length: 10 }, (_, i) => ({ numero: i + 1, importoDef: 300, mesiDaOggi: i })),
  },
  {
    nome: 'Premio promozione',
    rate: [{ numero: 1, importoDef: 500, mesiDaOggi: 0 }],
  },
  {
    nome: 'Quota affiliazione FIGC',
    rate: [{ numero: 1, importoDef: 100, mesiDaOggi: 2 }],
  },
]

export default function TemplatesRapidi({
  clubId,
  tipoOrganizzazione,
}: {
  clubId: string
  tipoOrganizzazione: string
}) {
  const isScuola = tipoOrganizzazione === 'scuola_calcio'
  const templates = isScuola ? TEMPLATES_SCUOLA : TEMPLATES_DILETT

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sel, setSel] = useState<Template | null>(null)

  const apri = (t: Template) => {
    setSel(t)
    setDrawerOpen(true)
  }

  return (
    <>
      <div className="card">
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Nuovo piano di pagamento rapido
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
          {isScuola
            ? 'Piani comuni per scuola calcio — clicca per pre-compilare il form'
            : 'Piani comuni per società dilettantistica — clicca per pre-compilare il form'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {templates.map(t => (
            <button
              key={t.nome}
              onClick={() => apri(t)}
              style={{
                textAlign: 'left',
                padding: '12px 16px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                cursor: 'pointer',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 500,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'border-color 0.15s',
              }}
            >
              <span>{t.nome}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {t.rate.length === 1 ? '1 rata' : `${t.rate.length} rate`} →
              </span>
            </button>
          ))}
        </div>
      </div>

      {sel && (
        <QuickPianoPagamento
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          clubId={clubId}
          templateNome={sel.nome}
          templateRate={sel.rate}
        />
      )}
    </>
  )
}
