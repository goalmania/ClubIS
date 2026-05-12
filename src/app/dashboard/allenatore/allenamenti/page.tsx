import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AllenamentiPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: utente, error: utenteError } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (utenteError || !utente) redirect('/auth/errore')

  // Squadre assegnate all'allenatore; fallback su tutte le squadre del club
  const { data: sqAssegnate } = await supabase.from('squadre').select('id')
    .eq('club_id', utente.club_id).eq('allenatore_id', user.id).eq('attiva', true)
  let sqIds = sqAssegnate?.map(s => s.id) ?? []
  if (sqIds.length === 0) {
    const { data: sqClub } = await supabase.from('squadre').select('id')
      .eq('club_id', utente.club_id).eq('attiva', true)
    sqIds = sqClub?.map(s => s.id) ?? []
  }

  const { data: sessioni } = await supabase
    .from('sessioni_allenamento')
    .select('*, squadre(nome, categoria_eta)')
    .in('squadra_id', sqIds.length ? sqIds : ['none'])
    .order('data_ora', { ascending: false })
    .limit(60)

  const oggi = new Date()
  const prossime = sessioni?.filter(s => new Date(s.data_ora) >= oggi) ?? []
  const passate  = sessioni?.filter(s => new Date(s.data_ora) < oggi)  ?? []

  const renderSessione = (s: any) => {
    const data = new Date(s.data_ora)
    return (
      <div key={s.id} className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 10, flexShrink: 0, textAlign: 'center',
          background: s.stato === 'effettuato' ? 'var(--verde-lt)' : s.stato === 'annullato' ? 'var(--rosso-lt)' : 'var(--grigio-6)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: s.stato === 'effettuato' ? 'var(--verde)' : 'var(--grigio)' }}>
            {data.getDate()}
          </div>
          <div style={{ fontSize: 10, color: 'var(--grigio-4)', textTransform: 'uppercase' }}>
            {data.toLocaleDateString('it-IT', { month: 'short' })}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>{s.tipologia}</span>
            <span className="badge badge-grigio" style={{ fontSize: 10 }}>{s.durata_minuti}&apos;</span>
            {s.obiettivo && <span style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{s.obiettivo}</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--grigio-4)' }}>
            {data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            {s.campo && ` · ${s.campo}`}
            {' · '}{(s.squadre as any)?.nome}
          </div>
        </div>
        <span className={`badge ${s.stato === 'effettuato' ? 'badge-verde' : s.stato === 'annullato' ? 'badge-rosso' : 'badge-ambra'}`}>
          {s.stato}
        </span>
        <Link href={`/dashboard/allenatore/presenze/${s.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: 12 }}>
          {s.stato === 'programmato' ? 'Presenze →' : 'Vedi →'}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Allenamenti</h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>Calendario sessioni e presenze</p>
        </div>
        <Link href="/dashboard/allenatore/allenamenti/nuovo" className="btn btn-primary btn-sm">+ Nuovo allenamento</Link>
      </div>

      {prossime.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grigio-4)', marginBottom: 12 }}>
            Prossimi ({prossime.length})
          </div>
          {prossime.map(renderSessione)}
        </div>
      )}

      {passate.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grigio-4)', marginBottom: 12 }}>
            Archivio ({passate.length})
          </div>
          {passate.map(renderSessione)}
        </div>
      )}

      {(!sessioni || sessioni.length === 0) && (
        <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 14 }}>
          Nessuna sessione ancora.
          <div style={{ marginTop: 16 }}>
            <Link href="/dashboard/allenatore/allenamenti/nuovo" className="btn btn-primary">Crea il primo allenamento</Link>
          </div>
        </div>
      )}
    </div>
  )
}
