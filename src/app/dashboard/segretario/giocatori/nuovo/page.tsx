'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { FormField, FormGrid, FormSection, SectionCard, Select, BackButton, Toast } from '@/components/ui'
import { stagioneCorrente } from '@/lib/helpers'

const ruoliOptions = [
  { value: 'portiere',                label: 'Portiere' },
  { value: 'difensore_centrale',      label: 'Difensore centrale' },
  { value: 'terzino',                 label: 'Terzino' },
  { value: 'centrocampista_difensivo',label: 'Centrocampista difensivo' },
  { value: 'centrocampista',          label: 'Centrocampista' },
  { value: 'trequartista',            label: 'Trequartista' },
  { value: 'ala',                     label: 'Ala' },
  { value: 'seconda_punta',           label: 'Seconda punta' },
  { value: 'centravanti',             label: 'Centravanti' },
]

const categoriaEtaOptions = [
  { value: 'u6',           label: 'Under 6' },
  { value: 'u8',           label: 'Under 8' },
  { value: 'u10',          label: 'Under 10' },
  { value: 'u12',          label: 'Under 12' },
  { value: 'u14',          label: 'Under 14' },
  { value: 'u15',          label: 'Under 15' },
  { value: 'u16',          label: 'Under 16' },
  { value: 'u17',          label: 'Under 17' },
  { value: 'u19',          label: 'Under 19' },
  { value: 'juniores',     label: 'Juniores' },
  { value: 'prima_squadra',label: 'Prima squadra' },
  { value: 'femminile',    label: 'Femminile' },
]

export default function NuovoGiocatorePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [toast, setToast]     = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [errori, setErrori]   = useState<Record<string, string>>({})
  const [squadre, setSquadre] = useState<{ id: string; nome: string }[]>([])

  // Dati anagrafica
  const [nome,          setNome]          = useState('')
  const [cognome,       setCognome]       = useState('')
  const [dataNascita,   setDataNascita]   = useState('')
  const [luogoNascita,  setLuogoNascita]  = useState('')
  const [codiceFiscale, setCodiceFiscale] = useState('')
  const [nazionalita,   setNazionalita]   = useState('italiano')
  const [paeseNascita,  setPaeseNascita]  = useState('Italia')

  // Dati tecnici
  const [ruoloPrincipale,  setRuoloPrincipale]  = useState('')
  const [ruoloSecondario,  setRuoloSecondario]  = useState('')
  const [piede,            setPiede]            = useState('destro')
  const [altezza,          setAltezza]          = useState('')
  const [peso,             setPeso]             = useState('')

  // Contatti
  const [emailContatto,    setEmailContatto]    = useState('')
  const [telefonoContatto, setTelefonoContatto] = useState('')

  // Tesseramento
  const [tipoTesseramento, setTipoTesseramento] = useState('definitivo')
  const [squadraId,        setSquadraId]        = useState('')
  const [numeroMaglia,     setNumeroMaglia]     = useState('')
  const [dataInizioTess,   setDataInizioTess]   = useState(new Date().toISOString().split('T')[0])

  // GDPR
  const [consensoGdpr,     setConsensoGdpr]     = useState(false)
  const [consensoImmagini, setConsensoImmagini] = useState(false)

  // Genitore (se minore)
  const [nomeGenitore,     setNomeGenitore]     = useState('')
  const [cognomeGenitore,  setCognomeGenitore]  = useState('')
  const [emailGenitore,    setEmailGenitore]    = useState('')
  const [telefonoGenitore, setTelefonoGenitore] = useState('')
  const [relazioneGenitore,setRelazioneGenitore]= useState('padre')

  // Carica squadre del club al mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('utenti').select('club_id').eq('id', user.id).single().then(({ data: utente }) => {
        if (!utente) return
        supabase.from('squadre').select('id, nome').eq('club_id', utente.club_id).eq('attiva', true).order('nome')
          .then(({ data }) => {
            setSquadre(data ?? [])
            if (data?.length === 1) setSquadraId(data[0].id)
          })
      })
    })
  }, [])

  const eta = dataNascita
    ? Math.floor((Date.now() - new Date(dataNascita).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null
  const isMinore = eta !== null && eta < 18

  const valida = () => {
    const e: Record<string, string> = {}
    if (!nome.trim())          e.nome          = 'Nome obbligatorio'
    if (!cognome.trim())       e.cognome        = 'Cognome obbligatorio'
    if (!dataNascita)          e.dataNascita    = 'Data di nascita obbligatoria'
    if (!codiceFiscale.trim()) e.codiceFiscale  = 'Codice fiscale obbligatorio'
    if (codiceFiscale.trim().length !== 16) e.codiceFiscale = 'Il codice fiscale deve avere 16 caratteri'
    if (!consensoGdpr)         e.consensoGdpr   = 'Il consenso al trattamento dati è obbligatorio'
    if (isMinore && !emailGenitore.trim()) e.emailGenitore = 'Email genitore obbligatoria per i minori'
    setErrori(e)
    return Object.keys(e).length === 0
  }

  const salva = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valida()) return
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: utente }   = await supabase.from('utenti').select('club_id').eq('id', user!.id).single()
      if (!utente) throw new Error('Club non trovato')

      // 1 — Inserisci giocatore
      const { data: giocatore, error: errG } = await supabase
        .from('giocatori')
        .insert({
          club_id:           utente.club_id,
          nome:              nome.trim(),
          cognome:           cognome.trim(),
          data_nascita:      dataNascita,
          luogo_nascita:     luogoNascita.trim() || null,
          codice_fiscale:    codiceFiscale.trim().toUpperCase(),
          nazionalita_tipo:  nazionalita,
          nazionalita_paese: paeseNascita.trim() || 'Italia',
          ruolo_principale:  ruoloPrincipale || null,
          ruolo_secondario:  ruoloSecondario || null,
          piede:             piede,
          altezza_cm:        altezza ? parseInt(altezza) : null,
          peso_kg:           peso ? parseInt(peso) : null,
          email_contatto:    emailContatto.trim() || null,
          telefono_contatto: telefonoContatto.trim() || null,
          consenso_gdpr:     consensoGdpr,
          consenso_data:     consensoGdpr ? new Date().toISOString() : null,
          consenso_immagini: consensoImmagini,
        })
        .select('id')
        .single()

      if (errG) {
        if (errG.code === '23505') {
          setErrori({ codiceFiscale: 'Codice fiscale già presente nel sistema' })
          setLoading(false)
          return
        }
        throw errG
      }

      const giocatoreId = giocatore!.id

      // 2 — Tesseramento
      await supabase.from('tesseramenti').insert({
        giocatore_id:  giocatoreId,
        club_id:       utente.club_id,
        squadra_id:    squadraId || null,
        stagione:      stagioneCorrente(),
        tipo:          tipoTesseramento,
        data_inizio:   dataInizioTess,
        numero_maglia: numeroMaglia ? parseInt(numeroMaglia) : null,
        stato:         'attivo',
      })

      // 3 — Famiglia (se minore e dati presenti)
      if (isMinore && nomeGenitore.trim() && emailGenitore.trim()) {
        await supabase.from('famiglie').insert({
          giocatore_id:      giocatoreId,
          nome:              nomeGenitore.trim(),
          cognome:           cognomeGenitore.trim(),
          relazione:         relazioneGenitore,
          email:             emailGenitore.trim(),
          telefono:          telefonoGenitore.trim() || null,
          consenso_dati:     consensoGdpr,
          consenso_immagini: consensoImmagini,
        })
      }

      setToast({ msg: `${nome} ${cognome} aggiunto con successo`, tipo: 'success' })
      setTimeout(() => router.push('/dashboard/segretario/giocatori'), 1200)
    } catch (err: any) {
      setToast({ msg: err.message ?? 'Errore durante il salvataggio', tipo: 'error' })
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <BackButton label="Torna ai giocatori" />

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Aggiungi giocatore</h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          Compila l&apos;anagrafica e il tesseramento. I campi con * sono obbligatori.
        </p>
      </div>

      <form onSubmit={salva}>

        {/* Anagrafica */}
        <SectionCard>
          <FormSection title="Anagrafica">
            <FormGrid cols={2}>
              <FormField label="Nome" required error={errori.nome}>
                <input className="input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Mario" />
              </FormField>
              <FormField label="Cognome" required error={errori.cognome}>
                <input className="input" value={cognome} onChange={e => setCognome(e.target.value)} placeholder="Rossi" />
              </FormField>
            </FormGrid>
            <FormGrid cols={2}>
              <FormField label="Data di nascita" required error={errori.dataNascita}>
                <input className="input" type="date" value={dataNascita} onChange={e => setDataNascita(e.target.value)} />
                {eta !== null && (
                  <div style={{ fontSize: 12, color: 'var(--grigio-4)', marginTop: 4 }}>
                    {eta} anni{isMinore ? ' — minore, richiesti dati genitore' : ''}
                  </div>
                )}
              </FormField>
              <FormField label="Luogo di nascita">
                <input className="input" value={luogoNascita} onChange={e => setLuogoNascita(e.target.value)} placeholder="Roma" />
              </FormField>
            </FormGrid>
            <FormGrid cols={2}>
              <FormField label="Codice fiscale" required error={errori.codiceFiscale}>
                <input
                  className="input"
                  value={codiceFiscale}
                  onChange={e => setCodiceFiscale(e.target.value.toUpperCase())}
                  placeholder="RSSMRA90A01H501Z"
                  maxLength={16}
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
                />
              </FormField>
              <FormField label="Nazionalità">
                <Select
                  value={nazionalita}
                  onChange={setNazionalita}
                  options={[
                    { value: 'italiano',        label: 'Italiano' },
                    { value: 'ue',              label: 'Comunitario (UE)' },
                    { value: 'extracomunitario',label: 'Extracomunitario' },
                  ]}
                />
              </FormField>
            </FormGrid>
          </FormSection>
        </SectionCard>

        {/* Dati tecnici */}
        <SectionCard>
          <FormSection title="Dati tecnici">
            <FormGrid cols={2}>
              <FormField label="Ruolo principale">
                <Select value={ruoloPrincipale} onChange={setRuoloPrincipale} options={ruoliOptions} placeholder="Seleziona ruolo" />
              </FormField>
              <FormField label="Ruolo secondario">
                <Select value={ruoloSecondario} onChange={setRuoloSecondario} options={ruoliOptions} placeholder="Nessuno" />
              </FormField>
            </FormGrid>
            <FormGrid cols={3}>
              <FormField label="Piede">
                <Select
                  value={piede}
                  onChange={setPiede}
                  options={[
                    { value: 'destro',      label: 'Destro' },
                    { value: 'sinistro',    label: 'Sinistro' },
                    { value: 'ambidestro',  label: 'Ambidestro' },
                  ]}
                />
              </FormField>
              <FormField label="Altezza (cm)">
                <input className="input" type="number" min={100} max={220} value={altezza} onChange={e => setAltezza(e.target.value)} placeholder="175" />
              </FormField>
              <FormField label="Peso (kg)">
                <input className="input" type="number" min={30} max={130} value={peso} onChange={e => setPeso(e.target.value)} placeholder="70" />
              </FormField>
            </FormGrid>
          </FormSection>
        </SectionCard>

        {/* Contatti */}
        <SectionCard>
          <FormSection title="Contatti">
            <FormGrid cols={2}>
              <FormField label="Email" hint="Del giocatore o del genitore se minore">
                <input className="input" type="email" value={emailContatto} onChange={e => setEmailContatto(e.target.value)} placeholder="mario@esempio.it" />
              </FormField>
              <FormField label="Telefono">
                <input className="input" type="tel" value={telefonoContatto} onChange={e => setTelefonoContatto(e.target.value)} placeholder="+39 333 1234567" />
              </FormField>
            </FormGrid>
          </FormSection>
        </SectionCard>

        {/* Genitore — visibile solo se minore */}
        {isMinore && (
          <SectionCard style={{ borderLeft: '3px solid var(--ambra)' }}>
            <FormSection title="Dati genitore / tutore (obbligatori per i minori)">
              <FormGrid cols={2}>
                <FormField label="Nome genitore" required error={errori.nomeGenitore}>
                  <input className="input" value={nomeGenitore} onChange={e => setNomeGenitore(e.target.value)} placeholder="Giuseppe" />
                </FormField>
                <FormField label="Cognome genitore">
                  <input className="input" value={cognomeGenitore} onChange={e => setCognomeGenitore(e.target.value)} placeholder="Rossi" />
                </FormField>
              </FormGrid>
              <FormGrid cols={2}>
                <FormField label="Email genitore" required error={errori.emailGenitore} hint="Verrà usata per l'accesso all'app famiglie">
                  <input className="input" type="email" value={emailGenitore} onChange={e => setEmailGenitore(e.target.value)} placeholder="giuseppe@esempio.it" />
                </FormField>
                <FormField label="Telefono genitore">
                  <input className="input" type="tel" value={telefonoGenitore} onChange={e => setTelefonoGenitore(e.target.value)} placeholder="+39 333 7654321" />
                </FormField>
              </FormGrid>
              <FormField label="Relazione">
                <Select
                  value={relazioneGenitore}
                  onChange={setRelazioneGenitore}
                  options={[
                    { value: 'padre',   label: 'Padre' },
                    { value: 'madre',   label: 'Madre' },
                    { value: 'tutore',  label: 'Tutore legale' },
                  ]}
                />
              </FormField>
            </FormSection>
          </SectionCard>
        )}

        {/* Tesseramento */}
        <SectionCard>
          <FormSection title="Tesseramento">
            <FormGrid cols={2}>
              <FormField label="Squadra" hint="Determina la visibilità nelle convocazioni">
                <Select
                  value={squadraId}
                  onChange={setSquadraId}
                  placeholder="— Nessuna squadra assegnata —"
                  options={squadre.map(s => ({ value: s.id, label: s.nome }))}
                />
              </FormField>
              <FormField label="Tipo tesseramento">
                <Select
                  value={tipoTesseramento}
                  onChange={setTipoTesseramento}
                  options={[
                    { value: 'definitivo',        label: 'Definitivo' },
                    { value: 'prestito',          label: 'Prestito' },
                    { value: 'in_prova',          label: 'In prova' },
                    { value: 'compartecipazione', label: 'Compartecipazione' },
                  ]}
                />
              </FormField>
            </FormGrid>
            <FormGrid cols={2}>
              <FormField label="Data inizio tesseramento" required>
                <input className="input" type="date" value={dataInizioTess} onChange={e => setDataInizioTess(e.target.value)} />
              </FormField>
              <FormField label="Numero maglia">
                <input className="input" type="number" min={1} max={99} value={numeroMaglia} onChange={e => setNumeroMaglia(e.target.value)} placeholder="—" />
              </FormField>
            </FormGrid>
          </FormSection>
        </SectionCard>

        {/* Privacy */}
        <SectionCard>
          <FormSection title="Privacy e consensi">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', gap: 12, cursor: 'pointer', alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={consensoGdpr}
                  onChange={e => setConsensoGdpr(e.target.checked)}
                  style={{ marginTop: 2, flexShrink: 0, accentColor: 'var(--verde)' }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--grigio)' }}>
                    Consenso al trattamento dati personali *
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grigio-3)', marginTop: 3 }}>
                    Ai sensi del GDPR e del D.lgs. 196/2003. Obbligatorio per procedere.
                  </div>
                  {errori.consensoGdpr && (
                    <div style={{ fontSize: 12, color: 'var(--rosso)', marginTop: 4 }}>{errori.consensoGdpr}</div>
                  )}
                </div>
              </label>
              <label style={{ display: 'flex', gap: 12, cursor: 'pointer', alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={consensoImmagini}
                  onChange={e => setConsensoImmagini(e.target.checked)}
                  style={{ marginTop: 2, flexShrink: 0, accentColor: 'var(--verde)' }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--grigio)' }}>
                    Consenso all&apos;utilizzo di immagini e video
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grigio-3)', marginTop: 3 }}>
                    Per pubblicazione su sito, social media e materiali del club.
                  </div>
                </div>
              </label>
            </div>
          </FormSection>
        </SectionCard>

        {/* Footer azioni */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 12,
          paddingTop: 8, paddingBottom: 32,
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push('/dashboard/segretario/giocatori')}
          >
            Annulla
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Salvataggio...' : 'Salva giocatore'}
          </button>
        </div>
      </form>

      {toast && (
        <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
