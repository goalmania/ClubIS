import { createClient } from '@/lib/supabase/server'

/* ─── Mappatura colore per categoria ───────────────────────── */

const CAT_COLOR: Record<string, string> = {
  sportivo:         'var(--verde)',
  economico:        'var(--accent)',
  finanziario:      'var(--accent)',
  crescita_giovani: 'var(--ambra)',
  strutturale:      'var(--accent)',
  comunicazione:    '#a371f7',
  altro:            'var(--grigio-3)',
}

const STATO_BADGE: Record<string, string> = {
  in_corso:      'badge-ambra',
  raggiunto:     'badge-verde',
  non_raggiunto: 'badge-rosso',
  sospeso:       'badge-grigio',
}

/* ─── Componente ────────────────────────────────────────────── */

type Props = { clubId: string; ruolo: string }

export default async function ObiettiviWidget({ clubId, ruolo }: Props) {
  const supabase = createClient()

  const { data: obiettivi } = await supabase
    .from('obiettivi_club')
    .select('id, titolo, categoria, stato, progresso, scadenza, target')
    .eq('club_id', clubId)
    .contains('ruoli_visibili', [ruolo])
    .neq('stato', 'non_raggiunto')
    .order('priorita')
    .limit(5)

  if (!obiettivi || obiettivi.length === 0) return null

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
      {/* Header */}
      <div style={{
        padding: '12px 18px',
        borderBottom: '1px solid var(--grigio-5)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.08em',
        fontSize: 12,
        color: 'var(--grigio-3)',
      }}>
        <span style={{ color: 'var(--accent)', fontSize: 10 }}>◆</span>
        Obiettivi Club
        <span style={{
          marginLeft: 'auto',
          fontSize: 10,
          fontWeight: 500,
          color: 'var(--grigio-4)',
          textTransform: 'none' as const,
          letterSpacing: 0,
          fontFamily: 'var(--font-mono)',
        }}>
          {obiettivi.filter(o => o.stato === 'raggiunto').length}/{obiettivi.length} raggiunti
        </span>
      </div>

      {/* Lista */}
      {obiettivi.map((o, idx) => {
        const col = CAT_COLOR[o.categoria] ?? 'var(--grigio-3)'
        const isLast = idx === obiettivi.length - 1
        return (
          <div
            key={o.id}
            style={{
              padding: '10px 18px',
              borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
              borderLeft: `3px solid ${col}`,
            }}
          >
            {/* Titolo + badge stato */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
              <span style={{
                fontSize: 13,
                fontWeight: 500,
                fontFamily: 'var(--font-display)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.04em',
                color: 'var(--white)',
                flex: 1,
              }}>
                {o.titolo}
              </span>
              <span className={`badge ${STATO_BADGE[o.stato] ?? 'badge-grigio'}`} style={{ flexShrink: 0, fontSize: 10 }}>
                {o.stato.replace('_', ' ')}
              </span>
            </div>

            {/* Target */}
            {o.target && (
              <div style={{ fontSize: 11, color: 'var(--grigio-4)', marginBottom: 5 }}>
                {o.target}
              </div>
            )}

            {/* Scadenza */}
            {o.scadenza && (
              <div style={{ fontSize: 10, color: 'var(--grigio-4)', marginBottom: 5, fontFamily: 'var(--font-mono)' }}>
                Scad. {new Date(o.scadenza).toLocaleDateString('it-IT')}
              </div>
            )}

            {/* Progress bar */}
            {o.progresso > 0 && (
              <div className="progress" style={{ height: 3, marginTop: 4 }}>
                <div
                  className="progress-fill"
                  style={{ width: `${o.progresso}%`, background: col }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
