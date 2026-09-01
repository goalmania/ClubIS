'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import { labelRequirement, labelDisabledReason } from '@/lib/stripe-requirements'

type Stato = {
  collegato: boolean
  chargesAbilitati: boolean
  datiInviati: boolean
  requirementsCurrentlyDue: string[]
  requirementsPastDue: string[]
  disabledReason: string | null
  avviso?: string
}

type StepStato = 'fatto' | 'attivo' | 'attesa'

const WHATSAPP_SUPPORTO = 'https://wa.me/393334218596'

export default function PagamentiOnlinePage() {
  const searchParams = useSearchParams()
  const [stato, setStato] = useState<Stato | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [avvio, setAvvio] = useState(false)
  const [errore, setErrore] = useState('')

  const load = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true)
    const res = await fetch('/api/stripe/connect/status')
    if (res.ok) setStato(await res.json())
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  const avviaOnboarding = async () => {
    setErrore('')
    setAvvio(true)
    try {
      const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Errore')
      window.location.href = j.url
    } catch (err: any) {
      setErrore(err.message ?? 'Errore avvio collegamento Stripe')
      setAvvio(false)
    }
  }

  // Passi del percorso: 1) collegamento creato  2) dati inviati  3) verifica  4) attivo
  const step2: StepStato = !stato?.collegato ? 'attivo' : 'fatto'
  const step3: StepStato = !stato?.collegato ? 'attesa' : !stato.datiInviati ? 'attivo' : 'fatto'
  const step4: StepStato = !stato?.collegato || !stato.datiInviati ? 'attesa' : stato.chargesAbilitati ? 'fatto' : 'attivo'

  const daCompletare = [...new Set([...(stato?.requirementsPastDue ?? []), ...(stato?.requirementsCurrentlyDue ?? [])])]
  const motivoAttesa = labelDisabledReason(stato?.disabledReason ?? null)
  const nonAncoraIniziato = !stato?.collegato

  return (
    <div style={{ maxWidth: 640 }}>
      <PageHeader
        title="ClubIS Pay"
        subtitle="Fai pagare ai genitori la retta o l'iscrizione direttamente con carta, senza contanti né bonifici da rincorrere"
      />

      {searchParams.get('onboarding') === 'completato' && (
        <div className="alert alert-success" style={{ marginBottom: 20, fontSize: 14 }}>
          ✓ Dati inviati. Ora Stripe li controlla — può volerci qualche ora. Torna su questa pagina e premi "Controlla se è cambiato qualcosa" più tardi.
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--gray)' }}>Caricamento...</p>
      ) : (
        <>
          {/* Spiegazione in parole semplici */}
          <div className="card" style={{ padding: 18, marginBottom: 20, fontSize: 14, lineHeight: 1.6, color: 'var(--white)' }}>
            <strong>Come funziona, in breve:</strong> colleghi una volta sola un conto sicuro (si chiama Stripe,
            lo usano migliaia di aziende italiane) dove ricevere i pagamenti. Da quel momento, quando un genitore
            paga una quota o un'iscrizione con carta, i soldi arrivano automaticamente sul conto corrente della
            società, con un bonifico diretto Stripe — non passano dalla cassa di ClubIS.
          </div>

          {/* Trasparenza sulla commissione */}
          <div className="card" style={{ padding: 18, marginBottom: 20, fontSize: 13, lineHeight: 1.6, color: 'var(--gray)' }}>
            <strong style={{ color: 'var(--white)' }}>💳 Commissione ClubIS Pay:</strong> 1,5% su ogni pagamento,
            divisa a metà — lo 0,75% è un piccolo sovrapprezzo pagato dal genitore in fase di pagamento, l'altro
            0,75% viene trattenuto sull'incasso della società. Nessun costo fisso, nessun canone: paghi solo
            quando incassi.
          </div>

          {/* Cosa preparare prima di iniziare — solo se non ancora iniziato */}
          {nonAncoraIniziato && (
            <div className="card" style={{ padding: 18, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
                📋 Prima di iniziare, tieni a portata di mano:
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9, color: 'var(--white)' }}>
                <li>Codice fiscale (o partita IVA) della società sportiva</li>
                <li>Un documento d'identità del presidente (carta d'identità o patente)</li>
                <li>Il telefono a portata di mano: ti verrà chiesto un selfie per verificare la tua identità</li>
                <li>IBAN del conto corrente della società, dove vuoi ricevere i pagamenti</li>
              </ul>
              <p style={{ fontSize: 13, color: 'var(--gray)', marginTop: 12, marginBottom: 8 }}>
                Ci vogliono circa 10-15 minuti. Puoi interrompere in qualsiasi momento: quello che hai già
                scritto resta salvato e puoi riprendere da dove eri rimasto.
              </p>
              <p style={{ fontSize: 13, color: 'var(--gray)', marginTop: 0, marginBottom: 0 }}>
                Ad un certo punto Stripe chiederà anche <strong>almeno un membro del consiglio direttivo</strong>:
                per la maggior parte delle scuole calcio va bene indicare te stesso, non serve una persona diversa.
              </p>
            </div>
          )}

          {/* Percorso a passi */}
          <div className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
            <WizardStep
              numero={1} totale={4}
              titolo="Collegamento creato" stato="fatto"
              descrizione="Fatto in automatico da ClubIS. Non devi fare nulla per questo passo."
            />
            <WizardStep
              numero={2} totale={4}
              titolo="Inserisci i dati della società" stato={step2}
              descrizione="Tocca a te: pochi minuti per inserire i dati della società e il conto dove ricevere i pagamenti. Si compila su una pagina protetta di Stripe — non su ClubIS."
              nota={step2 === 'attivo' ? 'Quando premi il bottone verrai portato su un altro sito (Stripe): è normale, fa parte della procedura. Al termine tornerai automaticamente qui.' : undefined}
              azione={step2 === 'attivo' ? { label: avvio ? 'Un attimo...' : 'Inizia — Collega il conto →', onClick: avviaOnboarding, disabled: avvio } : undefined}
            />
            <WizardStep
              numero={3} totale={4}
              titolo="Controllo di sicurezza" stato={step3}
              descrizione={
                step3 === 'attivo'
                  ? (motivoAttesa ?? 'Stripe sta controllando i dati che hai inviato. Di solito ci vogliono da poche ore a 1-2 giorni lavorativi. Non devi fare nulla: aggiorneremo questa pagina da soli quando è pronto.')
                  : 'Un controllo obbligatorio per legge, lo stesso che fa una banca quando apri un conto. Non riguarda te personalmente: è automatico.'
              }
            />
            <WizardStep
              numero={4} totale={4}
              titolo="Tutto pronto!" stato={step4}
              descrizione={step4 === 'fatto' ? 'I genitori possono ora pagare le iscrizioni a pagamento con carta, in totale sicurezza.' : 'Appena il controllo è completato questo passo si attiva da solo — non serve fare nulla.'}
              ultimo
            />
          </div>

          {/* Cosa manca, se qualcosa è da completare */}
          {daCompletare.length > 0 && (
            <div className="card" style={{ padding: 18, marginBottom: 20, borderColor: 'var(--accent-orange)' }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: 'var(--accent-orange)' }}>
                ⚠️ Manca ancora qualche dato
              </div>
              <p style={{ fontSize: 14, color: 'var(--white)', marginTop: 0, marginBottom: 10 }}>
                Capita spesso di saltare un campo per errore, nessun problema. Stripe chiede di completare:
              </p>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9, color: 'var(--white)' }}>
                {daCompletare.map(code => <li key={code}>{labelRequirement(code)}</li>)}
              </ul>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={avviaOnboarding} disabled={avvio}>
                {avvio ? 'Un attimo...' : 'Completa i dati mancanti →'}
              </button>
            </div>
          )}

          {stato?.collegato && stato.datiInviati && !stato.chargesAbilitati && daCompletare.length === 0 && (
            <div className="card" style={{ padding: 18, marginBottom: 20 }}>
              <p style={{ fontSize: 14, color: 'var(--gray)', margin: 0 }}>
                {motivoAttesa ?? 'Hai inviato tutti i dati richiesti. Stripe sta completando il controllo automatico — di solito richiede da poche ore a 1-2 giorni lavorativi. Torna a controllare più tardi.'}
              </p>
            </div>
          )}

          {stato?.avviso && (
            <p style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 16 }}>
              Nota: {stato.avviso} — mostro l'ultimo stato conosciuto.
            </p>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => load(true)} disabled={refreshing}>
              {refreshing ? 'Controllo in corso...' : '↻ Controlla se è cambiato qualcosa'}
            </button>
            {errore && <p style={{ fontSize: 13, color: 'var(--accent-red)', margin: 0 }}>{errore}</p>}
          </div>

          {/* Aiuto */}
          <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>Ti sei bloccato o hai dubbi?</div>
              <div style={{ fontSize: 13, color: 'var(--gray)' }}>Scrivici, ti aiutiamo passo passo.</div>
            </div>
            <a href={WHATSAPP_SUPPORTO} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
              💬 Scrivici su WhatsApp
            </a>
          </div>
        </>
      )}
    </div>
  )
}

function WizardStep({
  numero, totale, titolo, descrizione, nota, stato, azione, ultimo,
}: {
  numero: number
  totale: number
  titolo: string
  descrizione: string
  nota?: string
  stato: StepStato
  azione?: { label: string; onClick: () => void; disabled?: boolean }
  ultimo?: boolean
}) {
  const icona = stato === 'fatto' ? '✓' : stato === 'attivo' ? numero : '·'
  const colore = stato === 'fatto' ? 'var(--verde, #2ecc71)' : stato === 'attivo' ? 'var(--accent-orange, #ff9900)' : 'var(--grigio-4, #666)'

  return (
    <div style={{
      display: 'flex', gap: 14, padding: '18px 18px',
      borderBottom: ultimo ? 'none' : '1px solid var(--border-solid)',
      opacity: stato === 'attesa' ? 0.55 : 1,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `2px solid ${colore}`, color: colore, fontWeight: 700, fontSize: 14,
      }}>
        {icona}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--gray)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Passo {numero} di {totale}
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 5 }}>{titolo}</div>
        <div style={{ fontSize: 14, color: 'var(--gray)', lineHeight: 1.6 }}>{descrizione}</div>
        {nota && (
          <div style={{ fontSize: 13, color: 'var(--accent-orange)', lineHeight: 1.5, marginTop: 8, background: 'var(--accent-orange-lt)', padding: '8px 10px', borderRadius: 4 }}>
            ℹ️ {nota}
          </div>
        )}
        {azione && (
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={azione.onClick} disabled={azione.disabled}>
            {azione.label}
          </button>
        )}
      </div>
    </div>
  )
}
