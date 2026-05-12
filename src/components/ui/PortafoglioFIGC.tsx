/**
 * PortafoglioFIGC — widget server component
 * Stima il saldo del portafoglio FIGC basandosi sull'ultima ricarica
 * e sui costi dei tesseramenti effettuati da quella data.
 */
import { createClient } from '@/lib/supabase/server'

interface Props {
  clubId: string
}

const fmt = (n: number) =>
  n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })

export default async function PortafoglioFIGC({ clubId }: Props) {
  const supabase = createClient()

  const [
    { data: club },
    { data: ricariche },
    { data: tesseramenti },
  ] = await Promise.all([
    supabase
      .from('clubs')
      .select('costo_tesseramento_definitivo, costo_tesseramento_prestito')
      .eq('id', clubId)
      .single(),
    supabase
      .from('ricariche_portafoglio_figc')
      .select('id, importo, data, note')
      .eq('club_id', clubId)
      .order('data', { ascending: false })
      .limit(10),
    supabase
      .from('tesseramenti')
      .select('tipo_tesseramento, created_at')
      .eq('club_id', clubId)
      .eq('stato', 'attivo')
      .order('created_at', { ascending: false }),
  ])

  const costoDefinitivo = Number(club?.costo_tesseramento_definitivo ?? 8)
  const costoPrestito   = Number(club?.costo_tesseramento_prestito   ?? 5)

  // Ultima ricarica
  const ultimaRicarica = ricariche?.[0] ?? null
  const dataRicarica   = ultimaRicarica?.data ?? null

  // Tesseramenti effettuati DOPO l'ultima ricarica
  const tessDaRicarica = (tesseramenti ?? []).filter((t: any) => {
    if (!dataRicarica) return true
    return (t.created_at as string).split('T')[0] >= dataRicarica
  })

  const costoTesseramenti = tessDaRicarica.reduce((s: number, t: any) => {
    return s + (t.tipo_tesseramento === 'prestito' ? costoPrestito : costoDefinitivo)
  }, 0)

  const saldoStimato = ultimaRicarica
    ? Number(ultimaRicarica.importo) - costoTesseramenti
    : null

  const totalRicaricato = (ricariche ?? []).reduce((s: number, r: any) => s + Number(r.importo), 0)

  const saldoColor =
    saldoStimato === null ? 'var(--gray)'
    : saldoStimato < 20   ? 'var(--rosso)'
    : saldoStimato < 50   ? 'var(--ambra)'
    : 'var(--accent)'

  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
            letterSpacing: '0.15em', textTransform: 'uppercase',
            color: 'var(--gray)', marginBottom: 4,
          }}>
            Portafoglio FIGC
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900,
            color: saldoColor, letterSpacing: '-0.01em',
          }}>
            {saldoStimato !== null ? fmt(saldoStimato) : '— non configurato'}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>
            saldo stimato
          </div>
        </div>
        <a
          href="/dashboard/segretario/figc/portafoglio"
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--accent)', textDecoration: 'none',
            padding: '6px 12px',
            border: '1px solid rgba(200,240,0,0.2)',
            borderRadius: 4,
            flexShrink: 0,
          }}
        >
          Gestisci →
        </a>
      </div>

      {/* Dettagli */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ultimaRicarica ? (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)' }}>
              Ultima ricarica
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--white)' }}>
              {fmt(Number(ultimaRicarica.importo))} il {new Date(ultimaRicarica.data).toLocaleDateString('it-IT')}
            </span>
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ambra)' }}>
            ⚠ Nessuna ricarica registrata
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)' }}>
            Tesseramenti da ricarica
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--white)' }}>
            {tessDaRicarica.length} (—{fmt(costoTesseramenti)})
          </span>
        </div>

        {(ricariche?.length ?? 0) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)' }}>
              Totale ricaricato
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)' }}>
              {fmt(totalRicaricato)}
            </span>
          </div>
        )}
      </div>

      {/* Avvisi saldo basso */}
      {saldoStimato !== null && saldoStimato < 50 && (
        <div style={{
          marginTop: 12, padding: '8px 12px',
          background: saldoStimato < 20 ? 'rgba(255,68,68,0.08)' : 'rgba(255,153,0,0.08)',
          border: `1px solid ${saldoStimato < 20 ? 'rgba(255,68,68,0.2)' : 'rgba(255,153,0,0.2)'}`,
          borderRadius: 4,
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: saldoStimato < 20 ? 'var(--rosso)' : 'var(--ambra)',
        }}>
          {saldoStimato < 20
            ? '🔴 Saldo critico — ricarica il portafoglio FIGC prima del prossimo tesseramento'
            : '⚠ Saldo basso — considera di ricaricare il portafoglio FIGC'}
        </div>
      )}

      {/* Link portale FIGC */}
      <div style={{ marginTop: 12 }}>
        <a
          href="https://tesseramenti.figc.it"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)',
            textDecoration: 'none',
          }}
        >
          Verifica saldo reale su portale FIGC →
        </a>
      </div>
    </div>
  )
}
