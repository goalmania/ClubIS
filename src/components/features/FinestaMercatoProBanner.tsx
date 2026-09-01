'use client'
import { useCategoriaPro } from '@/hooks/useCategoriaPro'

/**
 * Finestre di mercato Serie C (Lega Pro) — regolamento FIGC stagione corrente:
 * - Estiva:   01/07 → 31/08
 * - Invernale: 02/01 → 31/01
 */
const FINESTRE = [
  { nome: 'Estiva',    apre: [7, 1],  chiude: [8, 31] },   // [mese, giorno] 1-indexed
  { nome: 'Invernale', apre: [1, 2],  chiude: [1, 31] },
]

function getFinestra(oggi: Date): {
  dentro: boolean
  nome: string
  giorni: number
  label: string
} {
  const y = oggi.getFullYear()

  for (const f of FINESTRE) {
    // Prova con anno corrente e anno prossimo per la finestra invernale
    for (const anno of [y, y + 1]) {
      const apertura = new Date(anno, f.apre[0] - 1, f.apre[1])
      const chiusura = new Date(anno, f.chiude[0] - 1, f.chiude[1], 23, 59, 59)

      if (oggi >= apertura && oggi <= chiusura) {
        const giorni = Math.ceil((chiusura.getTime() - oggi.getTime()) / 86400000)
        return { dentro: true, nome: f.nome, giorni, label: chiusura.toLocaleDateString('it-IT', { day: '2-digit', month: 'long' }) }
      }
    }
  }

  // Fuori da tutte le finestre — trova la prossima apertura
  let prossimaApertura: Date | null = null
  let prossimaNome = ''

  for (const f of FINESTRE) {
    for (const anno of [y, y + 1]) {
      const apertura = new Date(anno, f.apre[0] - 1, f.apre[1])
      if (apertura > oggi) {
        if (!prossimaApertura || apertura < prossimaApertura) {
          prossimaApertura = apertura
          prossimaNome = f.nome
        }
      }
    }
  }

  const giorni = prossimaApertura
    ? Math.ceil((prossimaApertura.getTime() - oggi.getTime()) / 86400000)
    : 0

  return {
    dentro: false,
    nome: prossimaNome,
    giorni,
    label: prossimaApertura?.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }) ?? '',
  }
}

export default function FinestaMercatoProBanner() {
  const { isPro } = useCategoriaPro()
  if (!isPro) return null

  const info = getFinestra(new Date())

  if (info.dentro) {
    const urgente = info.giorni <= 3
    const color  = urgente ? '#ff4444' : info.giorni <= 7 ? '#ffd600' : '#4cff88'
    const bg     = urgente ? 'rgba(255,68,68,0.06)' : info.giorni <= 7 ? 'rgba(255,214,0,0.06)' : 'rgba(76,255,136,0.06)'
    const border = urgente ? 'rgba(255,68,68,0.2)'  : info.giorni <= 7 ? 'rgba(255,214,0,0.2)'  : 'rgba(76,255,136,0.2)'

    return (
      <div style={{ padding: '14px 20px', background: bg, border: `1px solid ${border}`, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}` }} />
        <div style={{ flex: 1 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color }}>
            Finestra {info.nome} APERTA
          </span>
          <span style={{ fontSize: 12, color: 'var(--grigio-3)', marginLeft: 12 }}>
            Chiusura {info.label} — {urgente ? '⚠ ' : ''}{info.giorni} {info.giorni === 1 ? 'giorno rimasto' : 'giorni rimasti'}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color, minWidth: 40, textAlign: 'right' }}>
          {info.giorni}gg
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '14px 20px', background: 'rgba(150,150,150,0.05)', border: '1px solid var(--grigio-5)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--grigio-4)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grigio-3)' }}>
          Finestra di mercato CHIUSA
        </span>
        <span style={{ fontSize: 12, color: 'var(--grigio-4)', marginLeft: 12 }}>
          Prossima apertura: finestra {info.nome} il {info.label} ({info.giorni} giorni)
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--grigio-3)', minWidth: 60, textAlign: 'right' }}>
        -{info.giorni}gg
      </div>
    </div>
  )
}
