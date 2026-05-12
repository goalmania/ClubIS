import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { potenzialeColore, esitoColore, formatData } from '@/lib/helpers'
import GiocatoriTable from './GiocatoriTable'

type SearchParams = {
  ruolo?: string
  stato_pipeline?: string
  potenziale?: string
  eta_min?: string
  eta_max?: string
}

export default async function OsservatoreGiocatoriPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (!utente) redirect('/auth/errore')

  let query = supabase
    .from('report_scouting')
    .select('*')
    .eq('club_richiedente_id', utente.club_id)

  if (searchParams.ruolo) query = query.eq('ruolo', searchParams.ruolo)
  if (searchParams.stato_pipeline) query = query.eq('stato_pipeline', searchParams.stato_pipeline)
  if (searchParams.potenziale) query = query.eq('potenziale', searchParams.potenziale)

  query = query.order('created_at', { ascending: false })

  const { data: reports } = await query

  // Filtra per età client-side dopo fetch (data_nascita opzionale)
  const etaMin = searchParams.eta_min ? parseInt(searchParams.eta_min) : undefined
  const etaMax = searchParams.eta_max ? parseInt(searchParams.eta_max) : undefined

  const filtered = (reports ?? []).filter(r => {
    if (!r.data_nascita) return true
    const eta = new Date().getFullYear() - new Date(r.data_nascita).getFullYear()
    if (etaMin && eta < etaMin) return false
    if (etaMax && eta > etaMax) return false
    return true
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Giocatori monitorati</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>{filtered.length} giocatori</p>
        </div>
        <Link href="/dashboard/osservatore/nuovo-report" className="btn btn-primary btn-sm">
          + Nuova osservazione
        </Link>
      </div>

      {/* Filtri */}
      <form method="GET" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <select name="ruolo" defaultValue={searchParams.ruolo ?? ''} className="input" style={{ width: 160 }}>
          <option value="">Tutti i ruoli</option>
          {['portiere','difensore_centrale','terzino','centrocampista_difensivo','centrocampista','trequartista','ala','seconda_punta','centravanti'].map(r => (
            <option key={r} value={r}>{r.replace('_', ' ')}</option>
          ))}
        </select>
        <select name="stato_pipeline" defaultValue={searchParams.stato_pipeline ?? ''} className="input" style={{ width: 160 }}>
          <option value="">Tutti gli stati</option>
          <option value="in_osservazione">In Osservazione</option>
          <option value="interessante">Interessante</option>
          <option value="da_contattare">Da Contattare</option>
          <option value="archiviato">Archiviato</option>
        </select>
        <select name="potenziale" defaultValue={searchParams.potenziale ?? ''} className="input" style={{ width: 140 }}>
          <option value="">Tutti i potenziali</option>
          <option value="basso">Basso</option>
          <option value="medio">Medio</option>
          <option value="alto">Alto</option>
          <option value="eccezionale">Eccezionale</option>
        </select>
        <input name="eta_min" type="number" placeholder="Età min" defaultValue={searchParams.eta_min ?? ''} className="input" style={{ width: 90 }} />
        <input name="eta_max" type="number" placeholder="Età max" defaultValue={searchParams.eta_max ?? ''} className="input" style={{ width: 90 }} />
        <button type="submit" className="btn btn-secondary btn-sm">Filtra</button>
        <Link href="/dashboard/osservatore/giocatori" className="btn btn-ghost btn-sm">Reset</Link>
      </form>

      {/* Tabella con ordinamento client-side */}
      <GiocatoriTable
        reports={filtered}
        potenzialeColore={potenzialeColore}
        esitoColore={esitoColore}
      />
    </div>
  )
}
