import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getFamigliaCollegamenti } from '@/lib/famiglia'
import { getUserContext } from '@/lib/impersonation'
import Link from 'next/link'

/* ── Bottoni vista (client island) ─────────────────────────────────── */
// Non servono useState: cambiamo solo il searchParam
function VistaBtns({ vista, base }: { vista: string; base: string }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[
        { v: 'settimana', label: '7 giorni'  },
        { v: 'mese',      label: '30 giorni' },
      ].map(({ v, label }) => (
        <a
          key={v}
          href={`${base}&vista=${v}`}
          style={{
            padding: '6px 14px', borderRadius: 2, fontSize: 12, fontWeight: 600,
            textDecoration: 'none', border: '1px solid var(--border-solid)',
            background: vista === v ? 'var(--accent)' : 'transparent',
            color: vista === v ? '#000' : 'var(--white)',
          }}
        >
          {label}
        </a>
      ))}
    </div>
  )
}

/* ── Griglia eventi per giorno ──────────────────────────────────────── */
function CalendarioView({
  sessioni,
  partite,
  vista,
  baseHref,
}: {
  sessioni: any[]
  partite: any[]
  vista: string
  baseHref: string
}) {
  const tutti = [
    ...sessioni.map(s => ({ ...s, _tipo: 'allenamento' as const })),
    ...partite.map(p => ({ ...p, _tipo: 'partita' as const })),
  ].sort((a, b) => new Date(a.data_ora).getTime() - new Date(b.data_ora).getTime())

  const giorni: Record<string, any[]> = {}
  tutti.forEach(e => {
    const k = new Date(e.data_ora).toLocaleDateString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
    if (!giorni[k]) giorni[k] = []
    giorni[k].push(e)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
            Calendario
          </div>
          <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>
            Allenamenti e partite in programma
          </div>
        </div>
        <VistaBtns vista={vista} base={baseHref} />
      </div>

      {Object.keys(giorni).length === 0 ? (
        <div style={{
          padding: 40, textAlign: 'center', color: 'var(--gray)', fontSize: 13,
          background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2,
        }}>
          Nessun evento in programma {vista === 'settimana' ? 'nei prossimi 7 giorni' : 'nel prossimo mese'}.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(giorni).map(([giorno, eventi]) => (
            <div key={giorno}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--gray)',
                fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase',
                marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--border-solid)',
              }}>
                {giorno}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {eventi.map((e, i) => (
                  <div key={i} style={{
                    padding: '14px 18px', background: '#111',
                    border: '1px solid var(--border-solid)', borderRadius: 2,
                    borderLeft: `3px solid ${e._tipo === 'partita' ? '#00C8A0' : '#F59E0B'}`,
                    display: 'flex', alignItems: 'center', gap: 16,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 2, flexShrink: 0,
                      background: e._tipo === 'partita' ? 'rgba(0,200,160,0.1)' : 'rgba(245,158,11,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    }}>
                      {e._tipo === 'partita' ? '⚽' : '🏃'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--white)' }}>
                        {e._tipo === 'partita' ? `vs ${e.avversario}` : `Allenamento — ${e.tipologia}`}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                        Ore {new Date(e.data_ora).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        {e.campo && ` · ${e.campo}`}
                        {e._tipo === 'allenamento' && e.durata_minuti && ` · ${e.durata_minuti} min`}
                      </div>
                    </div>
                    {e._tipo === 'partita' && (
                      <div style={{
                        padding: '4px 10px', borderRadius: 2, fontSize: 10, fontWeight: 700,
                        fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                        background: e.casa_trasferta === 'casa' ? 'rgba(0,200,160,0.15)' : 'rgba(156,163,175,0.15)',
                        color: e.casa_trasferta === 'casa' ? '#00C8A0' : 'var(--gray)',
                        border: `1px solid ${e.casa_trasferta === 'casa' ? '#00C8A040' : 'var(--border-solid)'}`,
                      }}>
                        {e.casa_trasferta === 'casa' ? 'Casa' : 'Trasferta'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────── */
export default async function FamigliaCalendarioPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  if (ctx.ruolo !== 'famiglia') redirect('/dashboard')

  const vistaRaw = searchParams?.vista
  const vista    = (Array.isArray(vistaRaw) ? vistaRaw[0] : vistaRaw) === 'mese' ? 'mese' : 'settimana'
  const oggi     = new Date()
  const fine     = new Date(oggi)
  fine.setDate(oggi.getDate() + (vista === 'settimana' ? 7 : 30))

  /* ── Impersonation: usa giocatoreId e clubId dal cookie ── */
  if (ctx.isImpersonating) {
    if (!ctx.giocatoreId) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', color: 'var(--white)', marginBottom: 8 }}>
            Nessun giocatore nel club
          </div>
          <div style={{ fontSize: 13, color: 'var(--gray)' }}>
            Il club selezionato non ha ancora giocatori attivi registrati.
          </div>
        </div>
      )
    }

    const url        = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const admin = createAdmin(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    // Recupera squadra del giocatore
    const { data: tess } = await admin
      .from('tesseramenti')
      .select('squadra_id, club_id')
      .eq('giocatore_id', ctx.giocatoreId)
      .eq('stato', 'attivo')
      .maybeSingle()

    const clubId    = tess?.club_id ?? ctx.clubId
    const squadraId = tess?.squadra_id ?? null

    const [{ data: sessioni }, { data: partite }] = await Promise.all([
      squadraId
        ? admin.from('sessioni_allenamento')
            .select('id, data_ora, tipologia, campo, durata_minuti, stato')
            .eq('squadra_id', squadraId)
            .gte('data_ora', oggi.toISOString())
            .lte('data_ora', fine.toISOString())
            .order('data_ora')
        : Promise.resolve({ data: [] }),
      admin.from('partite')
        .select('id, avversario, data_ora, casa_trasferta, tipo, stato')
        .eq('club_id', clubId)
        .gte('data_ora', oggi.toISOString())
        .lte('data_ora', fine.toISOString())
        .order('data_ora'),
    ])

    const baseHref = `/dashboard/famiglia/calendario?figlio=${ctx.giocatoreId}`
    return <CalendarioView sessioni={sessioni ?? []} partite={partite ?? []} vista={vista} baseHref={baseHref} />
  }

  /* ── Utente famiglia reale ── */
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const collegamenti = await getFamigliaCollegamenti(supabase as any, user)
  if (!collegamenti.length) redirect('/dashboard/famiglia')

  const figlioParam = searchParams?.figlio
  const selectedId  = Array.isArray(figlioParam) ? figlioParam[0] : figlioParam
  const fam = collegamenti.find(f => f.giocatore_id === selectedId) ?? collegamenti[0]

  const { data: tess } = await supabase
    .from('tesseramenti')
    .select('squadra_id, club_id')
    .eq('giocatore_id', fam.giocatore_id)
    .eq('stato', 'attivo')
    .maybeSingle()

  const [{ data: sessioni }, { data: partite }] = tess
    ? await Promise.all([
        supabase.from('sessioni_allenamento')
          .select('id, data_ora, tipologia, campo, durata_minuti, stato')
          .eq('squadra_id', tess.squadra_id)
          .gte('data_ora', oggi.toISOString())
          .lte('data_ora', fine.toISOString())
          .order('data_ora'),
        supabase.from('partite')
          .select('id, avversario, data_ora, casa_trasferta, tipo, stato')
          .eq('club_id', tess.club_id)
          .gte('data_ora', oggi.toISOString())
          .lte('data_ora', fine.toISOString())
          .order('data_ora'),
      ])
    : [{ data: [] }, { data: [] }]

  const baseHref = `/dashboard/famiglia/calendario?figlio=${fam.giocatore_id}`

  return (
    <div>
      {/* Selector figlio multiplo */}
      {collegamenti.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {collegamenti.map(f => {
            const gc     = f.giocatori as any
            const active = f.giocatore_id === fam.giocatore_id
            return (
              <Link
                key={f.id}
                href={`/dashboard/famiglia/calendario?figlio=${f.giocatore_id}&vista=${vista}`}
                style={{
                  padding: '6px 14px', borderRadius: 2, fontSize: 12, fontWeight: 600,
                  textDecoration: 'none', border: '1px solid var(--border-solid)',
                  background: active ? 'var(--accent)' : 'transparent',
                  color: active ? '#000' : 'var(--white)',
                }}
              >
                {gc?.nome} {gc?.cognome}
              </Link>
            )
          })}
        </div>
      )}

      <CalendarioView
        sessioni={sessioni ?? []}
        partite={partite ?? []}
        vista={vista}
        baseHref={baseHref}
      />
    </div>
  )
}
