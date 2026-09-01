import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import RigaValutazioneMensile from './RigaValutazioneMensile'

export default async function ValutazioniMensiliList({ allenatoreId, clubId }: { allenatoreId: string; clubId: string }) {
  const supabase = createAdminClient()

  const { data: valutazioni } = await supabase
    .from('valutazioni_mensili_scuola_calcio')
    .select('*, giocatori(nome, cognome)')
    .eq('allenatore_id', allenatoreId)
    .eq('club_id', clubId)
    .order('mese', { ascending: false })
    .limit(50)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Valutazioni mensili</h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>{valutazioni?.length ?? 0} valutazioni registrate — una al mese per ragazzo, visibile solo alla famiglia</p>
        </div>
        <Link href="/dashboard/allenatore/valutazioni/nuova" className="btn btn-primary btn-sm">+ Nuova valutazione</Link>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Ragazzo</th><th>Mese</th><th>Tecnico</th><th>Impegno</th><th>Rispetto regole</th><th>Socializzazione</th><th>Nota</th></tr></thead>
            <tbody>
              {(valutazioni ?? []).length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '60px', color: 'var(--grigio-4)', fontSize: 13 }}>
                  Nessuna valutazione ancora.
                </td></tr>
              ) : (valutazioni ?? []).map(v => {
                const g = v.giocatori as any
                return (
                  <RigaValutazioneMensile
                    key={v.id}
                    giocatoreNome={`${g?.cognome ?? ''} ${g?.nome ?? ''}`}
                    mese={v.mese}
                    tecnico={v.tecnico}
                    impegno={v.impegno}
                    rispetto_regole={v.rispetto_regole}
                    socializzazione={v.socializzazione}
                    nota={v.nota}
                    dettaglioAssi={v.dettaglio_assi ?? null}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
