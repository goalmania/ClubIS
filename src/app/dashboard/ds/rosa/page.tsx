import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatData, calcolaEta, ruoloShort, nazBadge } from '@/lib/helpers'

export default async function DSRosaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: utente, error: utenteError } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (utenteError || !utente) redirect('/auth/errore')

  const { data: tesserati } = await supabase
    .from('tesseramenti')
    .select('numero_maglia, tipo, squadre(nome), giocatori(id, nome, cognome, data_nascita, ruolo_principale, piede, nazionalita_tipo, altezza_cm)')
    .eq('club_id', utente.club_id).eq('stato', 'attivo')
    .order('giocatori(cognome)')

  const { data: contratti } = await supabase
    .from('contratti')
    .select('giocatore_id, data_scadenza, ingaggio_mensile')
    .eq('club_id', utente.club_id)

  const contrMap = new Map(contratti?.map(c => [c.giocatore_id, c]) ?? [])

  const extracomunitari = tesserati?.filter(t => (t.giocatori as any)?.nazionalita_tipo === 'extracomunitario').length ?? 0
  const ue = tesserati?.filter(t => (t.giocatori as any)?.nazionalita_tipo === 'ue').length ?? 0
  const oggi = new Date()
  const tra90 = new Date(oggi); tra90.setDate(oggi.getDate() + 90)
  const contrattiInScadenza = contratti?.filter(c => new Date(c.data_scadenza) <= tra90 && new Date(c.data_scadenza) >= oggi).length ?? 0

  const etaMedia = tesserati && tesserati.length > 0
    ? Math.round(tesserati.reduce((s, t) => s + calcolaEta((t.giocatori as any)?.data_nascita ?? '2000-01-01'), 0) / tesserati.length)
    : null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Gestione rosa</h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>{tesserati?.length ?? 0} giocatori tesserati</p>
        </div>
        <Link href="/dashboard/segretario/giocatori/nuovo" className="btn btn-primary btn-sm">+ Aggiungi giocatore</Link>
      </div>

      {/* KPI rosa */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { l: 'Totale rosa', v: tesserati?.length ?? 0 },
          { l: 'Età media', v: etaMedia ? `${etaMedia} anni` : '—' },
          { l: 'Extracomunitari', v: extracomunitari, c: extracomunitari > 3 ? 'var(--ambra)' : undefined },
          { l: 'Comunitari (UE)', v: ue },
          { l: 'Contratti in scad.', v: contrattiInScadenza, c: contrattiInScadenza > 0 ? 'var(--ambra)' : undefined },
        ].map(s => (
          <div key={s.l} className="stat-card" style={{ padding: '12px 14px' }}>
            <div className="stat-label" style={{ fontSize: 11 }}>{s.l}</div>
            <div className="stat-value" style={{ fontSize: 20, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Giocatore</th><th>Età</th><th>Ruolo</th><th>Piede</th>
                <th>Naz.</th><th>Squadra</th><th>Contratto</th><th>Tipo tess.</th><th></th>
              </tr>
            </thead>
            <tbody>
              {(tesserati ?? []).map(t => {
                const g = t.giocatori as any
                if (!g) return null
                const eta = calcolaEta(g.data_nascita)
                const contr = contrMap.get(g.id)
                const contrScadente = contr && new Date(contr.data_scadenza) <= tra90
                return (
                  <tr key={g.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--grigio-4)' }}>
                      {t.numero_maglia ? `#${t.numero_maglia}` : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{g.nome[0]}{g.cognome[0]}</div>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{g.cognome} {g.nome}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--grigio-3)' }}>{eta}</td>
                    <td><span className="badge badge-grigio" style={{ fontSize: 10 }}>{g.ruolo_principale ? ruoloShort[g.ruolo_principale] : '—'}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--grigio-3)', textTransform: 'capitalize' }}>{g.piede}</td>
                    <td><span className={`badge ${nazBadge[g.nazionalita_tipo] ?? 'badge-grigio'}`} style={{ fontSize: 10 }}>{g.nazionalita_tipo?.slice(0, 3).toUpperCase()}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{(t.squadre as any)?.nome ?? '—'}</td>
                    <td>
                      {contr ? (
                        <span className={`badge ${contrScadente ? 'badge-ambra' : 'badge-grigio'}`} style={{ fontSize: 10 }}>
                          {formatData(contr.data_scadenza, { month: '2-digit', year: '2-digit' })}
                        </span>
                      ) : <span style={{ fontSize: 12, color: 'var(--grigio-4)' }}>—</span>}
                    </td>
                    <td><span className="badge badge-grigio" style={{ fontSize: 10 }}>{t.tipo}</span></td>
                    <td>
                      <Link href={`/dashboard/segretario/giocatori/${g.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
                        Profilo →
                      </Link>
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
