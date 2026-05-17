import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ruoloShort } from '@/lib/helpers'

/* ─── Stato medico ───────────────────────────────────────────────── */

type StatoMedico = 'idoneo' | 'in_recupero' | 'infortunato' | 'cert_scadenza'

const STATO_CFG: Record<StatoMedico, { label: string; badge: string; rowBg?: string; border?: string }> = {
  idoneo:       { label: 'Idoneo',          badge: 'badge-verde' },
  in_recupero:  { label: 'In recupero',     badge: 'badge-ambra', rowBg: 'rgba(255,170,0,0.03)',  border: 'var(--ambra)' },
  infortunato:  { label: 'Infortunato',     badge: 'badge-rosso', rowBg: 'rgba(255,68,68,0.05)',  border: 'var(--rosso)' },
  cert_scadenza:{ label: 'Cert. scadenza',  badge: 'badge-ambra', rowBg: 'rgba(255,170,0,0.03)',  border: 'var(--ambra)' },
}

/* ─── Pagina ─────────────────────────────────────────────────────── */

export default async function MedicoGiocatoriPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  const { clubId } = ctx

  const admin = createAdminClient()

  const oggi  = new Date().toISOString().split('T')[0]
  const in30g = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  // Prima squadra con fallback a tutti i tesserati del club
  const { data: sqPS } = await admin.from('squadre').select('id')
    .eq('club_id', clubId).eq('categoria_eta', 'prima_squadra').eq('attiva', true)
  const sqIds = (sqPS ?? []).map(s => s.id)

  let tesserati: any[] | null = null
  if (sqIds.length > 0) {
    const { data } = await admin.from('tesseramenti')
      .select('giocatori(id, nome, cognome, ruolo_principale, data_nascita)')
      .in('squadra_id', sqIds).eq('stato', 'attivo')
    tesserati = data
  }
  if (!tesserati || tesserati.length === 0) {
    const { data } = await admin.from('tesseramenti')
      .select('giocatori(id, nome, cognome, ruolo_principale, data_nascita)')
      .eq('club_id', clubId).eq('stato', 'attivo')
    tesserati = data
  }

  const [
    { data: infortuni },
    { data: certsScadenza },
    { data: certsScaduti },
  ] = await Promise.all([
    admin
      .from('infortuni')
      .select('giocatore_id, gravita, data_rientro_prevista, tipo')
      .eq('club_id', clubId)
      .is('data_rientro_effettiva', null),
    admin
      .from('certificati_medici')
      .select('giocatore_id, data_scadenza')
      .eq('club_id', clubId)
      .gte('data_scadenza', oggi)
      .lte('data_scadenza', in30g),
    admin
      .from('certificati_medici')
      .select('giocatore_id, data_scadenza')
      .eq('club_id', clubId)
      .lt('data_scadenza', oggi),
  ])

  const seen = new Set<string>()
  const giocatori = (tesserati ?? [])
    .map(t => t.giocatori as any)
    .filter(g => g?.id && !seen.has(g.id) && seen.add(g.id))

  /* ── Determina stato medico ──────────────────────────────────── */

  function statoMedico(id: string): StatoMedico {
    const infort = infortuni?.find(i => i.giocatore_id === id)
    if (infort) {
      const gg = infort.data_rientro_prevista
        ? Math.ceil((new Date(infort.data_rientro_prevista).getTime() - Date.now()) / 86400000)
        : null
      return gg !== null && gg >= 0 && gg <= 7 ? 'in_recupero' : 'infortunato'
    }
    if (certsScadenza?.find(c => c.giocatore_id === id)) return 'cert_scadenza'
    if (certsScaduti?.find(c => c.giocatore_id === id)) return 'cert_scadenza'
    return 'idoneo'
  }

  const counts: Record<StatoMedico, number> = {
    idoneo: 0, in_recupero: 0, infortunato: 0, cert_scadenza: 0,
  }
  giocatori.forEach(g => { counts[statoMedico(g.id)]++ })

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
          Stato medico giocatori
        </h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          {giocatori.length} giocatori tesserati attivi
        </p>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Idonei</div>
          <div className="stat-value" style={{ color: 'var(--verde)' }}>{counts.idoneo}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In recupero</div>
          <div className="stat-value" style={{ color: counts.in_recupero > 0 ? 'var(--ambra)' : undefined }}>
            {counts.in_recupero}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Infortunati</div>
          <div className="stat-value" style={{ color: counts.infortunato > 0 ? 'var(--rosso)' : undefined }}>
            {counts.infortunato}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cert. scadenza</div>
          <div className="stat-value" style={{ color: counts.cert_scadenza > 0 ? 'var(--ambra)' : undefined }}>
            {counts.cert_scadenza}
          </div>
        </div>
      </div>

      {/* Alert */}
      {counts.infortunato > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: 14 }}>
          <strong>{counts.infortunato} giocator{counts.infortunato === 1 ? 'e infortunato' : 'i infortunati'}.</strong>{' '}
          Verifica le schede infortuni.
        </div>
      )}
      {counts.cert_scadenza > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 14 }}>
          ⚠ {counts.cert_scadenza} giocatori con certificato in scadenza o scaduto.
        </div>
      )}

      {/* Tabella */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Giocatore</th>
                <th>Ruolo</th>
                <th>Età</th>
                <th>Stato medico</th>
                <th>Dettaglio</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {giocatori.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--grigio-4)', fontSize: 13 }}>
                    Nessun giocatore tesserato attivo
                  </td>
                </tr>
              ) : giocatori.map((g: any) => {
                const stato = statoMedico(g.id)
                const cfg = STATO_CFG[stato]
                const infort = infortuni?.find(i => i.giocatore_id === g.id)
                const certScad = certsScadenza?.find(c => c.giocatore_id === g.id)
                  ?? certsScaduti?.find(c => c.giocatore_id === g.id)
                const eta = g.data_nascita
                  ? new Date().getFullYear() - new Date(g.data_nascita).getFullYear()
                  : null

                return (
                  <tr key={g.id} style={{ background: cfg.rowBg }}>
                    <td style={{
                      fontWeight: 500, fontSize: 13,
                      borderLeft: cfg.border ? `2px solid ${cfg.border}` : '2px solid transparent',
                    }}>
                      {g.cognome} {g.nome}
                    </td>
                    <td>
                      {g.ruolo_principale
                        ? <span className="badge badge-grigio" style={{ fontSize: 10 }}>{ruoloShort[g.ruolo_principale] ?? g.ruolo_principale}</span>
                        : <span style={{ color: 'var(--grigio-4)' }}>—</span>
                      }
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--grigio-3)' }}>
                      {eta ?? '—'}
                    </td>
                    <td>
                      <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>
                      {infort && (
                        <span>
                          {infort.tipo} &middot; rientro{' '}
                          <span style={{ fontFamily: 'var(--font-mono)' }}>
                            {infort.data_rientro_prevista
                              ? new Date(infort.data_rientro_prevista).toLocaleDateString('it-IT')
                              : 'n.d.'
                            }
                          </span>
                        </span>
                      )}
                      {!infort && certScad && (
                        <span>
                          Cert. scade{' '}
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ambra)' }}>
                            {new Date(certScad.data_scadenza).toLocaleDateString('it-IT')}
                          </span>
                        </span>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/dashboard/medico/cartelle/${g.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 11 }}
                      >
                        Cartella
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
