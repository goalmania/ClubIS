import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatData, calcolaEta, ruoloShort } from '@/lib/helpers'

export default async function TesseramentiPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: utente, error: utenteError } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (utenteError || !utente) redirect('/auth/errore')

  const { data: tesseramenti } = await supabase
    .from('tesseramenti')
    .select('id, stagione, tipo, stato, data_inizio, data_fine, numero_maglia, giocatori ( id, nome, cognome, data_nascita, ruolo_principale, codice_fiscale, nazionalita_tipo ), squadre ( nome )')
    .eq('club_id', utente.club_id)
    .order('giocatori(cognome)')

  const attivi  = tesseramenti?.filter(t => t.stato === 'attivo')  ?? []
  const archivio = tesseramenti?.filter(t => t.stato !== 'attivo') ?? []
  const extracomunitari = attivi.filter(t => (t.giocatori as any)?.nazionalita_tipo === 'extracomunitario').length

  const tipoBadge: Record<string,string> = { definitivo:'badge-verde', prestito:'badge-blu', in_prova:'badge-ambra', svincolo:'badge-grigio', compartecipazione:'badge-viola' }

  const renderRiga = (t: any) => {
    const g = t.giocatori as any
    if (!g) return null
    return (
      <tr key={t.id}>
        <td>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div className="avatar" style={{ width:28, height:28, fontSize:11 }}>{g.nome[0]}{g.cognome[0]}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:500 }}>{g.cognome} {g.nome}</div>
              <div style={{ fontSize:11, color:'var(--grigio-4)', fontFamily:'var(--font-mono)' }}>{g.codice_fiscale}</div>
            </div>
          </div>
        </td>
        <td style={{ fontSize:12, color:'var(--grigio-3)' }}>{calcolaEta(g.data_nascita)} anni</td>
        <td><span className="badge badge-grigio" style={{ fontSize:10 }}>{g.ruolo_principale ? ruoloShort[g.ruolo_principale] : '—'}</span></td>
        <td style={{ fontSize:12, color:'var(--grigio-3)' }}>{(t.squadre as any)?.nome ?? '—'}</td>
        <td><span className={`badge ${tipoBadge[t.tipo] ?? 'badge-grigio'}`} style={{ fontSize:10 }}>{t.tipo}</span></td>
        <td style={{ fontFamily:'var(--font-mono)', fontSize:12 }}>{t.stagione}</td>
        <td style={{ fontFamily:'var(--font-mono)', fontSize:12 }}>{formatData(t.data_inizio, { day:'2-digit', month:'2-digit', year:'2-digit' })}</td>
        <td><span className={`badge ${t.stato==='attivo'?'badge-verde':t.stato==='sospeso'?'badge-ambra':'badge-grigio'}`} style={{ fontSize:10 }}>{t.stato}</span></td>
        <td><Link href={`/dashboard/segretario/giocatori/${g.id}`} className="btn btn-ghost btn-sm" style={{ fontSize:12 }}>Profilo →</Link></td>
      </tr>
    )
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Tesseramenti</h1>
          <p style={{ fontSize:14, color:'var(--grigio-3)', marginTop:4 }}>{attivi.length} attivi · {archivio.length} archiviati</p>
        </div>
        <Link href="/dashboard/segretario/giocatori/nuovo" className="btn btn-primary btn-sm">+ Nuovo tesseramento</Link>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:24 }}>
        {[
          { l:'Attivi', v:attivi.length },
          { l:'Extracomunitari', v:extracomunitari, c:extracomunitari>3?'var(--ambra)':undefined },
          { l:'In prestito', v:attivi.filter(t=>t.tipo==='prestito').length },
          { l:'Archiviati', v:archivio.length },
        ].map(s => (
          <div key={s.l} className="stat-card" style={{ padding:'12px 16px' }}>
            <div className="stat-label">{s.l}</div>
            <div className="stat-value" style={{ color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ overflow:'hidden', marginBottom:20 }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--grigio-5)', display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:14, fontWeight:600 }}>Tesseramenti attivi</span>
          <span className="badge badge-verde">{attivi.length}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Giocatore</th><th>Età</th><th>Ruolo</th><th>Squadra</th><th>Tipo</th><th>Stagione</th><th>Dal</th><th>Stato</th><th></th></tr></thead>
            <tbody>
              {attivi.length === 0
                ? <tr><td colSpan={9} style={{ textAlign:'center', padding:'40px', color:'var(--grigio-4)', fontSize:13 }}>Nessun tesseramento attivo</td></tr>
                : attivi.map(renderRiga)}
            </tbody>
          </table>
        </div>
      </div>
      {archivio.length > 0 && (
        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--grigio-5)', display:'flex', gap:8 }}>
            <span style={{ fontSize:14, fontWeight:600 }}>Archivio</span>
            <span className="badge badge-grigio">{archivio.length}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Giocatore</th><th>Età</th><th>Ruolo</th><th>Squadra</th><th>Tipo</th><th>Stagione</th><th>Dal</th><th>Stato</th><th></th></tr></thead>
              <tbody>{archivio.map(renderRiga)}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
