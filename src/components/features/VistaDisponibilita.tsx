import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  getDisponibilitaSquadra,
  countByStato,
  type DisponibilitaGiocatore,
  type StatoDisponibilita,
} from '@/lib/disponibilita'

/* ─── Config per stato ───────────────────────────────────────── */

const STATO_CFG: Record<StatoDisponibilita, {
  label: string; color: string; bg: string; border: string; icon: string
}> = {
  disponibile:        { label: 'Disponibile',     color: 'var(--accent)',        bg: 'rgba(200,240,0,0.07)',  border: 'rgba(200,240,0,0.25)',  icon: '●' },
  diffidato:          { label: 'Diffidato',        color: 'var(--ambra)',         bg: 'rgba(255,153,0,0.07)', border: 'rgba(255,153,0,0.25)',  icon: '⚡' },
  squalificato:       { label: 'Squalificato',     color: 'var(--rosso)',         bg: 'rgba(255,68,68,0.07)', border: 'rgba(255,68,68,0.25)',  icon: '✕' },
  infortunato:        { label: 'Infortunato',      color: 'var(--rosso)',         bg: 'rgba(255,68,68,0.07)', border: 'rgba(255,68,68,0.25)',  icon: '✚' },
  in_recupero:        { label: 'In recupero',      color: 'var(--ambra)',         bg: 'rgba(255,153,0,0.07)', border: 'rgba(255,153,0,0.25)',  icon: '◐' },
  certificato_scaduto:{ label: 'Cert. scaduto',    color: '#ff6600',              bg: 'rgba(255,102,0,0.07)', border: 'rgba(255,102,0,0.25)',  icon: '⚠' },
  non_tesserato:      { label: 'Non tesserato',    color: 'var(--grigio-4)',      bg: 'transparent',          border: 'var(--grigio-5)',       icon: '○' },
}

/* ─── Ordine di priorità per la lista ────────────────────────── */

const PRIORITA: Record<StatoDisponibilita, number> = {
  disponibile:         0,
  diffidato:           1,
  in_recupero:         2,
  infortunato:         3,
  squalificato:        3,
  certificato_scaduto: 4,
  non_tesserato:       5,
}

/* ─── Componente ─────────────────────────────────────────────── */

type Props = { clubId: string; ruolo: string }

export default async function VistaDisponibilita({ clubId, ruolo }: Props) {
  const supabase  = createClient()
  const giocatori = await getDisponibilitaSquadra(supabase as any, clubId)
  const counts    = countByStato(giocatori)

  // Prossima partita programmata
  const { data: prossime } = await supabase
    .from('partite')
    .select('id, avversario, data_ora, competizione, giornata, casa_trasferta')
    .eq('club_id', clubId)
    .gte('data_ora', new Date().toISOString())
    .eq('stato', 'programmata')
    .order('data_ora')
    .limit(1)
  const prossima = prossime?.[0]

  const ordinati = [...giocatori].sort(
    (a, b) => (PRIORITA[a.stato] ?? 5) - (PRIORITA[b.stato] ?? 5),
  )

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
          letterSpacing: '0.25em', color: 'var(--accent)',
          textTransform: 'uppercase', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          DISPONIBILITÀ ROSA
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26,
          textTransform: 'uppercase', letterSpacing: '-0.01em',
          color: 'var(--white)', marginBottom: 6,
        }}>
          Chi può giocare
        </h1>
        {prossima ? (
          <p style={{ fontSize: 13, color: 'var(--gray)', fontWeight: 300 }}>
            Prossima gara:{' '}
            <strong style={{ color: 'var(--white)' }}>
              vs {prossima.avversario}
            </strong>
            {' '}·{' '}
            {new Date(prossima.data_ora).toLocaleDateString('it-IT', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
            {prossima.giornata ? ` · Giornata ${prossima.giornata}` : ''}
            {' · '}
            <span style={{ color: prossima.casa_trasferta === 'casa' ? 'var(--accent)' : 'var(--grigio-3)' }}>
              {prossima.casa_trasferta === 'casa' ? 'In casa' : 'In trasferta'}
            </span>
          </p>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--grigio-4)' }}>
            Nessuna partita programmata
          </p>
        )}
      </div>

      {/* ── KPI strip ───────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 1, background: 'var(--grigio-5)', marginBottom: 24,
        borderRadius: 8, overflow: 'hidden',
      }}>
        {([
          { label: 'Disponibili',   n: counts.disponibili,  color: 'var(--accent)' },
          { label: 'Diffidati',     n: counts.diffidati,    color: 'var(--ambra)' },
          { label: 'Squalificati',  n: counts.squalificati, color: 'var(--rosso)' },
          { label: 'Infortunati',   n: counts.infortunati,  color: 'var(--rosso)' },
          { label: 'Cert. scaduti', n: counts.cert_scaduto, color: '#ff6600' },
        ] as { label: string; n: number; color: string }[]).map(k => (
          <div key={k.label} style={{ background: 'var(--gray-light)', padding: '16px 18px' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30,
              color: k.n > 0 ? k.color : 'var(--grigio-4)', lineHeight: 1,
            }}>
              {k.n}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--grigio-4)', marginTop: 5,
            }}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Alert critici ───────────────────────────────────── */}
      {counts.indisponibili > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1 }}>
            <strong>{counts.indisponibili} giocatori</strong> non disponibili per la prossima gara.
            {counts.cert_scaduto > 0 && (
              <> · <strong>{counts.cert_scaduto}</strong> con certificato scaduto — rinnovo urgente.</>
            )}
          </span>
          {ruolo === 'segretario' && counts.cert_scaduto > 0 && (
            <Link
              href="/dashboard/segretario/certificati"
              style={{
                fontFamily: 'var(--font-display)', fontSize: 11,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: 'inherit', textDecoration: 'none', fontWeight: 700,
                flexShrink: 0,
              }}
            >
              GESTISCI CERTIFICATI →
            </Link>
          )}
        </div>
      )}

      {giocatori.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
          Nessun giocatore tesserato attivo
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header colonne */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '44px 1fr 140px 1fr',
            padding: '10px 18px',
            borderBottom: '1px solid var(--grigio-5)',
            background: '#111',
            gap: 0,
          }}>
            {['#', 'Giocatore', 'Stato', 'Motivazione / Dettaglio'].map(h => (
              <div key={h} style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'var(--grigio-4)',
              }}>
                {h}
              </div>
            ))}
          </div>

          {/* Righe giocatori */}
          {ordinati.map((g: DisponibilitaGiocatore) => {
            const cfg = STATO_CFG[g.stato]
            return (
              <div
                key={g.giocatore_id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 1fr 140px 1fr',
                  padding: '13px 18px',
                  borderBottom: '1px solid var(--border)',
                  borderLeft: `3px solid ${cfg.color}`,
                  background: cfg.bg,
                  alignItems: 'center',
                  gap: 0,
                }}
              >
                {/* Numero maglia */}
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
                  color: g.numero_maglia ? cfg.color : 'var(--grigio-4)',
                }}>
                  {g.numero_maglia ?? '—'}
                </div>

                {/* Nome + ruolo */}
                <div>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                    fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.03em',
                    color: 'var(--white)',
                  }}>
                    {g.cognome} {g.nome}
                  </div>
                  {g.ruolo_principale && (
                    <div style={{
                      fontSize: 10, color: 'var(--grigio-4)',
                      fontFamily: 'var(--font-mono)', marginTop: 1,
                    }}>
                      {g.ruolo_principale.replace(/_/g, ' ').toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Badge stato */}
                <div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px',
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                    fontSize: '0.62rem', letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: cfg.color,
                  }}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>

                {/* Motivi e alert */}
                <div>
                  {g.motivi.map((m, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--grigio-3)', fontWeight: 300, lineHeight: 1.4 }}>
                      {m}
                    </div>
                  ))}
                  {g.alert.map((a, i) => (
                    <div key={i} style={{
                      fontSize: 11, color: 'var(--ambra)',
                      fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', marginTop: 2,
                    }}>
                      {a}
                    </div>
                  ))}
                  {g.dati.squalifica?.scade_dopo_partita && (
                    <div style={{
                      fontSize: 10, color: 'var(--accent)', marginTop: 3,
                      fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
                    }}>
                      ✓ TORNA DISPONIBILE DOPO QUESTA PARTITA
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Azioni rapide per ruolo ──────────────────────────── */}
      <div style={{
        marginTop: 20, padding: '14px 18px',
        background: 'var(--gray-light)', border: '1px solid var(--border)',
        borderRadius: 8,
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
          letterSpacing: '0.14em', color: 'var(--grigio-4)',
          textTransform: 'uppercase', marginRight: 4,
        }}>
          Azioni rapide →
        </span>

        {ruolo === 'segretario' && (
          <>
            <Link href="/dashboard/segretario/figc/squalifiche" className="btn btn-secondary btn-sm">
              Squalifiche FIGC
            </Link>
            <Link href="/dashboard/segretario/certificati" className="btn btn-secondary btn-sm">
              Certificati medici
            </Link>
          </>
        )}

        {ruolo === 'allenatore' && (
          <>
            <Link href="/dashboard/allenatore/convocazioni" className="btn btn-primary btn-sm">
              Genera convocazioni →
            </Link>
            <Link href="/dashboard/allenatore/indisponibili" className="btn btn-secondary btn-sm">
              Gestisci infortuni
            </Link>
          </>
        )}

        {ruolo === 'ds' && (
          <>
            <Link href="/dashboard/ds/rosa" className="btn btn-secondary btn-sm">
              Gestione rosa
            </Link>
            <Link href="/dashboard/ds/contratti" className="btn btn-secondary btn-sm">
              Contratti
            </Link>
          </>
        )}

        {ruolo === 'presidente' && (
          <Link href="/dashboard/presidente/report" className="btn btn-secondary btn-sm">
            Report mensile
          </Link>
        )}
      </div>
    </div>
  )
}
