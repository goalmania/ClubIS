import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { potenzialeColore, esitoColore } from '@/lib/helpers'
import { BackButton } from '@/components/ui'

function VotoBox({ label, value }: { label: string; value?: number | null }) {
  const bg = !value ? 'var(--grigio-6)' : value >= 7 ? 'var(--verde-lt)' : value >= 5 ? 'var(--ambra-lt)' : 'var(--rosso-lt)'
  const color = !value ? 'var(--grigio-4)' : value >= 7 ? 'var(--verde)' : value >= 5 ? 'var(--ambra)' : 'var(--rosso)'
  return (
    <div style={{ background: bg, borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--grigio-4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{value ?? '—'}</div>
    </div>
  )
}

export default async function DSScoutingDettaglioPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (!utente) redirect('/auth/errore')

  const { data: r } = await supabase
    .from('report_scouting')
    .select('*, utenti(nome, cognome)')
    .eq('id', params.id)
    .eq('club_richiedente_id', utente.club_id)
    .single()

  if (!r) notFound()

  const oss = r.utenti as { nome: string; cognome: string } | null

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <BackButton label="Torna ai report" />

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)', margin: 0 }}>
            {r.nome_giocatore_ext ?? '—'}
          </h1>
          <span className={`badge ${potenzialeColore[r.potenziale] ?? 'badge-grigio'}`}>{r.potenziale}</span>
          <span className={`badge ${esitoColore[r.esito] ?? 'badge-grigio'}`}>{r.esito?.replace(/_/g, ' ')}</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--grigio-3)', margin: 0 }}>
          {r.club_attuale_ext ?? 'Club n.d.'} · Osservato da {oss ? `${oss.nome} ${oss.cognome}` : '—'} · {new Date(r.data_osservazione).toLocaleDateString('it-IT')}
        </p>
        {r.partita_osservata && (
          <p style={{ fontSize: 12, color: 'var(--grigio-4)', marginTop: 4 }}>Partita: {r.partita_osservata}</p>
        )}
      </div>

      {/* Voti */}
      <div className="card" style={{ marginBottom: 20, padding: '20px 24px' }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grigio-3)', marginBottom: 16 }}>Valutazione per area</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          <VotoBox label="Tecnica"  value={r.tecnica} />
          <VotoBox label="Tattica"  value={r.tattica} />
          <VotoBox label="Fisico"   value={r.fisico} />
          <VotoBox label="Mentale"  value={r.mentale} />
        </div>
        <div style={{ borderTop: '1px solid var(--grigio-5)', paddingTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--grigio-3)' }}>Voto globale</span>
          <div style={{
            width: 48, height: 48, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 22, fontFamily: 'var(--font-mono)',
            background: (r.voto_globale ?? 0) >= 7 ? 'var(--verde)' : (r.voto_globale ?? 0) >= 5 ? 'var(--ambra)' : 'var(--rosso)',
            color: 'white',
          }}>
            {r.voto_globale ?? '—'}
          </div>
        </div>
      </div>

      {/* Analisi qualitativa */}
      {(r.punti_forza || r.punti_debolezza || r.note_libere) && (
        <div className="card" style={{ marginBottom: 20, padding: '20px 24px' }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grigio-3)', marginBottom: 16 }}>Analisi qualitativa</h2>
          {r.punti_forza && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--verde)', marginBottom: 6 }}>Punti di forza</div>
              <p style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.6, margin: 0 }}>{r.punti_forza}</p>
            </div>
          )}
          {r.punti_debolezza && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--rosso)', marginBottom: 6 }}>Punti di debolezza</div>
              <p style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.6, margin: 0 }}>{r.punti_debolezza}</p>
            </div>
          )}
          {r.note_libere && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grigio-3)', marginBottom: 6 }}>Note libere</div>
              <p style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{r.note_libere}</p>
            </div>
          )}
        </div>
      )}

      <div style={{ paddingBottom: 32 }}>
        <Link href="/dashboard/ds/scouting" className="btn btn-secondary btn-sm">← Torna alla lista</Link>
      </div>
    </div>
  )
}
