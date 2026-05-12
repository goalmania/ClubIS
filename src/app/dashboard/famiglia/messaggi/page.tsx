import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getFamigliaCollegamenti, type FamigliaCollegamento } from '@/lib/famiglia'
import { getUserContext } from '@/lib/impersonation'
import Link from 'next/link'

const TIPO_CONFIG: Record<string, { label: string; colore: string }> = {
  comunicazione: { label: 'Comunicazione', colore: '#3B82F6' },
  avviso:        { label: 'Avviso',         colore: '#EF4444' },
  alert_tecnico: { label: 'Note tecniche',  colore: '#F59E0B' },
  convocazione:  { label: 'Convocazione',   colore: '#00C8A0' },
}

/* ── Componente view riusabile ────────────────────────────────────── */
function MessaggiView({
  msgs,
  collegamenti,
  famId,
}: {
  msgs: any[]
  collegamenti: FamigliaCollegamento[]
  famId: string | null
}) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
          Comunicazioni
        </div>
        <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>
          Messaggi e avvisi dal club — {msgs.length} totali
        </div>
      </div>

      {/* Selector figlio multiplo */}
      {collegamenti.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {collegamenti.map(f => {
            const gc = f.giocatori as any
            const active = f.giocatore_id === famId
            return (
              <Link
                key={f.id}
                href={`/dashboard/famiglia/messaggi?figlio=${f.giocatore_id}`}
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

      {msgs.length === 0 ? (
        <div style={{
          padding: 40, textAlign: 'center', color: 'var(--gray)', fontSize: 13,
          background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2,
        }}>
          Nessun messaggio dal club ancora.
        </div>
      ) : (
        <div style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, overflow: 'hidden' }}>
          {msgs.map((m: any, i: number) => {
            const mitt = m.utenti as any
            const tc   = TIPO_CONFIG[m.tipo] ?? { label: m.tipo, colore: 'var(--gray)' }
            return (
              <div key={m.id} style={{
                padding: '16px 18px',
                borderBottom: i < msgs.length - 1 ? '1px solid var(--border-solid)' : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--white)' }}>{m.titolo}</span>
                    <span style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 2, fontWeight: 600,
                      fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                      color: tc.colore, border: `1px solid ${tc.colore}40`, background: `${tc.colore}15`,
                    }}>
                      {tc.label}
                    </span>
                  </div>
                  {m.corpo && (
                    <div style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 6 }}>
                      {m.corpo}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>
                    {mitt?.nome} {mitt?.cognome}
                    {m.inviato_at && ` · ${new Date(m.inviato_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────── */
export default async function FamigliaMessaggiPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  if (ctx.ruolo !== 'famiglia') redirect('/dashboard')

  /* ── Impersonation: usa clubId dal cookie ── */
  if (ctx.isImpersonating) {
    const url        = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const admin = createAdmin(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: messaggi } = await admin
      .from('messaggi')
      .select('id, titolo, corpo, tipo, inviato_at, utenti(nome, cognome)')
      .eq('club_id', ctx.clubId)
      .order('inviato_at', { ascending: false })
      .limit(30)
    return <MessaggiView msgs={messaggi ?? []} collegamenti={[]} famId={null} />
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
    .select('club_id')
    .eq('giocatore_id', fam.giocatore_id)
    .eq('stato', 'attivo')
    .maybeSingle()

  const { data: messaggi } = tess
    ? await supabase
        .from('messaggi')
        .select('id, titolo, corpo, tipo, inviato_at, utenti(nome, cognome)')
        .eq('club_id', tess.club_id)
        .order('inviato_at', { ascending: false })
        .limit(30)
    : { data: null }

  return <MessaggiView msgs={messaggi ?? []} collegamenti={collegamenti} famId={fam.giocatore_id} />
}
