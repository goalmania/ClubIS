import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function OsservatoreStatistichePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: reports } = await supabase.from('report_scouting').select('esito, voto_globale, potenziale, data_osservazione').eq('osservatore_id', user.id)
  const tot = reports?.length ?? 0
  const ingaggiati = reports?.filter(r => r.esito === 'ingaggiato').length ?? 0
  const tasso = tot > 0 ? ((ingaggiati / tot) * 100).toFixed(1) : '0'
  const mediaVoto = reports?.filter(r => r.voto_globale !== null).length
    ? (reports!.filter(r => r.voto_globale !== null).reduce((s, r) => s + (r.voto_globale ?? 0), 0) / reports!.filter(r => r.voto_globale !== null).length).toFixed(1)
    : null
  const perEsito: Record<string, number> = {}
  const perPotenziale: Record<string, number> = {}
  reports?.forEach(r => {
    perEsito[r.esito] = (perEsito[r.esito] ?? 0) + 1
    perPotenziale[r.potenziale] = (perPotenziale[r.potenziale] ?? 0) + 1
  })
  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Le mie statistiche</h1>
        <p style={{ fontSize:14, color:'var(--grigio-3)', marginTop:4 }}>Storico completo attività di scouting</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:28 }}>
        {[
          { l:'Report totali', v:tot },
          { l:'Ingaggiati', v:ingaggiati, c:'var(--verde)' },
          { l:'Tasso conversione', v:`${tasso}%`, c:Number(tasso)>=20?'var(--verde)':Number(tasso)>=10?'var(--ambra)':'var(--grigio)' },
          { l:'Voto medio', v:mediaVoto??'—', c:mediaVoto?Number(mediaVoto)>=7?'var(--verde)':Number(mediaVoto)>=5?'var(--ambra)':'var(--rosso)':undefined },
        ].map(s => (
          <div key={s.l} className="stat-card">
            <div className="stat-label">{s.l}</div>
            <div className="stat-value" style={{ color:(s as any).c }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div className="card" style={{ padding:'18px 20px' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Per esito</div>
          {Object.entries(perEsito).map(([esito, n]) => (
            <div key={esito} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--grigio-6)' }}>
              <span style={{ fontSize:13, textTransform:'capitalize' }}>{esito.replace('_',' ')}</span>
              <span style={{ fontSize:13, fontWeight:600 }}>{n}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding:'18px 20px' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Per potenziale</div>
          {Object.entries(perPotenziale).map(([pot, n]) => (
            <div key={pot} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--grigio-6)' }}>
              <span style={{ fontSize:13, textTransform:'capitalize' }}>{pot}</span>
              <span style={{ fontSize:13, fontWeight:600 }}>{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
