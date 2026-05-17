import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function IndisponibiliPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: utente, error: utenteError } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (utenteError || !utente) redirect('/auth/errore')

  const admin = createAdminClient()

  // ── Passo 1: ID squadre prima_squadra del club (con allenatore abbinato o fallback) ──
  const { data: sqAssegnate } = await admin.from('squadre').select('id')
    .eq('club_id', utente.club_id).eq('allenatore_id', user.id)
    .eq('categoria_eta', 'prima_squadra').eq('attiva', true)

  let sqIds: string[] = (sqAssegnate ?? []).map(s => s.id)
  if (sqIds.length === 0) {
    const { data: sqClub } = await admin.from('squadre').select('id')
      .eq('club_id', utente.club_id).eq('categoria_eta', 'prima_squadra').eq('attiva', true)
    sqIds = (sqClub ?? []).map(s => s.id)
  }

  // ── Passo 2: giocatori della prima squadra tramite tesseramenti ──
  const { data: tessData } = await admin
    .from('tesseramenti')
    .select('giocatore_id, numero_maglia, giocatori(id, nome, cognome, ruolo_principale)')
    .in('squadra_id', sqIds.length ? sqIds : ['none'])
    .eq('stato', 'attivo')
    .not('giocatore_id', 'is', null)

  const playerIds = (tessData ?? []).map((t: any) => t.giocatore_id).filter(Boolean) as string[]

  // Mappa giocatore_id → dati giocatore + numero_maglia
  const playerMap: Record<string, { id: string; nome: string; cognome: string; ruolo_principale: string | null; numero_maglia: string | number | null }> = {}
  for (const t of tessData ?? []) {
    const g: any = t.giocatori
    if (g?.id) {
      playerMap[g.id] = {
        id: g.id,
        nome: g.nome,
        cognome: g.cognome,
        ruolo_principale: g.ruolo_principale,
        numero_maglia: (t as any).numero_maglia ?? null,
      }
    }
  }

  if (playerIds.length === 0) {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Indisponibili</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Infortunati, squalificati e non idonei — situazione rosa</p>
        </div>
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Nessun giocatore tesserato trovato per questo club.
        </div>
        <div style={{ marginTop: 20 }}>
          <Link href="/dashboard/allenatore" className="btn btn-secondary btn-sm">← Dashboard</Link>
        </div>
      </div>
    )
  }

  // ── Passo 2: le tre fonti di indisponibilità in parallelo ──
  const [infortunatiRes, squalificatiRes, nonIdoneiRes] = await Promise.all([
    admin
      .from('infortuni')
      .select('id, tipo, gravita, data_infortunio, data_rientro_prevista, giocatore_id')
      .in('giocatore_id', playerIds)
      .is('data_rientro_effettiva', null),
    admin
      .from('squalifiche')
      .select('id, motivo, partite_restanti, data_inizio, giocatore_id')
      .in('giocatore_id', playerIds)
      .gt('partite_restanti', 0),
    admin
      .from('visite_mediche')
      .select('id, tipo, data, note, giocatore_id')
      .in('giocatore_id', playerIds)
      .eq('esito', 'non_idoneo'),
  ])

  const infortunati = infortunatiRes.data ?? []
  const squalificati = squalificatiRes.data ?? []
  const nonIdonei = nonIdoneiRes.data ?? []

  const totale = infortunati.length + squalificati.length + nonIdonei.length

  const oggi = new Date()
  const formatGG = (d: string) => {
    const diff = Math.ceil((new Date(d).getTime() - oggi.getTime()) / 86400000)
    if (diff <= 0) return 'rientro imminente'
    return `${diff} gg al rientro`
  }

  const gravitaColore: Record<string, string> = {
    lieve: 'badge-verde', moderato: 'badge-ambra', grave: 'badge-rosso',
  }

  const PlayerBadge = ({ gid, maglia }: { gid: string; maglia?: string | number | null }) => {
    const g = playerMap[gid]
    if (!g) return <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</span>
    const num = maglia ?? g.numero_maglia
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {num != null && (
          <span style={{ width: 22, height: 22, borderRadius: 4, background: 'var(--bg-input)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
            {num}
          </span>
        )}
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{g.cognome} {g.nome}</span>
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Indisponibili</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Infortunati · Squalificati · Non idonei — situazione rosa
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">🏥 Infortunati</div>
          <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{infortunati.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🟥 Squalificati</div>
          <div className="stat-value" style={{ color: 'var(--accent-orange)' }}>{squalificati.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🩺 Non idonei</div>
          <div className="stat-value" style={{ color: 'var(--accent-purple, #a855f7)' }}>{nonIdonei.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Totale indisponibili</div>
          <div className="stat-value">{totale}</div>
        </div>
      </div>

      {/* ── Tre colonne ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>

        {/* Infortunati */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600, color: 'var(--accent-red)' }}>
            🏥 Infortunati
          </div>
          {infortunati.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nessun infortunato
            </div>
          ) : infortunati.map(i => (
            <div key={i.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <PlayerBadge gid={i.giocatore_id} />
                <span className={`badge ${gravitaColore[(i as any).gravita] ?? 'badge-grigio'}`}>{(i as any).gravita}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{i.tipo}</div>
              {(i as any).data_rientro_prevista && (
                <div style={{ fontSize: 11, color: 'var(--accent-blue)', marginTop: 3 }}>
                  {formatGG((i as any).data_rientro_prevista)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Squalificati */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600, color: 'var(--accent-orange)' }}>
            🟥 Squalificati
          </div>
          {squalificati.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nessuno squalificato
            </div>
          ) : squalificati.map(s => (
            <div key={s.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <PlayerBadge gid={s.giocatore_id} />
                <span className="badge badge-rosso">{s.partite_restanti} gior{s.partite_restanti > 1 ? 'nate' : 'nata'}</span>
              </div>
              {s.motivo && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.motivo}</div>}
            </div>
          ))}
        </div>

        {/* Non idonei da visita medica */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600, color: 'var(--accent-purple, #a855f7)' }}>
            🩺 Non idonei
          </div>
          {nonIdonei.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nessun giocatore non idoneo
            </div>
          ) : nonIdonei.map(v => (
            <div key={v.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <PlayerBadge gid={v.giocatore_id} />
                <span className="badge badge-grigio">non idoneo</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v.tipo ?? 'visita medica'}</div>
              {v.data && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  {new Date(v.data).toLocaleDateString('it-IT')}
                </div>
              )}
              {v.note && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, fontStyle: 'italic' }}>
                  {v.note}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>

      <div style={{ marginTop: 20 }}>
        <Link href="/dashboard/allenatore" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>
    </div>
  )
}
