import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const ruoloLabel: Record<string, string> = {
  portiere: 'Portiere', difensore: 'Difensore', terzino: 'Terzino',
  mediano: 'Mediano', centrocampista: 'Centrocampista', mezzala: 'Mezzala',
  regista: 'Regista', trequartista: 'Trequartista', ala: 'Ala',
  attaccante: 'Attaccante', seconda_punta: 'Seconda punta',
}

const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export default async function DSStatistichePage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  const { clubId } = ctx

  const admin = createAdminClient()

  const oggi = new Date()
  const tra6Mesi = new Date(oggi); tra6Mesi.setMonth(oggi.getMonth() + 6)
  const inizioMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1)
  const trenta = new Date(oggi); trenta.setDate(oggi.getDate() - 30)

  // Prima squadra con fallback su tutti i tesseramenti del club
  const { data: sqPS } = await admin.from('squadre').select('id')
    .eq('club_id', clubId).eq('categoria_eta', 'prima_squadra').eq('attiva', true)
  const sqIds = (sqPS ?? []).map(s => s.id)

  let tesseratiPS: any[] | null = null
  if (sqIds.length > 0) {
    const { data } = await admin
      .from('tesseramenti')
      .select('giocatore_id, giocatori(id, ruolo_principale, data_nascita, nazionalita_tipo)')
      .in('squadra_id', sqIds)
      .eq('stato', 'attivo')
    tesseratiPS = data
  }
  if (!tesseratiPS || tesseratiPS.length === 0) {
    const { data } = await admin
      .from('tesseramenti')
      .select('giocatore_id, giocatori(id, ruolo_principale, data_nascita, nazionalita_tipo)')
      .eq('club_id', clubId)
      .eq('stato', 'attivo')
    tesseratiPS = data
  }

  type GiocPS = { id: string; ruolo_principale: string | null; data_nascita: string | null; nazionalita_tipo: string | null }
  const giocatori: GiocPS[] = tesseratiPS?.map(t => t.giocatori as unknown as GiocPS).filter(Boolean) ?? []
  const giocatoriIds = giocatori.map(g => g.id)

  const [
    { data: trattative },
    { data: contratti },
    { data: scouting },
    { data: presenze },
    { data: clubs },
  ] = await Promise.all([
    admin.from('trattative')
      .select('tipo, stato, importo_accordo')
      .eq('club_id', clubId),
    giocatoriIds.length > 0
      ? admin.from('contratti')
          .select('data_scadenza, giocatore_id')
          .eq('club_id', clubId)
          .in('giocatore_id', giocatoriIds)
      : Promise.resolve({ data: [] }),
    admin.from('report_scouting')
      .select('esito, potenziale, created_at')
      .eq('club_richiedente_id', clubId),
    giocatoriIds.length > 0
      ? admin.from('presenze')
          .select('giocatore_id, presente')
          .eq('club_id', clubId)
          .in('giocatore_id', giocatoriIds)
          .gte('registrato_at', trenta.toISOString())
      : Promise.resolve({ data: [] }),
    admin.from('clubs')
      .select('nome')
      .eq('id', clubId).single(),
  ])

  // ── Rosa per ruolo ──────────────────────────────────────────────────────────
  const rosaPerRuolo: { ruolo: string; n: number }[] = []
  const ruoliMap: Record<string, number> = {}
  giocatori?.forEach(g => {
    const r = g.ruolo_principale ?? 'altro'
    ruoliMap[r] = (ruoliMap[r] ?? 0) + 1
  })
  Object.entries(ruoliMap).sort((a, b) => b[1] - a[1]).forEach(([ruolo, n]) => rosaPerRuolo.push({ ruolo, n }))
  const maxRuolo = Math.max(...rosaPerRuolo.map(r => r.n), 1)

  // ── Età media e fasce ────────────────────────────────────────────────────────
  const etaCalc = (dn: string) => {
    const d = new Date(dn)
    let age = oggi.getFullYear() - d.getFullYear()
    const m = oggi.getMonth() - d.getMonth()
    if (m < 0 || (m === 0 && oggi.getDate() < d.getDate())) age--
    return age
  }
  const eta = giocatori?.filter(g => g.data_nascita).map(g => etaCalc(g.data_nascita!)) ?? []
  const etaMedia = eta.length ? Math.round(eta.reduce((a, b) => a + b, 0) / eta.length) : 0
  const fasceEta = {
    u20:  eta.filter(e => e < 20).length,
    m2025: eta.filter(e => e >= 20 && e < 25).length,
    m2530: eta.filter(e => e >= 25 && e < 30).length,
    m30:  eta.filter(e => e >= 30).length,
  }

  // ── Nazionalità ─────────────────────────────────────────────────────────────
  const nazMap: Record<string, number> = {}
  giocatori?.forEach(g => {
    const cat = g.nazionalita_tipo === 'italiano' ? 'italiano' : 'straniero'
    nazMap[cat] = (nazMap[cat] ?? 0) + 1
  })
  const totGioc = giocatori?.length ?? 0

  // ── Contratti in scadenza ────────────────────────────────────────────────────
  const inScadenza = contratti?.filter(c => c.data_scadenza && new Date(c.data_scadenza) <= tra6Mesi && new Date(c.data_scadenza) >= oggi) ?? []

  // ── Trattative ───────────────────────────────────────────────────────────────
  const trattAperte  = trattative?.filter(t => !['conclusa','saltata'].includes(t.stato)).length ?? 0
  const trattConcluse = trattative?.filter(t => t.stato === 'conclusa').length ?? 0
  const trattSaltate  = trattative?.filter(t => t.stato === 'saltata').length ?? 0
  const valoreTotConcluse = trattative?.filter(t => t.stato === 'conclusa').reduce((s, t) => s + (Number(t.importo_accordo) || 0), 0) ?? 0
  const trattPerTipo: Record<string, number> = {}
  trattative?.forEach(t => { trattPerTipo[t.tipo] = (trattPerTipo[t.tipo] ?? 0) + 1 })

  // ── Scouting ─────────────────────────────────────────────────────────────────
  const totScouting = scouting?.length ?? 0
  const scoutPerEsito: Record<string, number> = {}
  scouting?.forEach(s => { scoutPerEsito[s.esito ?? 'nd'] = (scoutPerEsito[s.esito ?? 'nd'] ?? 0) + 1 })
  const reportMese = scouting?.filter(s => new Date(s.created_at) >= inizioMese).length ?? 0
  const ingaggiati = scoutPerEsito['ingaggiato'] ?? 0
  const convRate = totScouting > 0 ? Math.round((ingaggiati / totScouting) * 100) : 0

  // ── Presenze ─────────────────────────────────────────────────────────────────
  const presByGioc: Record<string, { tot: number; pres: number }> = {}
  presenze?.forEach(p => {
    if (!presByGioc[p.giocatore_id]) presByGioc[p.giocatore_id] = { tot: 0, pres: 0 }
    presByGioc[p.giocatore_id].tot++
    if (p.presente) presByGioc[p.giocatore_id].pres++
  })
  const presenze5 = Object.entries(presByGioc)
    .map(([id, v]) => ({ id, pct: v.tot > 0 ? Math.round((v.pres / v.tot) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct).slice(0, 5)
  const tuttoPres = Object.values(presByGioc)
  const mediaPresRosa = tuttoPres.length
    ? Math.round(tuttoPres.reduce((s, v) => s + (v.tot > 0 ? v.pres / v.tot : 0), 0) / tuttoPres.length * 100)
    : 0

  const SectionTitle = ({ title }: { title: string }) => (
    <div style={{
      fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em',
      color: 'var(--text-muted)', paddingBottom: 10, borderBottom: '1px solid var(--border)',
      marginBottom: 16,
    }}>{title}</div>
  )

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Statistiche DS</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Analisi rosa, mercato e scouting
        </p>
      </div>

      {/* ── Sezione 1: Composizione Rosa ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Distribuzione ruoli */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <SectionTitle title="Composizione per ruolo" />
          {rosaPerRuolo.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nessun giocatore attivo</p>
          ) : rosaPerRuolo.map(r => (
            <div key={r.ruolo} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 120, fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right', flexShrink: 0 }}>
                {ruoloLabel[r.ruolo] ?? r.ruolo}
              </div>
              <div style={{ flex: 1, height: 20, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${(r.n / maxRuolo) * 100}%`,
                  background: 'var(--accent-blue)', borderRadius: 4, minWidth: 28,
                  display: 'flex', alignItems: 'center', paddingLeft: 8,
                  fontSize: 11, color: 'white', fontWeight: 600,
                }}>
                  {r.n}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Età + nazionalità */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <SectionTitle title="Età e nazionalità" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div className="stat-card" style={{ padding: '12px 16px' }}>
              <div className="stat-label">Età media rosa</div>
              <div className="stat-value" style={{ fontSize: 28 }}>{etaMedia || '—'}</div>
            </div>
            <div className="stat-card" style={{ padding: '12px 16px' }}>
              <div className="stat-label">Giocatori attivi</div>
              <div className="stat-value" style={{ fontSize: 28 }}>{totGioc}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Fasce d'età</div>
          {[
            { l: 'Under 20', v: fasceEta.u20 },
            { l: '20 – 25',  v: fasceEta.m2025 },
            { l: '25 – 30',  v: fasceEta.m2530 },
            { l: '30+',      v: fasceEta.m30 },
          ].map(f => (
            <div key={f.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{f.l}</span>
              <span style={{ fontWeight: 600 }}>{f.v}</span>
            </div>
          ))}
          <div style={{ marginTop: 14, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Nazionalità</div>
          {Object.entries(nazMap).map(([cat, n]) => (
            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{cat}</span>
              <span style={{ fontWeight: 600 }}>{n} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({totGioc > 0 ? Math.round(n / totGioc * 100) : 0}%)</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Contratti in scadenza */}
      {inScadenza.length > 0 && (
        <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
          <SectionTitle title={`Contratti in scadenza nei prossimi 6 mesi (${inScadenza.length})`} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {inScadenza.map((c, i) => {
              const scadenza = new Date(c.data_scadenza!)
              const giorni = Math.round((scadenza.getTime() - oggi.getTime()) / 86400000)
              return (
                <div key={i} style={{
                  padding: '8px 14px', borderRadius: 8,
                  background: giorni < 60 ? 'var(--accent-red-lt)' : 'var(--accent-orange-lt)',
                  border: `1px solid ${giorni < 60 ? 'var(--accent-red)' : 'var(--accent-orange)'}22`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: giorni < 60 ? 'var(--accent-red)' : 'var(--accent-orange)' }}>
                    {giorni}gg
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {scadenza.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Sezione 2: Mercato ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ padding: '20px 24px' }}>
          <SectionTitle title="Mercato e Trattative" />
          {[
            { l: 'Trattative aperte', v: trattAperte, c: 'var(--accent-blue)' },
            { l: 'Concluse', v: trattConcluse, c: 'var(--accent-green)' },
            { l: 'Saltate', v: trattSaltate, c: 'var(--accent-red)' },
          ].map(s => (
            <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.l}</span>
              <span style={{ fontWeight: 700, color: s.c, fontSize: 16 }}>{s.v}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Valore totale concluse</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-green)', marginTop: 2 }}>
              {fmt(valoreTotConcluse)}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px 24px' }}>
          <SectionTitle title="Per tipo" />
          {Object.entries(trattPerTipo).length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nessuna trattativa</p>
          ) : Object.entries(trattPerTipo).map(([tipo, n]) => (
            <div key={tipo} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{tipo.replace('_', ' ')}</span>
              <span style={{ fontWeight: 600 }}>{n}</span>
            </div>
          ))}
        </div>

        {/* ── Sezione 3: Scouting ───────────────────────────────────────────── */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <SectionTitle title="Scouting" />
          {[
            { l: 'Giocatori monitorati', v: totScouting },
            { l: 'Report questo mese', v: reportMese },
            { l: 'Tasso conversione', v: `${convRate}%` },
          ].map(s => (
            <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.l}</span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{s.v}</span>
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Per esito</div>
            {Object.entries(scoutPerEsito).map(([esito, n]) => (
              <div key={esito} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="badge badge-grigio" style={{ fontSize: 10, textTransform: 'capitalize' }}>{esito}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sezione 4: Performance Rosa ─────────────────────────────────────── */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
        <SectionTitle title="Performance Rosa — presenze ultimi 30 giorni" />
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Media presenze</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: mediaPresRosa >= 70 ? 'var(--accent-green)' : mediaPresRosa >= 50 ? 'var(--accent-orange)' : 'var(--accent-red)' }}>
              {mediaPresRosa}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Top 5 presenze</div>
            {presenze5.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Dati non disponibili</p>
            ) : presenze5.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 16 }}>{i + 1}.</span>
                <div style={{ flex: 1, height: 16, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${p.pct}%`,
                    background: p.pct >= 70 ? 'var(--accent-green)' : 'var(--accent-orange)',
                    borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 6,
                    fontSize: 10, color: 'white', fontWeight: 600,
                  }}>
                    {p.pct}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>



      <div>
        <Link href="/dashboard/ds" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>
    </div>
  )
}
