import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getFamigliaCollegamenti, type FamigliaCollegamento } from '@/lib/famiglia'
import { getUserContext } from '@/lib/impersonation'
import { formatData, formatEuro } from '@/lib/helpers'
import Link from 'next/link'
import AzioniRapide from '@/components/ui/AzioniRapide'

type DatiGiocatore = {
  giocatore: any
  clubId: string | null
  quota: any
  presenze: { tot: number; presenti: number }
  valutazioni: any[]
  prossimi: any[]
  messaggi: any[]
}

async function caricaDatiGiocatore(admin: any, giocatoreId: string, clubIdIn: string | null): Promise<DatiGiocatore> {
  const { data: giocatore } = await admin
    .from('giocatori')
    .select('id, nome, cognome, data_nascita, ruolo_principale, foto_url')
    .eq('id', giocatoreId)
    .maybeSingle()

  let clubId = clubIdIn
  if (!clubId) {
    const { data: tess } = await admin
      .from('tesseramenti')
      .select('club_id')
      .eq('giocatore_id', giocatoreId)
      .eq('stato', 'attivo')
      .maybeSingle()
    clubId = tess?.club_id ?? null
  }

  const [quotaRes, presenzeRes, valRes, prossimiRes, msgRes] = await Promise.allSettled([
    admin.from('quote_iscrizione')
      .select('importo_totale, importo_pagato, stato, scadenza')
      .eq('giocatore_id', giocatoreId)
      .order('created_at', { ascending: false })
      .limit(1),

    admin.from('presenze')
      .select('presente')
      .eq('giocatore_id', giocatoreId)
      .gte('registrato_at', new Date(Date.now() - 30 * 86400000).toISOString()),

    admin.from('valutazioni_tecniche')
      .select('data, tecnica, tattica, fisico, mentale, note')
      .eq('giocatore_id', giocatoreId)
      .eq('visibile_famiglia', true)
      .order('data', { ascending: false })
      .limit(3),

    clubId
      ? admin.from('partite')
          .select('id, avversario, data_ora, casa_trasferta')
          .eq('club_id', clubId)
          .gte('data_ora', new Date().toISOString())
          .eq('stato', 'programmata')
          .order('data_ora')
          .limit(3)
      : Promise.resolve({ data: [] }),

    clubId
      ? admin.from('messaggi')
          .select('id, titolo, tipo, inviato_at')
          .eq('club_id', clubId)
          .order('inviato_at', { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] }),
  ])

  const quota = quotaRes.status === 'fulfilled' ? ((quotaRes.value as any).data?.[0] ?? null) : null
  const presRows = presenzeRes.status === 'fulfilled' ? ((presenzeRes.value as any).data ?? []) : []
  const presenze = { tot: presRows.length, presenti: presRows.filter((p: any) => p.presente).length }
  const valutazioni = valRes.status === 'fulfilled' ? ((valRes.value as any).data ?? []) : []
  const prossimi = prossimiRes.status === 'fulfilled' ? ((prossimiRes.value as any).data ?? []) : []
  const messaggi = msgRes.status === 'fulfilled' ? ((msgRes.value as any).data ?? []) : []

  return { giocatore, clubId, quota, presenze, valutazioni, prossimi, messaggi }
}

function NoGiocatorePreview() {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>👨‍👩‍👧</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: 16, textTransform: 'uppercase', color: 'var(--white)', marginBottom: 8,
      }}>
        Anteprima area famiglia
      </div>
      <div style={{ fontSize: 13, color: 'var(--gray)', maxWidth: 380, margin: '0 auto 28px' }}>
        Stai visualizzando la dashboard come ruolo <strong style={{ color: 'var(--white)' }}>Famiglia</strong>.
        Nessun giocatore è collegato a questo account — i dati reali si vedono solo con un account famiglia registrato.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, maxWidth: 480, margin: '0 auto' }}>
        {[
          { href: '/dashboard/famiglia/calendario',   label: 'Calendario',  icon: '📅' },
          { href: '/dashboard/famiglia/sviluppo',     label: 'Progressi',   icon: '⭐' },
          { href: '/dashboard/famiglia/pagamenti',    label: 'Pagamenti',   icon: '💶' },
          { href: '/dashboard/famiglia/messaggi',     label: 'Bacheca',     icon: '✉️' },
          { href: '/dashboard/famiglia/comunicazioni',label: 'Comunicazioni',icon: '💬' },
          { href: '/dashboard/famiglia/profilo',      label: 'Profilo',     icon: '👤' },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            padding: '16px 12px', background: '#111', border: '1px solid var(--border-solid)',
            borderRadius: 2, color: 'var(--white)', textDecoration: 'none', fontSize: 12, fontWeight: 600,
          }}>
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

function DashboardContent({
  familiaNome, giocatore, quota, presenze, valutazioni, prossimi, messaggi,
  collegamenti, selectedGiocatoreId,
}: DatiGiocatore & {
  familiaNome: string
  collegamenti: FamigliaCollegamento[]
  selectedGiocatoreId: string
}) {
  const percPresenze = presenze.tot > 0
    ? Math.round(presenze.presenti / presenze.tot * 100) : null

  const quotaPendente = quota && quota.stato !== 'pagato'
  const totDaPagare = quotaPendente
    ? Number(quota.importo_totale) - Number(quota.importo_pagato) : 0

  const statoQuotaColore: Record<string, string> = {
    pagato: 'var(--accent)', parziale: 'var(--ambra)',
    non_pagato: 'var(--rosso)', esonerato: 'var(--gray)',
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)',
        }}>
          {familiaNome ? `Ciao, ${familiaNome}` : 'Area Famiglia'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--gray)', marginTop: 4 }}>
          {giocatore?.nome} {giocatore?.cognome} —{' '}
          {giocatore?.ruolo_principale?.replace(/_/g, ' ') ?? 'Giocatore'}
          {giocatore?.data_nascita && ` · ${new Date().getFullYear() - new Date(giocatore.data_nascita).getFullYear()} anni`}
        </p>
      </div>

      {/* Selettore figlio multiplo */}
      {collegamenti.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {collegamenti.map(f => {
            const gc = f.giocatori as any
            const active = f.giocatore_id === selectedGiocatoreId
            return (
              <Link
                key={f.id}
                href={`/dashboard/famiglia?figlio=${f.giocatore_id}`}
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

      <AzioniRapide ruolo="famiglia" />

      {/* Alert pagamenti */}
      {totDaPagare > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>
            💳 Quota in sospeso: <strong>{formatEuro(totDaPagare)}</strong>
            {quota?.scadenza && ` — scade il ${formatData(quota.scadenza)}`}
          </span>
          <Link href="/dashboard/famiglia/pagamenti" style={{
            marginLeft: 'auto', fontFamily: 'var(--font-mono)',
            fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'inherit', textDecoration: 'none', fontWeight: 700, whiteSpace: 'nowrap',
          }}>
            PAGA ORA →
          </Link>
        </div>
      )}

      {/* KPI */}
      <div data-onboarding="card-profilo-figlio" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 1, background: 'var(--border)', marginBottom: 24,
      }}>
        {[
          {
            label: 'PRESENZE 30GG',
            value: percPresenze !== null ? `${percPresenze}%` : '—',
            sub: `${presenze.presenti}/${presenze.tot} allenamenti`,
            color: percPresenze !== null && percPresenze < 60 ? 'var(--rosso)' : 'var(--accent)',
          },
          {
            label: 'QUOTA STAGIONALE',
            value: quota ? (quota.stato === 'pagato' ? '✓' : formatEuro(totDaPagare)) : '—',
            sub: quota ? quota.stato.replace('_', ' ') : 'Non assegnata',
            color: quota ? statoQuotaColore[quota.stato] : 'var(--gray)',
          },
          {
            label: 'ULTIME VALUTAZIONI',
            value: valutazioni.length > 0 ? `${valutazioni.length}` : '—',
            sub: valutazioni.length > 0 ? `Ultima: ${formatData(valutazioni[0]?.data)}` : 'Nessuna',
            color: 'var(--accent)',
          },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--gray-light)', padding: '16px 20px' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 900,
              fontSize: 26, color: k.color, lineHeight: 1,
            }}>{k.value}</div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
              letterSpacing: '0.15em', textTransform: 'uppercase',
              color: '#444', marginTop: 4,
            }}>{k.label}</div>
            <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Grid 2 colonne */}
      <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Prossimi eventi */}
        <div className="card" data-onboarding="sezione-calendario" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 18px', borderBottom: '1px solid var(--border)',
            fontFamily: 'var(--font-display)', fontWeight: 700,
            textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.08em',
          }}>
            📅 Prossimi eventi
          </div>
          {prossimi.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray)', fontSize: 12 }}>
              Nessun evento
            </div>
          ) : prossimi.map(p => (
            <div key={p.id} style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>
                {p.casa_trasferta === 'trasferta' ? '@ ' : 'vs '}{p.avversario}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>
                {new Date(p.data_ora).toLocaleDateString('it-IT', {
                  weekday: 'short', day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Ultime valutazioni */}
        <div className="card" data-onboarding="section-valutazioni-figlio" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 18px', borderBottom: '1px solid var(--border)',
            fontFamily: 'var(--font-display)', fontWeight: 700,
            textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.08em',
          }}>
            ⭐ Valutazioni
          </div>
          {valutazioni.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray)', fontSize: 12 }}>
              Nessuna valutazione
            </div>
          ) : valutazioni.map((v, i) => (
            <div key={i} style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>
                  {formatData(v.data)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { l: 'TEC', v: v.tecnica }, { l: 'TAT', v: v.tattica },
                  { l: 'FIS', v: v.fisico }, { l: 'MEN', v: v.mentale },
                ].filter(x => x.v != null).map(x => (
                  <div key={x.l} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>{x.l}</span>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
                      color: x.v >= 7 ? 'var(--accent)' : x.v >= 5 ? 'var(--ambra)' : 'var(--rosso)',
                    }}>{x.v}</span>
                  </div>
                ))}
              </div>
              {v.note && (
                <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4, lineHeight: 1.5 }}>
                  {v.note.slice(0, 80)}{v.note.length > 80 ? '…' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Messaggi recenti */}
      {messaggi.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ✉ Comunicazioni recenti
            </span>
            <Link href="/dashboard/famiglia/comunicazioni" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>
              Vedi tutte →
            </Link>
          </div>
          {messaggi.map(m => (
            <div key={m.id} style={{ padding: '11px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>
                {m.titolo}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>
                {formatData(m.inviato_at)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link rapidi */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {[
          { href: '/dashboard/famiglia/calendario',   label: 'Calendario',  icon: '📅' },
          { href: '/dashboard/famiglia/sviluppo',     label: 'Progressi',   icon: '⭐' },
          { href: '/dashboard/famiglia/pagamenti',    label: 'Pagamenti',   icon: '💶' },
          { href: '/dashboard/famiglia/messaggi',     label: 'Bacheca',     icon: '✉️' },
        ].map(l => (
          <Link key={l.href} href={l.href} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 16px',
            background: 'var(--gray-light)',
            border: '1px solid var(--border)',
            borderRadius: 2,
            textDecoration: 'none',
            color: 'var(--gray)',
            fontSize: 14,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <span style={{ fontSize: 20 }}>{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default async function FamigliaDashboard({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  if (ctx.ruolo !== 'famiglia') redirect('/dashboard')

  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const admin = createAdmin(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  /* ── Percorso impersonation: usa giocatoreId dal cookie ── */
  if (ctx.isImpersonating) {
    if (!ctx.giocatoreId) return <NoGiocatorePreview />

    const dati = await caricaDatiGiocatore(admin, ctx.giocatoreId, ctx.clubId)
    if (!dati.giocatore) return <NoGiocatorePreview />

    return (
      <DashboardContent
        {...dati}
        familiaNome=""
        collegamenti={[]}
        selectedGiocatoreId={ctx.giocatoreId}
      />
    )
  }

  /* ── Percorso utente famiglia reale ── */
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const collegamenti = await getFamigliaCollegamenti(supabase as any, user)
  if (!collegamenti.length) redirect('/auth/famiglia-setup')

  const figlioParam = searchParams?.figlio
  const selectedId  = Array.isArray(figlioParam) ? figlioParam[0] : figlioParam
  const fam = collegamenti.find(f => f.giocatore_id === selectedId) ?? collegamenti[0]

  const dati = await caricaDatiGiocatore(admin, fam.giocatore_id, null)

  return (
    <DashboardContent
      {...dati}
      familiaNome={fam.nome ?? ''}
      collegamenti={collegamenti}
      selectedGiocatoreId={fam.giocatore_id}
    />
  )
}
