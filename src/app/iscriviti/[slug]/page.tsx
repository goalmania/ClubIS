import { createClient } from '@/lib/supabase/server'
import FormIscrizionePublic from './FormIscrizionePublic'

function ChiusoPage({ club }: { club: { nome: string } }) {
  return (
    <div style={centeredStyle}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
        <h1 style={headingStyle}>Iscrizioni chiuse</h1>
        <p style={subStyle}>Il periodo di iscrizione per <strong>{club.nome}</strong> è terminato.</p>
        <p style={subStyle}>Contatta la segreteria per informazioni.</p>
      </div>
    </div>
  )
}

function EsauritoPage({ club }: { club: { nome: string } }) {
  return (
    <div style={centeredStyle}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔴</div>
        <h1 style={headingStyle}>Posti esauriti</h1>
        <p style={subStyle}>Tutti i posti disponibili per <strong>{club.nome}</strong> sono stati occupati.</p>
        <p style={subStyle}>Contatta la segreteria per essere messo/a in lista d'attesa.</p>
      </div>
    </div>
  )
}

const centeredStyle: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center',
  justifyContent: 'center', background: '#0a0a0a', color: '#f5f3ee',
  padding: 24,
}
const headingStyle: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900,
  fontSize: 28, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '-0.01em',
}
const subStyle: React.CSSProperties = { color: '#888', fontSize: 14, marginBottom: 6 }

export default async function PaginaIscrizione({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createClient()

  const { data: modulo } = await supabase
    .from('moduli_iscrizione')
    .select('*, clubs(nome, logo_url, citta)')
    .eq('slug', slug)
    .eq('attivo', true)
    .maybeSingle()

  if (!modulo) {
    return (
      <div style={centeredStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h1 style={headingStyle}>Modulo non trovato</h1>
          <p style={subStyle}>Il link non è valido o il modulo è stato chiuso.</p>
        </div>
      </div>
    )
  }

  const oggi = new Date().toISOString().split('T')[0]
  if (modulo.data_chiusura && modulo.data_chiusura < oggi) {
    return <ChiusoPage club={modulo.clubs} />
  }

  if (modulo.max_iscrizioni) {
    const { count } = await supabase
      .from('richieste_iscrizione')
      .select('*', { count: 'exact', head: true })
      .eq('modulo_id', modulo.id)
      .neq('stato', 'rifiutata')
    if ((count ?? 0) >= modulo.max_iscrizioni) {
      return <EsauritoPage club={modulo.clubs} />
    }
  }

  return <FormIscrizionePublic modulo={modulo} />
}
