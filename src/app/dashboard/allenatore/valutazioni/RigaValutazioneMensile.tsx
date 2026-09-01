'use client'
import { useState } from 'react'
import { ASSI_VALUTAZIONE, type AsseValutazione, type DettaglioAssi } from '@/lib/valutazioni-mensili'

function Stelle({ n }: { n: number }) {
  return (
    <span style={{ letterSpacing: 1, color: 'var(--accent)' }}>
      {'★'.repeat(n)}<span style={{ color: 'var(--gray-mid)' }}>{'★'.repeat(5 - n)}</span>
    </span>
  )
}

interface Props {
  giocatoreNome: string
  mese: string
  tecnico: number
  impegno: number
  rispetto_regole: number
  socializzazione: number
  nota: string
  dettaglioAssi: DettaglioAssi | null
}

export default function RigaValutazioneMensile({
  giocatoreNome, mese, tecnico, impegno, rispetto_regole, socializzazione, nota, dettaglioAssi,
}: Props) {
  const [aperto, setAperto] = useState(false)
  const finali: Record<AsseValutazione, number> = { tecnico, impegno, rispetto_regole, socializzazione }

  return (
    <>
      <tr style={{ cursor: dettaglioAssi ? 'pointer' : 'default' }} onClick={() => dettaglioAssi && setAperto(a => !a)}>
        <td style={{ fontWeight: 500, fontSize: 13 }}>
          {dettaglioAssi && <span style={{ color: 'var(--gray)', marginRight: 6 }}>{aperto ? '▾' : '▸'}</span>}
          {giocatoreNome}
        </td>
        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{mese}</td>
        <td><Stelle n={tecnico} /></td>
        <td><Stelle n={impegno} /></td>
        <td><Stelle n={rispetto_regole} /></td>
        <td><Stelle n={socializzazione} /></td>
        <td style={{ fontSize: 12, color: 'var(--grigio-3)', maxWidth: 260 }}>{nota}</td>
      </tr>
      {aperto && dettaglioAssi && (
        <tr>
          <td colSpan={7} style={{ background: 'var(--bg-card, #161616)', padding: '16px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {(Object.keys(ASSI_VALUTAZIONE) as AsseValutazione[]).map(asseKey => {
                const asse = ASSI_VALUTAZIONE[asseKey]
                const voti = dettaglioAssi[asseKey] ?? {}
                return (
                  <div key={asseKey}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{asse.label}</span>
                      <Stelle n={finali[asseKey]} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {asse.sottocategorie.map(sc => (
                        <div key={sc.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--grigio-3)' }}>
                          <span>{sc.label}</span>
                          <Stelle n={voti[sc.key] ?? 0} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
