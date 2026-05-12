import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getFamigliaCollegamenti } from '@/lib/famiglia'
import { getUserContext } from '@/lib/impersonation'
import { formatData } from '@/lib/helpers'
import Link from 'next/link'

/* ── Framework sviluppo per categoria d'età ─────────────────────────── */
type CategoriaEta = {
  nome: string
  etaMin: number
  etaMax: number
  focus: string
  colore: string
  target: { tecnica: number; tattica: number; fisico: number; mentale: number }
  priorita: { tecnica: number; tattica: number; fisico: number; mentale: number }
  obiettivi: string[]
  milestone: string
}

const CATEGORIE: CategoriaEta[] = [
  {
    nome: 'Piccoli Amici', etaMin: 5, etaMax: 7,
    focus: 'Divertimento e coordinazione motoria di base',
    colore: '#C8F000',
    target:   { tecnica: 4, tattica: 2, fisico: 4, mentale: 5 },
    priorita: { tecnica: 35, tattica: 10, fisico: 35, mentale: 20 },
    obiettivi: [
      'Coordinazione occhio-piede con il pallone',
      'Schemi motori di base (corsa, salto, equilibrio)',
      'Familiarità con gli spazi di gioco',
      'Partecipazione gioiosa e rispetto dei compagni',
      'Prime nozioni di regole del gioco',
    ],
    milestone: 'Il bambino si diverte e vuole tornare ad allenarsi ogni volta',
  },
  {
    nome: 'Pulcini', etaMin: 8, etaMax: 9,
    focus: 'Controllo palla e schemi individuali',
    colore: '#00C8A0',
    target:   { tecnica: 5, tattica: 3, fisico: 5, mentale: 5 },
    priorita: { tecnica: 45, tattica: 15, fisico: 30, mentale: 10 },
    obiettivi: [
      'Controllo e conduzione sicura del pallone',
      'Calciare con entrambi i piedi',
      'Primo controllo: fermare il pallone in movimento',
      'Dribbling di base su avversario',
      'Nozione di spazio libero e posizionamento',
    ],
    milestone: 'Conduce palla e calcia verso la porta con continuità',
  },
  {
    nome: 'Esordienti', etaMin: 10, etaMax: 11,
    focus: 'Tecnica individuale e regole del gioco',
    colore: '#3B82F6',
    target:   { tecnica: 6, tattica: 4, fisico: 5, mentale: 6 },
    priorita: { tecnica: 45, tattica: 20, fisico: 25, mentale: 10 },
    obiettivi: [
      'Tecnica di passaggio corta e media distanza',
      'Tiro in porta con potenza e precisione',
      'Posizioni di base in campo (fase difensiva e offensiva)',
      'Pressing individuale sul portatore di palla',
      'Comunicazione con i compagni in campo',
    ],
    milestone: 'Sa quando passare e quando dribblare, applica il pressing',
  },
  {
    nome: 'Giovanissimi', etaMin: 12, etaMax: 13,
    focus: 'Tattica di squadra e affinamento tecnico',
    colore: '#A855F7',
    target:   { tecnica: 7, tattica: 6, fisico: 6, mentale: 6 },
    priorita: { tecnica: 35, tattica: 35, fisico: 20, mentale: 10 },
    obiettivi: [
      'Variazione del ritmo di gioco e smarcamento',
      'Schemi di reparto (linea difensiva, triangoli di centrocampo)',
      'Transizioni veloci attacco-difesa',
      'Tecnica del colpo di testa in difesa e attacco',
      'Lettura della partita e presa di decisione rapida',
    ],
    milestone: 'Legge i movimenti avversari e si adatta automaticamente',
  },
  {
    nome: 'Allievi', etaMin: 14, etaMax: 15,
    focus: 'Sviluppo fisico e consolidamento tattico',
    colore: '#F59E0B',
    target:   { tecnica: 7, tattica: 7, fisico: 7, mentale: 7 },
    priorita: { tecnica: 25, tattica: 35, fisico: 30, mentale: 10 },
    obiettivi: [
      'Resistenza aerobica e forza muscolare di base',
      'Sistemi di gioco (4-3-3, 4-4-2, 3-5-2)',
      'Calci piazzati: corner, punizioni, rigori',
      'Leadership in campo e comunicazione avanzata',
      'Prevenzione infortuni e recupero post-allenamento',
    ],
    milestone: 'Mantiene alta l\'intensità per tutta la partita',
  },
  {
    nome: 'Berretti', etaMin: 16, etaMax: 17,
    focus: 'Professionalità e mentalità agonistica',
    colore: '#EF4444',
    target:   { tecnica: 8, tattica: 7, fisico: 8, mentale: 7 },
    priorita: { tecnica: 25, tattica: 30, fisico: 25, mentale: 20 },
    obiettivi: [
      'Gestione mentale della pressione agonistica',
      'Preparazione atletica specifica per ruolo',
      'Analisi video e adattamento tattico',
      'Gestione delle energie in partite ravvicinate',
      'Approccio professionale (alimentazione, riposo, recupero)',
    ],
    milestone: 'Si prepara autonomamente, gestisce la pressione delle gare ufficiali',
  },
  {
    nome: 'Primavera / Under 19', etaMin: 18, etaMax: 99,
    focus: 'Eccellenza e transizione al calcio senior',
    colore: '#F97316',
    target:   { tecnica: 8, tattica: 8, fisico: 8, mentale: 8 },
    priorita: { tecnica: 25, tattica: 30, fisico: 25, mentale: 20 },
    obiettivi: [
      'Padronanza tattica completa del proprio ruolo',
      'Leadership di squadra e gestione dello spogliatoio',
      'Condizione atletica ai massimi livelli giovanili',
      'Adattamento a diverse squadre e allenatori',
      'Mentalità vincente e gestione degli insuccessi',
    ],
    milestone: 'Pronto per allenarsi con la prima squadra',
  },
]

function getCategoriaPerEta(dataNascita: string | null): CategoriaEta {
  if (!dataNascita) return CATEGORIE[2]
  const eta = new Date().getFullYear() - new Date(dataNascita).getFullYear()
  return CATEGORIE.find(c => eta >= c.etaMin && eta <= c.etaMax) ?? CATEGORIE[CATEGORIE.length - 1]
}

const AREE = ['tecnica', 'tattica', 'fisico', 'mentale'] as const
type Area = typeof AREE[number]

const AREA_LABEL: Record<Area, string> = { tecnica: 'Tecnica', tattica: 'Tattica', fisico: 'Fisico', mentale: 'Mentale' }
const AREA_ICON:  Record<Area, string> = { tecnica: '⚽', tattica: '🧠', fisico: '💪', mentale: '🎯' }

function coloreVoto(v: number | null, target: number) {
  if (!v) return 'var(--gray)'
  const r = v / target
  if (r >= 1)   return '#00C8A0'
  if (r >= 0.8) return '#C8F000'
  if (r >= 0.6) return '#F59E0B'
  return '#EF4444'
}

function tendenza(vals: number[]): 'up' | 'down' | 'stable' {
  if (vals.length < 2) return 'stable'
  const mid = Math.ceil(vals.length / 2)
  const mr = vals.slice(0, mid).reduce((s, v) => s + v, 0) / mid
  const mp = vals.slice(mid).reduce((s, v) => s + v, 0) / (vals.length - mid)
  if (mr > mp + 0.3) return 'up'
  if (mr < mp - 0.3) return 'down'
  return 'stable'
}

const T_ICON:  Record<string, string> = { up: '↑', down: '↓', stable: '→' }
const T_COLOR: Record<string, string> = { up: '#00C8A0', down: '#EF4444', stable: '#F59E0B' }

/* ── Rendering principale (riusato sia per impersonation che per utente reale) ── */
function SviluppoContent({ g, valutazioni }: { g: any; valutazioni: any[] }) {
  const categoria = getCategoriaPerEta(g?.data_nascita ?? null)
  const eta = g?.data_nascita ? new Date().getFullYear() - new Date(g.data_nascita).getFullYear() : null

  const stats = AREE.map(area => {
    const numeri = valutazioni.map(v => v[area]).filter((x: any) => x != null) as number[]
    const media  = numeri.length ? +(numeri.reduce((s, v) => s + v, 0) / numeri.length).toFixed(1) : null
    const trend  = tendenza(numeri)
    const target = categoria.target[area]
    const perc   = media ? Math.min(Math.round((media / target) * 100), 100) : 0
    return { area, media, trend, target, perc }
  })

  const punteggio = AREE.reduce((sum, area) => {
    const s = stats.find(s => s.area === area)!
    return sum + (s.media ?? 0) * (categoria.priorita[area] / 100)
  }, 0)

  return (
    <div>
      {/* Categoria età */}
      <div style={{
        marginBottom: 24, padding: '18px 22px',
        background: '#111', border: `2px solid ${categoria.colore}`,
        borderRadius: 2, display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 2, flexShrink: 0,
          background: `${categoria.colore}20`, border: `1px solid ${categoria.colore}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: categoria.colore,
        }}>
          {eta ?? '?'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: categoria.colore, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
            Categoria: {categoria.nome}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>
            {categoria.focus}
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray)' }}>★ {categoria.milestone}</div>
        </div>
        {valutazioni.length > 0 && (
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: coloreVoto(+punteggio.toFixed(1), 8) }}>
              {punteggio.toFixed(1)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--gray)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Score globale</div>
          </div>
        )}
      </div>

      {/* Aree di sviluppo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
        {stats.map(({ area, media, trend, target, perc }) => {
          const colore = coloreVoto(media, target)
          return (
            <div key={area} style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{AREA_ICON[area]}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: 'var(--white)' }}>
                    {AREA_LABEL[area]}
                  </span>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--gray)', padding: '1px 5px', border: '1px solid var(--border-solid)', borderRadius: 2 }}>
                    {categoria.priorita[area]}%
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {media !== null && (
                    <span style={{ fontSize: 11, color: T_COLOR[trend], fontFamily: 'var(--font-mono)' }}>{T_ICON[trend]}</span>
                  )}
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: colore }}>
                    {media !== null ? media : '—'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>/{target}</span>
                </div>
              </div>
              <div style={{ height: 6, background: 'var(--border-solid)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${perc}%`, background: colore, borderRadius: 3, transition: 'width 0.4s' }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--gray)', fontFamily: 'var(--font-mono)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{perc}% dell&apos;obiettivo</span>
                <span>Target età: {target}/10</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Obiettivi per categoria */}
      <div style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--border-solid)',
          fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 13, color: 'var(--white)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: categoria.colore }}>▸</span> Obiettivi per {categoria.nome}
        </div>
        <div style={{ padding: '8px 18px 16px' }}>
          {categoria.obiettivi.map((obj, i) => {
            const raggiunto = valutazioni.length >= 3 && i < Math.floor(valutazioni.length / 2)
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0',
                borderBottom: i < categoria.obiettivi.length - 1 ? '1px solid var(--border-solid)' : 'none',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 2, flexShrink: 0, marginTop: 1,
                  background: raggiunto ? '#00C8A020' : 'var(--border-solid)',
                  border: `1px solid ${raggiunto ? '#00C8A0' : 'var(--border-solid)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: raggiunto ? '#00C8A0' : 'var(--gray)',
                }}>
                  {raggiunto ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 13, color: raggiunto ? 'var(--white)' : 'var(--gray)', lineHeight: 1.5 }}>{obj}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Storico valutazioni */}
      {valutazioni.length === 0 ? (
        <div style={{
          padding: 40, textAlign: 'center', color: 'var(--gray)', fontSize: 13,
          background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2,
        }}>
          Nessuna valutazione condivisa dall&apos;allenatore ancora.
        </div>
      ) : (
        <div style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-solid)', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 13, color: 'var(--white)' }}>
            Storico valutazioni ({valutazioni.length})
          </div>
          {valutazioni.map((v: any, idx: number) => {
            const arConVoto = AREE.filter(a => v[a] != null)
            const media = arConVoto.length ? arConVoto.reduce((s, a) => s + v[a], 0) / arConVoto.length : null
            return (
              <div key={v.id} style={{
                padding: '14px 18px',
                borderBottom: idx < valutazioni.length - 1 ? '1px solid var(--border-solid)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--gray)' }}>{formatData(v.data)}</span>
                  {media !== null && (
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: coloreVoto(+media.toFixed(1), 7) }}>
                      Media {media.toFixed(1)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: v.note ? 10 : 0 }}>
                  {AREE.map(area => (
                    <div key={area} style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--border-solid)', borderRadius: 2 }}>
                      <div style={{ fontSize: 10, color: 'var(--gray)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 2 }}>{AREA_LABEL[area]}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: v[area] != null ? coloreVoto(v[area], categoria.target[area]) : 'var(--gray)' }}>
                        {v[area] ?? '—'}
                      </div>
                    </div>
                  ))}
                </div>
                {v.note && (
                  <div style={{ fontSize: 12, color: 'var(--gray)', padding: '8px 12px', background: 'var(--border-solid)', borderRadius: 2, lineHeight: 1.6, marginTop: 8 }}>
                    💬 {v.note}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────── */
export default async function FamigliaSviluppoPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  if (ctx.ruolo !== 'famiglia') redirect('/dashboard')

  /* ── Percorso impersonation: usa giocatoreId dal cookie ── */
  if (ctx.isImpersonating) {
    if (!ctx.giocatoreId) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⭐</div>
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

    const [{ data: g }, { data: vals }] = await Promise.all([
      admin.from('giocatori').select('id, nome, cognome, data_nascita, ruolo_principale, foto_url').eq('id', ctx.giocatoreId).maybeSingle(),
      admin.from('valutazioni_tecniche').select('id, data, tecnica, tattica, fisico, mentale, note').eq('giocatore_id', ctx.giocatoreId).order('data', { ascending: false }),
    ])

    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
            Progressi di {g?.nome ?? 'atleta'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>
            {(vals ?? []).length} valutazioni disponibili
          </div>
        </div>
        <SviluppoContent g={g} valutazioni={vals ?? []} />
      </div>
    )
  }

  /* ── Percorso utente famiglia reale ── */
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const collegamenti = await getFamigliaCollegamenti(supabase as any, user)
  if (!collegamenti.length) redirect('/dashboard/famiglia')

  const figlioParam = searchParams?.figlio
  const selectedId  = Array.isArray(figlioParam) ? figlioParam[0] : figlioParam
  const fam = collegamenti.find(f => f.giocatore_id === selectedId) ?? collegamenti[0]
  const g   = fam.giocatori as any

  const { data: vals } = await supabase
    .from('valutazioni_tecniche')
    .select('id, data, tecnica, tattica, fisico, mentale, note')
    .eq('giocatore_id', fam.giocatore_id)
    .eq('visibile_famiglia', true)
    .order('data', { ascending: false })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
          Progressi di {g?.nome ?? 'atleta'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>
          {(vals ?? []).length} valutazioni dell&apos;allenatore condivise con te
        </div>
      </div>

      {/* Selector figlio multiplo */}
      {collegamenti.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {collegamenti.map(f => {
            const gc = f.giocatori as any
            const active = f.giocatore_id === fam.giocatore_id
            return (
              <Link
                key={f.id}
                href={`/dashboard/famiglia/sviluppo?figlio=${f.giocatore_id}`}
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

      <SviluppoContent g={g} valutazioni={vals ?? []} />
    </div>
  )
}
