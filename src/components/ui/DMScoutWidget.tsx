'use client'
import { useState } from 'react'

interface Props {
  attivo:   boolean
  scadenza?: string | null
  clubId:   string
}

export default function DMScoutWidget({ attivo, scadenza, clubId }: Props) {
  const [expanded, setExpanded] = useState(false)
  void clubId // usato in futuro per integrazioni API

  const scadenzaDate = scadenza ? new Date(scadenza) : null
  const scaduto      = scadenzaDate ? scadenzaDate < new Date() : false
  const giorniRimasti = scadenzaDate && !scaduto
    ? Math.ceil((scadenzaDate.getTime() - Date.now()) / 86400000)
    : null

  /* ── Non abbonato ── */
  if (!attivo || scaduto) {
    return (
      <div style={{
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        marginBottom: 24,
      }}>
        <div style={{
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🔭</span>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 900,
                textTransform: 'uppercase', fontSize: 13, color: 'var(--white)',
              }}>
                DM Scout
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: 'var(--gray)', letterSpacing: '0.1em',
              }}>
                {scaduto ? 'Abbonamento scaduto' : 'Non attivo'}
              </div>
            </div>
          </div>
          <a
            href="/dashboard/presidente/abbonamento"
            className="btn btn-primary btn-sm"
            style={{ fontSize: 11 }}
          >
            {scaduto ? 'Rinnova ClubIS Pro →' : 'Attiva ClubIS Pro →'}
          </a>
        </div>

        <div style={{
          padding: '12px 18px',
          borderTop: '1px solid var(--border)',
          background: 'rgba(200,240,0,0.02)',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--gray)', lineHeight: 1.6,
          }}>
            Con <strong style={{ color: 'var(--accent)' }}>ClubIS Pro + DM Scout</strong> hai accesso a:
            <br />· Database giocatori con profili completi e statistiche
            <br />· Analisi comparativa per ogni ruolo
            <br />· Report automatici pre-partita
            <br />· Integrazione diretta con la rosa ClubIS
          </div>
        </div>
      </div>
    )
  }

  /* ── Abbonato attivo ── */
  return (
    <div style={{
      border: '1px solid rgba(200,240,0,0.3)',
      background: 'rgba(200,240,0,0.04)',
      marginBottom: 24,
    }}>
      <button
        onClick={() => setExpanded(p => !p)}
        style={{
          width: '100%', padding: '14px 18px', background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🔭</span>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 900,
              textTransform: 'uppercase', fontSize: 13, color: 'var(--accent)',
            }}>
              DM Scout · Attivo
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--gray)', letterSpacing: '0.1em',
            }}>
              {giorniRimasti !== null
                ? `Abbonamento in scadenza tra ${giorniRimasti} giorni`
                : scadenza
                  ? `Scade il ${new Date(scadenza).toLocaleDateString('it-IT')}`
                  : 'Abbonamento attivo'
              }
            </div>
          </div>
        </div>
        <span style={{ color: 'var(--accent)', fontSize: 16 }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{
          borderTop: '1px solid rgba(200,240,0,0.2)',
          padding: '16px 18px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 10,
        }}>
          {[
            { icona: '🔍', label: 'Cerca giocatori',  href: `${process.env.NEXT_PUBLIC_DMSCOUT_URL ?? 'https://dmscout.app'}/database` },
            { icona: '📊', label: 'Report scouting',  href: `${process.env.NEXT_PUBLIC_DMSCOUT_URL ?? 'https://dmscout.app'}/add-report` },
            { icona: '🆚', label: 'Confronto profili', href: `${process.env.NEXT_PUBLIC_DMSCOUT_URL ?? 'https://dmscout.app'}/compare` },
            { icona: '📋', label: 'Shortlist',         href: `${process.env.NEXT_PUBLIC_DMSCOUT_URL ?? 'https://dmscout.app'}/unlocked` },
          ].map(item => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px',
                border: '1px solid rgba(200,240,0,0.15)',
                background: 'rgba(200,240,0,0.03)',
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icona}</span>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                textTransform: 'uppercase', fontSize: 11,
                color: 'var(--white)', letterSpacing: '0.06em',
              }}>
                {item.label}
              </span>
            </a>
          ))}
        </div>
      )}

      {giorniRimasti !== null && giorniRimasti <= 7 && (
        <div style={{
          padding: '10px 18px',
          borderTop: '1px solid rgba(200,240,0,0.2)',
          background: 'rgba(245,158,11,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ambra)' }}>
            ⚠ Abbonamento in scadenza tra {giorniRimasti} giorni
          </span>
          <a
            href="/dashboard/presidente/abbonamento"
            className="btn btn-sm"
            style={{ fontSize: 11, borderColor: 'var(--ambra)', color: 'var(--ambra)' }}
          >
            Rinnova →
          </a>
        </div>
      )}
    </div>
  )
}
