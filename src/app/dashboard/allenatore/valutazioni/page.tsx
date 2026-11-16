import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatData } from '@/lib/helpers'
import ValutazioniMensiliList from './ValutazioniMensiliList'

export default async function ValutazioniPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  const { clubId, userId } = ctx

  const supabase = createAdminClient()

  const { data: club } = await supabase.from('clubs').select('tipo_prodotto').eq('id', clubId).maybeSingle()
  if (club?.tipo_prodotto === 'scuola_calcio_standalone') {
    return <ValutazioniMensiliList allenatoreId={userId} clubId={clubId} />
  }

  const { data: valutazioni } = await supabase
    .from('valutazioni_tecniche')
    .select('*, giocatori(nome, cognome, ruolo_principale)')
    .eq('allenatore_id', userId)
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
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, textTransform: 'none', letterSpacing: '-0.025em', color: 'var(--white)' }}>Valutazioni tecniche</h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>{valutazioni?.length ?? 0} valutazioni in archivio</p>
        </div>
        <Link href="/dashboard/allenatore/valutazioni/nuova" className="btn btn-primary btn-sm" data-onboarding="btn-nuova-valutazione">+ Nuova valutazione</Link>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="tabella-schede">
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
                    <td data-label="Giocatore" style={{ fontWeight: 500, fontSize: 13 }}>{g?.cognome} {g?.nome}</td>
                    <td data-label="Data" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatData(v.data)}</td>
                    <td data-label="Tecnica">{voto(v.tecnica)}</td>
                    <td data-label="Tattica">{voto(v.tattica)}</td>
                    <td data-label="Fisico">{voto(v.fisico)}</td>
                    <td data-label="Mentale">{voto(v.mentale)}</td>
                    <td data-label="Media"><span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)', color: col }}>{m ?? '—'}</span></td>
                    <td data-label="Visibile fam.">
                      <span className={`badge ${v.visibile_famiglia ? 'badge-verde' : 'badge-grigio'}`} style={{ fontSize: 12 }}>
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
