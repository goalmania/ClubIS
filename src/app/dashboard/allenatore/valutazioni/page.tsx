import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatData } from '@/lib/helpers'

export default async function ValutazioniPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: utente, error: utenteError } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (utenteError || !utente) redirect('/auth/errore')

  const { data: valutazioni } = await supabase
    .from('valutazioni_tecniche')
    .select('*, giocatori(nome, cognome, ruolo_principale)')
    .eq('allenatore_id', user.id)
    .order('data', { ascending: false })
    .limit(50)

  const media = (v: any) => {
    const vals = [v.tecnica, v.tattica, v.fisico, v.mentale].filter(x => x !== null) as number[]
    return vals.length ? (vals.reduce((s, x) => s + x, 0) / vals.length).toFixed(1) : null
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Valutazioni tecniche</h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>{valutazioni?.length ?? 0} valutazioni in archivio</p>
        </div>
        <Link href="/dashboard/allenatore/valutazioni/nuova" className="btn btn-primary btn-sm">+ Nuova valutazione</Link>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Giocatore</th><th>Data</th><th>Tecnica</th><th>Tattica</th><th>Fisico</th><th>Mentale</th><th>Media</th><th>Visibile fam.</th></tr></thead>
            <tbody>
              {(valutazioni ?? []).length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '60px', color: 'var(--grigio-4)', fontSize: 13 }}>
                  Nessuna valutazione ancora.
                </td></tr>
              ) : (valutazioni ?? []).map(v => {
                const g = v.giocatori as any
                const m = media(v)
                const col = m ? (Number(m) >= 7 ? 'var(--verde)' : Number(m) >= 5 ? 'var(--ambra)' : 'var(--rosso)') : 'var(--grigio-4)'
                const voto = (n: number | null) => n
                  ? <span style={{ fontWeight: 600, color: n >= 7 ? 'var(--verde)' : n >= 5 ? 'var(--ambra)' : 'var(--rosso)' }}>{n}</span>
                  : <span style={{ color: 'var(--grigio-4)' }}>—</span>
                return (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{g?.cognome} {g?.nome}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatData(v.data)}</td>
                    <td>{voto(v.tecnica)}</td>
                    <td>{voto(v.tattica)}</td>
                    <td>{voto(v.fisico)}</td>
                    <td>{voto(v.mentale)}</td>
                    <td><span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)', color: col }}>{m ?? '—'}</span></td>
                    <td>
                      <span className={`badge ${v.visibile_famiglia ? 'badge-verde' : 'badge-grigio'}`} style={{ fontSize: 10 }}>
                        {v.visibile_famiglia ? '✓ Sì' : 'No'}
                      </span>
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
