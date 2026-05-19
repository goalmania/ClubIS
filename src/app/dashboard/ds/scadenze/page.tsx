import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { redirect } from 'next/navigation'
import { formatData, giorniAlla } from '@/lib/helpers'

export default async function DSScadenzePage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  const { clubId } = ctx

  const admin = createAdminClient()
  const oggi = new Date().toISOString().split('T')[0]
  const tra90 = new Date(); tra90.setDate(tra90.getDate() + 90)
  const tra90str = tra90.toISOString().split('T')[0]
  const [
    { data: contratti },
    { data: certificati },
    { data: tesseramentiScad },
  ] = await Promise.all([
    admin.from('contratti')
      .select('id, data_scadenza, giocatori(nome, cognome), opzione_rinnovo')
      .eq('club_id', clubId).gte('data_scadenza', oggi).lte('data_scadenza', tra90str).order('data_scadenza'),
    admin.from('certificati_medici')
      .select('id, data_scadenza, tipo, giocatori(nome, cognome)')
      .eq('club_id', clubId).gte('data_scadenza', oggi).lte('data_scadenza', tra90str).order('data_scadenza'),
    admin.from('tesseramenti')
      .select('id, data_fine, tipo, giocatori(nome, cognome)')
      .eq('club_id', clubId).eq('stato', 'attivo').gte('data_fine', oggi).lte('data_fine', tra90str).order('data_fine'),
  ])
  const GgBadge = ({ data }: { data: string }) => {
    const gg = giorniAlla(data)
    return <span className={`badge ${gg <= 14 ? 'badge-rosso' : gg <= 30 ? 'badge-ambra' : 'badge-blu'}`}>{gg}gg</span>
  }
  const totale = (contratti?.length ?? 0) + (certificati?.length ?? 0) + (tesseramentiScad?.length ?? 0)
  return (
    <div data-onboarding="section-scadenze-ds">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Scadenze</h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>{totale} scadenze nei prossimi 90 giorni</p>
      </div>
      {totale === 0 ? (
        <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 14 }}>
          ✓ Nessuna scadenza nei prossimi 90 giorni
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {(contratti?.length ?? 0) > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Contratti in scadenza</span>
                <span className="badge badge-ambra">{contratti!.length}</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Giocatore</th><th>Scadenza</th><th>Gg rimanenti</th><th>Opzione rinnovo</th></tr></thead>
                  <tbody>
                    {contratti!.map(c => {
                      const g = c.giocatori as any
                      return (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 500, fontSize: 13 }}>{g?.cognome} {g?.nome}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatData(c.data_scadenza)}</td>
                          <td><GgBadge data={c.data_scadenza} /></td>
                          <td>{c.opzione_rinnovo ? <span className="badge badge-verde" style={{ fontSize: 10 }}>✓ Sì</span> : <span className="badge badge-grigio" style={{ fontSize: 10 }}>No</span>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {(certificati?.length ?? 0) > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Certificati medici in scadenza</span>
                <span className="badge badge-rosso">{certificati!.length}</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Giocatore</th><th>Tipo</th><th>Scadenza</th><th>Gg rimanenti</th></tr></thead>
                  <tbody>
                    {certificati!.map(c => {
                      const g = c.giocatori as any
                      return (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 500, fontSize: 13 }}>{g?.cognome} {g?.nome}</td>
                          <td><span className="badge badge-grigio" style={{ fontSize: 10 }}>{c.tipo}</span></td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatData(c.data_scadenza)}</td>
                          <td><GgBadge data={c.data_scadenza} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {(tesseramentiScad?.length ?? 0) > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Tesseramenti in scadenza</span>
                <span className="badge badge-blu">{tesseramentiScad!.length}</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Giocatore</th><th>Tipo</th><th>Fine tesseramento</th><th>Gg rimanenti</th></tr></thead>
                  <tbody>
                    {tesseramentiScad!.map(t => {
                      const g = t.giocatori as any
                      return (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 500, fontSize: 13 }}>{g?.cognome} {g?.nome}</td>
                          <td><span className="badge badge-grigio" style={{ fontSize: 10 }}>{t.tipo}</span></td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatData(t.data_fine!)}</td>
                          <td><GgBadge data={t.data_fine!} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
