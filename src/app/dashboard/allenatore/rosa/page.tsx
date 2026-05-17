import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { calcolaEta, ruoloShort, formatData } from '@/lib/helpers'

export default async function AllenatoreRosaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: utente, error: utenteError } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (utenteError || !utente) redirect('/auth/errore')

  const admin = createAdminClient()

  // Prima squadra: squadre con allenatore abbinato; fallback a tutte le prima_squadra del club
  const { data: sqAssegnate } = await admin.from('squadre').select('id, nome, categoria_eta')
    .eq('club_id', utente.club_id).eq('allenatore_id', user.id)
    .eq('categoria_eta', 'prima_squadra').eq('attiva', true)

  let sq = sqAssegnate ?? []
  if (sq.length === 0) {
    const { data: sqClub } = await admin.from('squadre').select('id, nome, categoria_eta')
      .eq('club_id', utente.club_id).eq('categoria_eta', 'prima_squadra').eq('attiva', true)
    sq = sqClub ?? []
  }
  const sqIds = sq.map(s => s.id)

  const { data: tesserati } = await admin
    .from('tesseramenti')
    .select('numero_maglia, squadra_id, giocatori(id, nome, cognome, data_nascita, ruolo_principale, piede, altezza_cm, peso_kg, foto_url)')
    .in('squadra_id', sqIds.length ? sqIds : ['none'])
    .eq('stato', 'attivo')

  const oggi = new Date()
  const settimanaFa = new Date(oggi); settimanaFa.setDate(oggi.getDate() - 7)

  // Presenze ultima settimana per ogni giocatore
  const sessioniQuery = admin.from('sessioni_allenamento')
    .select('id').gte('data_ora', settimanaFa.toISOString())
  const { data: sessioni } = sqIds.length
    ? await sessioniQuery.in('squadra_id', sqIds)
    : await sessioniQuery.eq('club_id', utente.club_id)

  const sessioniIds = sessioni?.map(s => s.id) ?? []
  const { data: presenze } = await admin.from('presenze')
    .select('giocatore_id, presente')
    .in('sessione_id', sessioniIds.length ? sessioniIds : ['none'])

  const presenzeMap: Record<string, { tot: number; presenti: number }> = {}
  presenze?.forEach(p => {
    if (!presenzeMap[p.giocatore_id]) presenzeMap[p.giocatore_id] = { tot: 0, presenti: 0 }
    presenzeMap[p.giocatore_id].tot++
    if (p.presente) presenzeMap[p.giocatore_id].presenti++
  })

  const ruoloGruppi: Record<string, any[]> = {
    'Portieri': [], 'Difensori': [], 'Centrocampisti': [], 'Attaccanti': [], 'N/D': []
  }
  const mappaGruppo: Record<string, string> = {
    portiere: 'Portieri',
    difensore_centrale: 'Difensori', terzino: 'Difensori',
    centrocampista_difensivo: 'Centrocampisti', centrocampista: 'Centrocampisti', trequartista: 'Centrocampisti',
    ala: 'Attaccanti', seconda_punta: 'Attaccanti', centravanti: 'Attaccanti',
  }

  tesserati?.forEach(t => {
    const g = t.giocatori as any
    const gruppo = g?.ruolo_principale ? mappaGruppo[g.ruolo_principale] ?? 'N/D' : 'N/D'
    ruoloGruppi[gruppo].push({ ...g, numero_maglia: t.numero_maglia, squadra_id: t.squadra_id })
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Rosa</h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
            {sq?.map(s => s.nome).join(', ')} · {tesserati?.length ?? 0} giocatori
          </p>
        </div>
        <Link href="/dashboard/allenatore/valutazioni/nuova" className="btn btn-primary btn-sm">+ Valuta giocatore</Link>
      </div>

      {Object.entries(ruoloGruppi).filter(([, lista]) => lista.length > 0).map(([gruppo, lista]) => (
        <div key={gruppo} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grigio-4)', marginBottom: 12 }}>
            {gruppo} ({lista.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {lista.map(g => {
              const pres = presenzeMap[g.id]
              const percPres = pres ? Math.round((pres.presenti / pres.tot) * 100) : null
              const eta = calcolaEta(g.data_nascita)
              return (
                <div key={g.id} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    {g.foto_url ? (
                      <img src={g.foto_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div className="avatar" style={{ width: 40, height: 40, fontSize: 14 }}>{g.nome[0]}{g.cognome[0]}</div>
                    )}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{g.cognome} {g.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--grigio-4)' }}>
                        {eta} anni · {g.piede} · {g.altezza_cm ? `${g.altezza_cm}cm` : '—'}
                        {g.numero_maglia ? ` · #${g.numero_maglia}` : ''}
                      </div>
                    </div>
                  </div>
                  {pres && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--grigio-4)', marginBottom: 4 }}>
                        <span>Presenze 7gg</span>
                        <span style={{ color: percPres! >= 80 ? 'var(--verde)' : percPres! >= 60 ? 'var(--ambra)' : 'var(--rosso)', fontWeight: 500 }}>
                          {pres.presenti}/{pres.tot}
                        </span>
                      </div>
                      <div className="progress">
                        <div className="progress-fill" style={{
                          width: `${percPres}%`,
                          background: percPres! >= 80 ? 'var(--verde)' : percPres! >= 60 ? 'var(--ambra)' : 'var(--rosso)',
                        }} />
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <Link href={`/dashboard/segretario/giocatori/${g.id}`} className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}>Profilo</Link>
                    <Link href={`/dashboard/allenatore/valutazioni/nuova?giocatore=${g.id}`} className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}>Valuta</Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
