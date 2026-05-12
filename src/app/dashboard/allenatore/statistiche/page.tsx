import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ruoloShort } from '@/lib/helpers'

export default async function AllenatoreStatistichePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (!utente) redirect('/auth/errore')

  const { data: sq } = await supabase
    .from('squadre').select('id, nome')
    .eq('club_id', utente.club_id).eq('allenatore_id', user.id)
  const sqIds = sq?.map(s => s.id) ?? []

  const { data: tesserati } = await supabase
    .from('tesseramenti')
    .select('giocatori(id, nome, cognome, ruolo_principale)')
    .in('squadra_id', sqIds.length ? sqIds : ['none'])
    .eq('stato', 'attivo')

  const giocatoriIds = tesserati?.map(t => (t.giocatori as any)?.id).filter(Boolean) ?? []

  const [{ data: statistiche }, { data: valutazioni }] = await Promise.all([
    supabase
      .from('statistiche_giocatore')
      .select('giocatore_id, gol, assist, ammonizioni, espulsioni, minuti_totali, presenze_allenamento, presenze_partite')
      .in('giocatore_id', giocatoriIds.length ? giocatoriIds : ['none']),
    supabase
      .from('valutazioni_tecniche')
      .select('giocatore_id, tecnica, tattica, fisico, mentale')
      .eq('allenatore_id', user.id)
      .in('giocatore_id', giocatoriIds.length ? giocatoriIds : ['none']),
  ])

  /* ── Aggrega per giocatore ──────────────────────────────────────── */

  const aggr: Record<string, {
    g: any
    gol: number; assist: number; amm: number; esp: number; minuti: number
    presAllen: number; presPartite: number
    voti: number[]
  }> = {}

  tesserati?.forEach(t => {
    const g = t.giocatori as any
    if (!g) return
    aggr[g.id] = { g, gol: 0, assist: 0, amm: 0, esp: 0, minuti: 0, presAllen: 0, presPartite: 0, voti: [] }
  })

  statistiche?.forEach(s => {
    if (!aggr[s.giocatore_id]) return
    aggr[s.giocatore_id].gol       += s.gol ?? 0
    aggr[s.giocatore_id].assist    += s.assist ?? 0
    aggr[s.giocatore_id].amm       += s.ammonizioni ?? 0
    aggr[s.giocatore_id].esp       += s.espulsioni ?? 0
    aggr[s.giocatore_id].minuti    += s.minuti_totali ?? 0
    aggr[s.giocatore_id].presAllen  += s.presenze_allenamento ?? 0
    aggr[s.giocatore_id].presPartite += s.presenze_partite ?? 0
  })

  valutazioni?.forEach(v => {
    if (!aggr[v.giocatore_id]) return
    const vals = [v.tecnica, v.tattica, v.fisico, v.mentale].filter((x): x is number => x !== null && x !== undefined)
    if (vals.length) aggr[v.giocatore_id].voti.push(vals.reduce((s, x) => s + x, 0) / vals.length)
  })

  const lista = Object.values(aggr).sort((a, b) => b.gol - a.gol || a.g.cognome.localeCompare(b.g.cognome))

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
          Statistiche stagione
        </h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          {sq?.map(s => s.nome).join(', ') || 'Nessuna squadra assegnata'}
        </p>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Giocatore</th>
                <th>Ruolo</th>
                <th title="Presenze in partita">Pres. gara</th>
                <th title="Presenze ad allenamento">Pres. all.</th>
                <th>Gol</th>
                <th>Assist</th>
                <th>G+A</th>
                <th>Amm.</th>
                <th>Esp.</th>
                <th>Minuti</th>
                <th>Media voto</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '60px', color: 'var(--grigio-4)', fontSize: 13 }}>
                    Nessuna statistica disponibile. Registra le presenze agli allenamenti e i risultati delle partite.
                  </td>
                </tr>
              ) : lista.map(item => {
                const mediaVoto = item.voti.length > 0
                  ? (item.voti.reduce((s: number, v: number) => s + v, 0) / item.voti.length).toFixed(1)
                  : null
                return (
                  <tr key={item.g.id}>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{item.g.cognome} {item.g.nome}</td>
                    <td>
                      <span className="badge badge-grigio" style={{ fontSize: 10 }}>
                        {item.g.ruolo_principale ? (ruoloShort[item.g.ruolo_principale] ?? item.g.ruolo_principale) : '—'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {item.presPartite > 0
                        ? <span style={{ color: 'var(--verde)' }}>{item.presPartite}</span>
                        : <span style={{ color: 'var(--grigio-4)' }}>—</span>}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {item.presAllen > 0
                        ? <span style={{ color: item.presAllen >= 10 ? 'var(--verde)' : 'var(--ambra)' }}>{item.presAllen}</span>
                        : <span style={{ color: 'var(--grigio-4)' }}>—</span>}
                    </td>
                    <td style={{ fontWeight: item.gol > 0 ? 700 : 400, color: item.gol > 0 ? 'var(--verde)' : undefined }}>
                      {item.gol || '—'}
                    </td>
                    <td style={{ fontWeight: item.assist > 0 ? 600 : 400 }}>
                      {item.assist || '—'}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {(item.gol + item.assist) || '—'}
                    </td>
                    <td style={{ color: item.amm >= 5 ? 'var(--ambra)' : undefined }}>
                      {item.amm || '—'}
                    </td>
                    <td style={{ color: item.esp > 0 ? 'var(--rosso)' : undefined }}>
                      {item.esp || '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {item.minuti > 0 ? `${item.minuti}'` : '—'}
                    </td>
                    <td>
                      {mediaVoto ? (
                        <span style={{
                          fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)',
                          color: Number(mediaVoto) >= 7 ? 'var(--verde)' : Number(mediaVoto) >= 5 ? 'var(--ambra)' : 'var(--rosso)',
                        }}>
                          {mediaVoto}
                        </span>
                      ) : '—'}
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
