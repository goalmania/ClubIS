import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// ── helpers ───────────────────────────────────────────────────────────────────

function coloreScore(v: number) {
  if (v >= 85) return 'var(--accent-green)'
  if (v >= 60) return 'var(--accent-orange)'
  return 'var(--accent-red)'
}

function ScoreBar({ value, color, thin }: { value: number; color: string; thin?: boolean }) {
  return (
    <div style={{ height: thin ? 4 : 10, background: 'var(--bg-input)', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.min(100, Math.max(0, value))}%`,
        background: color, transition: 'width 0.4s ease',
      }} />
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function SegretarioCompliancePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utente, error: utenteError } = await supabase
    .from('utenti').select('club_id').eq('id', user.id).single()
  if (utenteError || !utente) redirect('/auth/errore')

  const clubId = utente.club_id
  const oggi   = new Date().toISOString().split('T')[0]
  const in30   = new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0]
  const in90   = new Date(Date.now() + 90 * 86_400_000).toISOString().split('T')[0]

  // ── fetch parallelo ────────────────────────────────────────────────────────
  const [
    { data: tessAttiviRows },
    { data: tessScad30Rows },
    { data: certValideRows },
    { data: certNearRows },
    { data: certScaduteRows },
    { data: gdprRows },
    { data: contrValidiRows },
    { data: contrScad90Rows },
  ] = await Promise.all([
    // tesseramenti attivi — lista giocatore_id per analisi per-player
    supabase.from('tesseramenti').select('giocatore_id')
      .eq('club_id', clubId).eq('stato', 'attivo'),

    // tesseramenti attivi con data_fine nei prossimi 30gg
    supabase.from('tesseramenti').select('giocatore_id')
      .eq('club_id', clubId).eq('stato', 'attivo')
      .gte('data_fine', oggi).lte('data_fine', in30),

    // certificati medici non ancora scaduti (data_scadenza > oggi)
    supabase.from('certificati_medici').select('giocatore_id')
      .eq('club_id', clubId).gt('data_scadenza', oggi),

    // certificati in scadenza entro 30gg (subset dei validi)
    supabase.from('certificati_medici').select('giocatore_id')
      .eq('club_id', clubId).gte('data_scadenza', oggi).lte('data_scadenza', in30),

    // certificati già scaduti
    supabase.from('certificati_medici').select('giocatore_id')
      .eq('club_id', clubId).lt('data_scadenza', oggi),

    // giocatori con consenso GDPR firmato
    supabase.from('giocatori').select('id')
      .eq('club_id', clubId).eq('consenso_gdpr', true),

    // contratti ancora validi (contratti non ha colonna stato — filtro per data)
    supabase.from('contratti').select('giocatore_id')
      .eq('club_id', clubId).gte('data_scadenza', oggi),

    // contratti in scadenza entro 90gg
    supabase.from('contratti').select('giocatore_id')
      .eq('club_id', clubId).gte('data_scadenza', oggi).lte('data_scadenza', in90),
  ])

  // ── set per-player ─────────────────────────────────────────────────────────

  const activePSet    = new Set<string>((tessAttiviRows   ?? []).map(t => t.giocatore_id).filter(Boolean) as string[])
  const certValidePSet = new Set<string>((certValideRows  ?? []).map(c => c.giocatore_id).filter(Boolean) as string[])
  const certNearPSet   = new Set<string>((certNearRows    ?? []).map(c => c.giocatore_id).filter(Boolean) as string[])
  const certScadPSet   = new Set<string>((certScaduteRows ?? []).map(c => c.giocatore_id).filter(Boolean) as string[])
  const gdprOkPSet     = new Set<string>((gdprRows        ?? []).map(g => g.id).filter(Boolean) as string[])

  const nActive  = activePSet.size
  const activeArr = [...activePSet]

  // ── analisi certificati medici ────────────────────────────────────────────
  // "pieno"    = cert valido con più di 30gg alla scadenza
  // "near"     = cert valido ma entro 30gg dalla scadenza (warning)
  // "mancante" = nessun cert valido (scaduto o mai inserito)
  const nCertPieno    = activeArr.filter(id =>  certValidePSet.has(id) && !certNearPSet.has(id)).length
  const nCertNear     = activeArr.filter(id =>  certNearPSet.has(id)).length
  const nCertMancante = nActive - nCertPieno - nCertNear

  // giocatori con solo cert scaduto (nessun valido)
  const nCertSoloScaduto = activeArr.filter(id => certScadPSet.has(id) && !certValidePSet.has(id)).length

  // ── analisi tesseramenti ───────────────────────────────────────────────────
  const nTessExpiring = (tessScad30Rows ?? []).length

  // ── analisi GDPR ───────────────────────────────────────────────────────────
  const nGdprOk      = activeArr.filter(id => gdprOkPSet.has(id)).length
  const nGdprMancante = nActive - nGdprOk

  // ── analisi contratti (solo display — opzionali) ──────────────────────────
  const nContrValidi  = new Set((contrValidiRows ?? []).map(c => c.giocatore_id).filter(Boolean)).size
  const nContrScad90  = new Set((contrScad90Rows ?? []).map(c => c.giocatore_id).filter(Boolean)).size

  // ── score per componente (0–100) ───────────────────────────────────────────
  //
  // Certificati (60% del totale):
  //   pieno = 100%, near = 50%, mancante = 0%
  const certScore = nActive > 0
    ? Math.round(((nCertPieno + nCertNear * 0.5) / nActive) * 100)
    : 0

  // Tesseramenti (25% del totale):
  //   penalità proporzionale ai tesseramenti in scadenza
  const tessScore = nActive > 0
    ? Math.max(0, Math.round((1 - nTessExpiring / nActive) * 100))
    : 0

  // GDPR (15% del totale):
  //   percentuale di tesserati con consenso firmato
  const gdprScore = nActive > 0
    ? Math.round((nGdprOk / nActive) * 100)
    : 0

  // ── indice finale ──────────────────────────────────────────────────────────
  // Con nActive === 0 il punteggio è 0, non 100 (assenza di dati ≠ conformità)
  const scoreCompl = nActive === 0
    ? 0
    : Math.round(certScore * 0.60 + tessScore * 0.25 + gdprScore * 0.15)

  const colScore = coloreScore(scoreCompl)

  // ── componenti per la UI ───────────────────────────────────────────────────
  const componenti = [
    {
      icona: '🏥',
      label: 'Certificati medici',
      peso: '60%',
      score: certScore,
      dettaglio: nActive === 0
        ? 'Nessun tesserato attivo'
        : `${nCertPieno} validi · ${nCertNear} in scadenza · ${nCertMancante} mancanti`,
      href: '/dashboard/segretario/certificati',
      critici: nCertMancante,
      warn: nCertNear,
    },
    {
      icona: '📋',
      label: 'Tesseramenti',
      peso: '25%',
      score: tessScore,
      dettaglio: nActive === 0
        ? 'Nessun tesserato attivo'
        : `${nActive} attivi${nTessExpiring > 0 ? ` · ${nTessExpiring} in scadenza nei prossimi 30gg` : ' · nessuno in scadenza'}`,
      href: '/dashboard/segretario/tesseramenti',
      critici: 0,
      warn: nTessExpiring,
    },
    {
      icona: '✅',
      label: 'Consenso GDPR',
      peso: '15%',
      score: gdprScore,
      dettaglio: nActive === 0
        ? 'Nessun tesserato attivo'
        : `${nGdprOk} su ${nActive} con consenso firmato${nGdprMancante > 0 ? ` · ${nGdprMancante} mancanti` : ''}`,
      href: '/dashboard/segretario/tesseramenti',
      critici: nGdprMancante,
      warn: 0,
    },
  ]

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* ── Intestazione ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)',
        }}>
          Compliance
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Conformità documentale e scadenze federali
        </p>
      </div>

      {/* ── Indice di conformità ──────────────────────────────────────── */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Indice di conformità
          </span>
          {nActive === 0 ? (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              N/A — nessun tesserato attivo
            </span>
          ) : (
            <span style={{ fontSize: 22, fontWeight: 900, color: colScore, fontFamily: 'var(--font-mono)' }}>
              {scoreCompl}<span style={{ fontSize: 13, fontWeight: 400 }}>/100</span>
            </span>
          )}
        </div>
        <ScoreBar value={scoreCompl} color={colScore} />
        {nActive > 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Basato su <strong style={{ color: 'var(--text-secondary)' }}>{nActive}</strong> tesserati attivi
            {' · '}Pesi: certificati 60% · tesseramenti 25% · GDPR 15%
          </div>
        )}
      </div>

      {/* ── Componenti ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {componenti.map(c => {
          const col = coloreScore(c.score)
          return (
            <Link href={c.href} key={c.label} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '14px 18px' }}>
                {/* Header riga */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{c.icona}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {c.label}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginRight: 8 }}>
                    peso {c.peso}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: col, fontFamily: 'var(--font-mono)', minWidth: 36, textAlign: 'right' }}>
                    {c.score}%
                  </span>
                </div>

                {/* Barra */}
                <ScoreBar value={c.score} color={col} thin />

                {/* Dettaglio */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.dettaglio}</span>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    {c.critici > 0 && (
                      <span className="badge badge-rosso">{c.critici}</span>
                    )}
                    {c.warn > 0 && (
                      <span className="badge badge-ambra">{c.warn}</span>
                    )}
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 2 }}>→</span>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}

        {/* Contratti — informativo, non nel punteggio (tabella senza colonna stato) */}
        <Link href="/dashboard/ds/contratti" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '14px 18px', opacity: 0.75 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>📄</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Contratti</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    non incluso nel punteggio
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {nContrValidi} attivi
                  {nContrScad90 > 0 ? ` · ${nContrScad90} in scadenza entro 90gg` : ''}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                {nContrScad90 > 0 && <span className="badge badge-ambra">{nContrScad90}</span>}
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>→</span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Alert critici ─────────────────────────────────────────────── */}
      {nActive > 0 && (nCertMancante > 0 || nCertSoloScaduto > 0) && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>
            {nCertMancante > 0 && (
              <><strong>{nCertMancante} tesserato{nCertMancante > 1 ? 'i' : ''}</strong> {nCertMancante > 1 ? 'sono privi' : 'è privo'} di certificato medico valido.</>
            )}
            {nCertSoloScaduto > 0 && nCertMancante === 0 && (
              <><strong>{nCertSoloScaduto} certificato{nCertSoloScaduto > 1 ? 'i' : ''}</strong> scadut{nCertSoloScaduto > 1 ? 'i' : 'o'} senza rinnovo.</>
            )}
            {' '}<Link href="/dashboard/segretario/certificati" style={{ color: 'inherit', fontWeight: 700 }}>Gestisci →</Link>
          </span>
        </div>
      )}

      <div style={{ marginTop: 4 }}>
        <Link href="/dashboard/segretario" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>
    </div>
  )
}
