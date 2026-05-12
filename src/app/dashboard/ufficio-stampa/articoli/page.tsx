'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatData } from '@/lib/helpers'

// ─── Template library standalone ─────────────────────────────────────────────

interface TemplateLibrary {
  id: string
  categoria: string
  titolo: string
  emoji: string
  descrizione: string
  testo: string
}

const TEMPLATES: TemplateLibrary[] = [
  {
    id: 'comunicato_ufficiale',
    categoria: 'Comunicati',
    titolo: 'Comunicato ufficiale',
    emoji: '📋',
    descrizione: 'Comunicato stampa generico per annunci e notizie ufficiali del club',
    testo: `COMUNICATO UFFICIALE
[NOME CLUB] — [DATA]

[TITOLO COMUNICATO]

[NOME CLUB] comunica che [TESTO PRINCIPALE DEL COMUNICATO].

[Paragrafo 2 — approfondimento, dettagli, contesto]

[Eventuale dichiarazione di un dirigente o portavoce]

Per ulteriori informazioni:
Ufficio Stampa [NOME CLUB]
📧 [EMAIL UFFICIO STAMPA]
📱 [TELEFONO UFFICIO STAMPA]

#[NOME CLUB] #ComunicatoUfficiale`,
  },
  {
    id: 'nuovo_acquisto',
    categoria: 'Comunicati',
    titolo: 'Nuovo acquisto / Presentazione',
    emoji: '✍️',
    descrizione: 'Template per annunciare un nuovo calciatore o tesseramento',
    testo: `COMUNICATO UFFICIALE — NUOVO ACQUISTO
[NOME CLUB] — [DATA]

[NOME CLUB] è lieta di annunciare l'ingaggio di [NOME COGNOME GIOCATORE].

Il calciatore, [ETA] anni, arriva da [CLUB PRECEDENTE] e si lega al club con un contratto [DURATA CONTRATTO].

[NOME] nasce a [CITTÀ] il [DATA NASCITA]. Nel corso della sua carriera ha vestito le maglie di [CLUB PRECEDENTI], collezionando [X] presenze e [X] gol in [COMPETIZIONE/I].

Le dichiarazioni del Direttore Sportivo [NOME DS]:
"[CITAZIONE DS — motivazioni dell'acquisto, qualità del giocatore, aspettative]"

Le prime parole di [NOME GIOCATORE] in biancorosso:
"[CITAZIONE GIOCATORE — emozioni, obiettivi, messaggio ai tifosi]"

[NOME GIOCATORE] indosserà la maglia numero [NUMERO].

Benvenuto, [NOME]! 🔴⚫

#[NOME CLUB] #Calciomercato #Benvenuto[COGNOME]`,
  },
  {
    id: 'rinnovo_contratto',
    categoria: 'Comunicati',
    titolo: 'Rinnovo contratto',
    emoji: '📝',
    descrizione: 'Annuncio del prolungamento del contratto di un giocatore o staff',
    testo: `COMUNICATO UFFICIALE — RINNOVO CONTRATTO
[NOME CLUB] — [DATA]

[NOME CLUB] è lieta di comunicare il rinnovo del contratto di [NOME COGNOME] fino al [DATA SCADENZA].

[NOME] è con il club dal [ANNO ARRIVO] e in questi anni ha dimostrato [QUALITÀ PRINCIPALI — attaccamento alla maglia, professionalità, leadership, ecc.].

Le parole del Presidente [NOME PRESIDENTE]:
"[CITAZIONE PRESIDENTE — importanza del rinnovo, soddisfazione per la prosecuzione del rapporto]"

La risposta di [NOME GIOCATORE/STAFF]:
"[CITAZIONE — legame con il club, motivazione, obiettivi per la prossima stagione]"

[NOME CLUB] augura a [NOME] il meglio per il prosieguo della sua avventura in [CITTÀ/CLUB].

#[NOME CLUB] #Rinnovo #[COGNOME]`,
  },
  {
    id: 'pre_gara',
    categoria: 'Pre-gara',
    titolo: 'Pre-gara generico',
    emoji: '⚽',
    descrizione: 'Template pre-partita da compilare con i dati della gara',
    testo: `PRE-GARA | [COMPETIZIONE]
[NOME CLUB] — [DATA]

[NOME SQUADRA] vs [AVVERSARIO]
📅 [DATA E ORA]
🏟️ [STADIO / CAMPO]
🏆 [COMPETIZIONE — es. Serie C, Coppa Italia, Amichevole]

LA VIGILIA

Dopo [ULTIMO RISULTATO — es. la vittoria per 2-0 contro X / il pareggio con X], [NOME SQUADRA] si appresta ad affrontare [AVVERSARIO] in una sfida [IMPORTANZA — fondamentale / da non fallire / di alta classifica].

I rossoneri arrivano all'appuntamento in [CONDIZIONE — forma ottimale / con qualche assenza / carichi di entusiasmo] e puntano a [OBIETTIVO — conquistare i tre punti / continuare la striscia positiva / riscattarsi dopo il ko della scorsa settimana].

LA PAROLA AL MISTER

Mister [NOME ALLENATORE] ha presentato così la gara:
"[DICHIARAZIONE ALLENATORE — analisi avversario, stato di forma, motivazioni, aspettative]"

GLI INDISPONIBILI
[NOME GIOCATORE] — [MOTIVO — infortunio/squalifica]
[NOME GIOCATORE] — [MOTIVO]

I CONVOCATI
[LISTA CONVOCATI oppure scrivere "L'elenco dei convocati sarà comunicato a breve"]

DOVE SEGUIRCI
📺 [CANALE / PIATTAFORMA STREAMING]
📻 [RADIO UFFICIALE]
🔴 Live aggiornamenti sui nostri canali social

#[NOME CLUB] vs #[AVVERSARIO] | #[COMPETIZIONE] | #ForzaRossi`,
  },
  {
    id: 'post_gara_vittoria',
    categoria: 'Post-gara',
    titolo: 'Post-gara — Vittoria',
    emoji: '🏆',
    descrizione: 'Cronaca ed emozioni per una vittoria',
    testo: `POST-GARA | [COMPETIZIONE]
[NOME CLUB] — [DATA]

[NOME SQUADRA] [RISULTATO FINALE] [AVVERSARIO]
[COMPETIZIONE] | [GIORNATA]

TRE PUNTI D'ORO! 🔥

[NOME SQUADRA] conquista una vittoria [AGGETTIVO — preziosa / meritata / sofferta / netta] contro [AVVERSARIO] e [EFFETTO IN CLASSIFICA — sale al primo posto / consolida la vetta / si rilancia in classifica].

LA CRONACA

[MINUTO]' — [NOME GOL 1] porta in vantaggio i padroni di casa / gli ospiti con [DESCRIZIONE GOL — un preciso diagonale / un colpo di testa su cross / un calcio di rigore].
[MINUTO]' — [NOME GOL 2] raddoppia con [DESCRIZIONE].
[MINUTO]' — [AVVERSARIO] accorcia le distanze: [DESCRIZIONE].
[MINUTO]' — [NOME GOL 3] chiude i conti: [DESCRIZIONE].

[Paragrafo narrativo libero sulla prestazione — ritmo della gara, fasi salienti, episodi chiave]

LE DICHIARAZIONI

Mister [NOME ALLENATORE]:
"[DICHIARAZIONE POST-PARTITA — soddisfazione, analisi, prossimi obiettivi]"

[NOME PROTAGONISTA GARA]:
"[DICHIARAZIONE GIOCATORE]"

IL TABELLINO

[NOME SQUADRA]: [FORMAZIONE — es. Bianchi; Rossi, Verdi, Neri, Gialli; Blu, Viola; Arancio, Rosa, Marroni; Grigi]. All. [NOME ALLENATORE]
[AVVERSARIO]: [FORMAZIONE]. All. [NOME ALLENATORE AVVERSARIO]

Marcatori: [LISTA MARCATORI CON MINUTI]
Ammoniti: [LISTA AMMONITI]
Espulsi: [LISTA ESPULSI oppure "—"]
Arbitro: [NOME ARBITRO] di [SEZIONE]
Spettatori: [NUMERO] circa

#[NOME CLUB] #Vittoria #[COMPETIZIONE] #ForzaRossi`,
  },
  {
    id: 'post_gara_pareggio',
    categoria: 'Post-gara',
    titolo: 'Post-gara — Pareggio',
    emoji: '🤝',
    descrizione: 'Cronaca di un pareggio da comunicare ai media',
    testo: `POST-GARA | [COMPETIZIONE]
[NOME CLUB] — [DATA]

[NOME SQUADRA] [RISULTATO] [AVVERSARIO]
[COMPETIZIONE] | [GIORNATA]

UN PUNTO DA [VALUTAZIONE — difendere / analizzare / accettare]

Finisce [RISULTATO] al [STADIO]. [NOME SQUADRA] e [AVVERSARIO] si dividono la posta in palio in una gara [DESCRIZIONE — equilibrata / combattuta / avara di emozioni / ricca di occasioni].

LA CRONACA

[MINUTO]' — [DESCRIZIONE PRIMA RETE]
[MINUTO]' — Risponde [AVVERSARIO]: [DESCRIZIONE PAREGGIO]
[Ulteriori eventi rilevanti]

[Paragrafo narrativo — andamento gara, fasi salienti]

LE DICHIARAZIONI

Mister [NOME ALLENATORE]:
"[DICHIARAZIONE — analisi oggettiva, cosa ha funzionato, cosa no, prospettive]"

IL TABELLINO

[NOME SQUADRA]: [FORMAZIONE]. All. [NOME ALLENATORE]
[AVVERSARIO]: [FORMAZIONE]. All. [NOME ALLENATORE AVVERSARIO]

Marcatori: [LISTA]
Ammoniti: [LISTA]
Arbitro: [NOME ARBITRO] di [SEZIONE]

#[NOME CLUB] #[COMPETIZIONE] #ForzaRossi`,
  },
  {
    id: 'post_gara_sconfitta',
    categoria: 'Post-gara',
    titolo: 'Post-gara — Sconfitta',
    emoji: '😤',
    descrizione: 'Comunicazione sobria e professionale dopo una sconfitta',
    testo: `POST-GARA | [COMPETIZIONE]
[NOME CLUB] — [DATA]

[NOME SQUADRA] [RISULTATO] [AVVERSARIO]
[COMPETIZIONE] | [GIORNATA]

[NOME SQUADRA] cade [DOVE — in casa / in trasferta] per [RISULTATO] contro [AVVERSARIO]. Una sconfitta [AGGETTIVO — amara / da analizzare / che fa male] che arriva dopo [CONTESTO — una settimana positiva / un momento difficile].

LA CRONACA

[DESCRIZIONE SINTETICA DELL'ANDAMENTO DELLA GARA — chi ha segnato, quando, come]

[Paragrafo narrativo — fasi salienti, errori, occasioni mancate, episodi]

LE DICHIARAZIONI

Mister [NOME ALLENATORE]:
"[DICHIARAZIONE — analisi onesta, assunzione di responsabilità, invito a reagire]"

[NOME GIOCATORE/CAPITANO] a caldo:
"[DICHIARAZIONE]"

Il club ringrazia i tifosi presenti per il sostegno e invita tutti a restare uniti in vista del prossimo impegno: [PROSSIMA PARTITA].

IL TABELLINO

[NOME SQUADRA]: [FORMAZIONE]. All. [NOME ALLENATORE]
[AVVERSARIO]: [FORMAZIONE]. All. [NOME ALLENATORE AVVERSARIO]

Marcatori: [LISTA]
Ammoniti: [LISTA]
Arbitro: [NOME ARBITRO] di [SEZIONE]

#[NOME CLUB] #[COMPETIZIONE] #ForzaRossi`,
  },
  {
    id: 'convocazione_conferenza',
    categoria: 'Comunicati',
    titolo: 'Convocazione conferenza stampa',
    emoji: '🎤',
    descrizione: 'Comunicato per convocare i media a una conferenza stampa',
    testo: `CONVOCAZIONE CONFERENZA STAMPA
[NOME CLUB] — [DATA]

[NOME CLUB] convoca i rappresentanti della stampa e dei media a una conferenza stampa che si terrà:

📅 Data: [DATA]
⏰ Ora: [ORA]
📍 Luogo: [LUOGO — es. Sala stampa dello Stadio X, sede del club, ecc.]

All'ordine del giorno:
• [PUNTO 1 — es. Presentazione nuovo tecnico / Conferenza pre-gara / Presentazione stagione]
• [PUNTO 2 — eventuali]

Interverranno:
• [NOME E RUOLO 1]
• [NOME E RUOLO 2]
• [NOME E RUOLO 3 — es. il calciatore X]

Si prega di confermare la propria presenza entro le ore [ORA] del [DATA] al seguente contatto:
📧 [EMAIL]
📱 [TELEFONO]

I giornalisti in possesso di regolare tesserino professionale potranno accreditarsi all'ingresso [INDICAZIONI PER L'ACCESSO].

Ufficio Stampa [NOME CLUB]

#[NOME CLUB] #ConferenzaStampa`,
  },
  {
    id: 'social_matchday',
    categoria: 'Social',
    titolo: 'Social — Matchday post',
    emoji: '📱',
    descrizione: 'Post social per il giorno della partita (Instagram, Facebook, X)',
    testo: `🔴 MATCHDAY 🔴

[NOME SQUADRA] 🆚 [AVVERSARIO]

📅 [DATA]
⏰ [ORA]
🏟️ [STADIO]
🏆 [COMPETIZIONE]

Oggi si gioca. Oggi si lotta. Oggi si vince. 💪

𝗙𝗼𝗿𝘇𝗮 [NOME CLUB]! 🏆

—
📺 [DOVE VEDERE LA PARTITA — canale, streaming]
🔔 Segui gli aggiornamenti in diretta sui nostri canali

#[NOME CLUB] #Matchday #[COMPETIZIONE] #[ABBREVIAZIONE SQUADRA]vs[ABBREVIAZIONE AVVERSARIO] #ForzaRossi`,
  },
  {
    id: 'social_risultato',
    categoria: 'Social',
    titolo: 'Social — Post risultato',
    emoji: '📊',
    descrizione: 'Post social immediato per comunicare il risultato finale',
    testo: `⏱️ FISCHIO FINALE

[NOME SQUADRA] [RISULTATO] [AVVERSARIO]
[COMPETIZIONE] — [GIORNATA]

[EMOJI STATO D'ANIMO — 🔥 vittoria / 🤝 pareggio / 💪 testa alta dopo sconfitta]
[FRASE AD EFFETTO — es. "Tre punti pesanti!" / "Un punto che muove la classifica" / "Si riparte. Insieme."]

⚽ Marcatori: [LISTA]

Prossimo appuntamento:
[DATA] — [AVVERSARIO] — [COMPETIZIONE]

#[NOME CLUB] #[RISULTATO BREVE] #[COMPETIZIONE] #ForzaRossi`,
  },
  {
    id: 'caption_photogallery',
    categoria: 'Social',
    titolo: 'Caption photogallery',
    emoji: '📸',
    descrizione: 'Didascalie per gallerie fotografiche di allenamento o partita',
    testo: `📸 [TITOLO PHOTOGALLERY — es. "Allenamento pre-gara" / "Le emozioni di [SQUADRA] vs [AVVERSARIO]"]

[DATA] · [LUOGO — es. Centro Sportivo XY / Stadio XY]

[BREVE DESCRIZIONE DEL CONTENUTO — es. "Ecco le migliori immagini della seduta di scarico dopo il big match di ieri. La squadra ha lavorato in gruppo per smaltire le fatiche della trasferta di domenica."]

📷 Ph. [NOME FOTOGRAFO]
—
Guarda la gallery completa sul nostro sito: [LINK]

#[NOME CLUB] #Photogallery #[HASHTAG TEMATICO] #[COMPETIZIONE]`,
  },
  {
    id: 'fine_stagione',
    categoria: 'Comunicati',
    titolo: 'Fine stagione / Bilancio',
    emoji: '🎖️',
    descrizione: 'Comunicato di bilancio e ringraziamenti a fine stagione',
    testo: `COMUNICATO UFFICIALE — FINE STAGIONE [ANNO/ANNO+1]
[NOME CLUB] — [DATA]

Si chiude la stagione [ANNO/ANNO+1] per [NOME CLUB].

UN ANNO DI [EMOZIONI / TRAGUARDI / LAVORO]

[Paragrafo 1 — bilancio sportivo: risultati in campionato, coppa, piazzamento finale, obiettivi raggiunti o mancati]

[Paragrafo 2 — bilancio umano: coesione del gruppo, crescita dei giovani, valorizzazione del settore giovanile]

LE PAROLE DEL PRESIDENTE

[NOME PRESIDENTE]:
"[DICHIARAZIONE — ringraziamenti, bilancio, prospettive, annuncio per il futuro]"

LA PAROLA AL MISTER

[NOME ALLENATORE]:
"[DICHIARAZIONE — sentimenti a fine stagione, giudizio sul gruppo, ringraziamenti]"

IL CLUB RINGRAZIA
• I calciatori e lo staff tecnico, per la dedizione e il sacrificio quotidiano
• I dirigenti e i collaboratori, per il lavoro silenzioso ma fondamentale
• Gli sponsor e i partner, per il supporto indispensabile
• I tifosi, per l'affetto e il calore dimostrato in ogni momento

A presto per le novità sulla stagione [PROSSIMO ANNO]! 🔜

#[NOME CLUB] #FineStationa #[ANNO] #Grazie`,
  },
]

// Raggruppa per categoria
const CATEGORIE = Array.from(new Set(TEMPLATES.map(t => t.categoria)))

// ─── Componente principale ────────────────────────────────────────────────────

export default function ArticoliPage() {
  const supabaseRef = useRef(createClient())

  // Modalità: 'library' | 'partita'
  const [modalita, setModalita] = useState<'library' | 'partita'>('library')

  // Library
  const [templateSelezionato, setTemplateSelezionato] = useState<TemplateLibrary | null>(null)
  const [testoEditabile, setTestoEditabile] = useState('')
  const [copiato, setCopiato] = useState(false)

  // Modalità partita
  const [partite, setPartite] = useState<any[]>([])
  const [selectedPartitaId, setSelectedPartitaId] = useState('')
  const [templatePartita, setTemplatePartita] = useState<string | null>(null)
  const [partitaInfo, setPartitaInfo] = useState<any>(null)
  const [loadingPartita, setLoadingPartita] = useState(false)
  const [noteAllenatore, setNoteAllenatore] = useState('')
  const [corpoArticolo, setCorpoArticolo] = useState('')

  // Carica partite
  const loadPartite = useCallback(async () => {
    const supabase = supabaseRef.current
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
    if (!utente) return
    const { data: sqData } = await supabase.from('squadre').select('id').eq('club_id', utente.club_id)
    const sqIds = sqData?.map((s: any) => s.id) ?? []
    if (!sqIds.length) return
    const { data } = await supabase
      .from('partite')
      .select('id, avversario, data_ora, tipo, competizione, casa_trasferta, stato, squadre(nome)')
      .in('squadra_id', sqIds)
      .order('data_ora', { ascending: false })
      .limit(50)
    setPartite(data ?? [])
  }, [])

  useEffect(() => { loadPartite() }, [loadPartite])

  const generaTemplatePartita = useCallback(async (id: string) => {
    if (!id) return
    setLoadingPartita(true)
    setTemplatePartita(null)
    setNoteAllenatore('')
    setCorpoArticolo('')
    const res = await fetch(`/api/ufficio-stampa/articoli?partita_id=${id}`)
    const json = await res.json()
    if (res.ok) {
      setTemplatePartita(json.template)
      setPartitaInfo(json.partita)
    }
    setLoadingPartita(false)
  }, [])

  const selezionaTemplate = (t: TemplateLibrary) => {
    setTemplateSelezionato(t)
    setTestoEditabile(t.testo)
    setCopiato(false)
  }

  const copia = (testo: string) => {
    navigator.clipboard.writeText(testo)
    setCopiato(true)
    setTimeout(() => setCopiato(false), 2000)
  }

  const scaricaTxt = (testo: string, nome: string) => {
    const blob = new Blob([testo], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nome
    a.click()
    URL.revokeObjectURL(url)
  }

  // Template partita full
  const templatePartitaFull = templatePartita
    ? templatePartita
        .replace('[inserire qui le dichiarazioni dell\'allenatore]', noteAllenatore || '[inserire qui le dichiarazioni dell\'allenatore]')
        .replace('[CORPO ARTICOLO — descrizione della gara, analisi, commenti, atmosfera]', corpoArticolo || '[CORPO ARTICOLO — descrizione della gara, analisi, commenti, atmosfera]')
    : null

  const inputStyle = {
    width: '100%', padding: '9px 12px',
    background: '#1a1a1a', border: '1px solid var(--border-solid)',
    borderRadius: 2, color: 'var(--white)', fontSize: 13,
    fontFamily: 'var(--font-sans)', outline: 'none',
  } as const

  const labelStyle = {
    display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
    fontWeight: 700, textTransform: 'uppercase' as const,
    letterSpacing: '0.15em', color: 'var(--grigio-3)', marginBottom: 8,
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)',
        }}>
          Template Articoli
        </h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          Libreria di template pronti all&apos;uso — comunicati, pre/post gara, social e altro
        </p>
      </div>

      {/* Tab modalità */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {([
          { key: 'library', label: '📄 Template libreria' },
          { key: 'partita', label: '⚽ Genera da partita' },
        ] as { key: 'library' | 'partita'; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setModalita(tab.key)}
            style={{
              padding: '8px 20px',
              background: modalita === tab.key ? 'var(--accent)' : 'transparent',
              color: modalita === tab.key ? '#0a0a0a' : 'var(--grigio-3)',
              border: modalita === tab.key ? 'none' : '1px solid var(--border-solid)',
              borderRadius: 2, cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── MODALITÀ LIBRARY ─────────────────────────────────────────────── */}
      {modalita === 'library' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Sidebar template */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {CATEGORIE.map(cat => (
              <div key={cat}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.15em',
                  color: 'var(--grigio-4)', marginBottom: 8,
                }}>
                  {cat}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {TEMPLATES.filter(t => t.categoria === cat).map(t => {
                    const isSelected = templateSelezionato?.id === t.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => selezionaTemplate(t)}
                        style={{
                          padding: '10px 12px', textAlign: 'left',
                          background: isSelected ? 'rgba(200,240,0,0.08)' : '#111',
                          border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-solid)',
                          borderRadius: 2, cursor: 'pointer',
                        }}
                      >
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          fontSize: 13, fontWeight: 600,
                          color: isSelected ? 'var(--accent)' : 'var(--white)',
                          marginBottom: 3,
                        }}>
                          <span>{t.emoji}</span>
                          <span>{t.titolo}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--grigio-4)', lineHeight: 1.4 }}>
                          {t.descrizione}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Area editor */}
          <div>
            {!templateSelezionato ? (
              <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                <div style={{ fontSize: 14, color: 'var(--grigio-4)' }}>
                  Seleziona un template dalla libreria per iniziare
                </div>
                <div style={{ fontSize: 12, color: 'var(--grigio-5)', marginTop: 8 }}>
                  Ogni template è personalizzabile — modifica il testo e copia o scarica il documento
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Header */}
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--white)' }}>
                        {templateSelezionato.emoji} {templateSelezionato.titolo}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--grigio-4)', marginTop: 2 }}>
                        {templateSelezionato.descrizione}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => copia(testoEditabile)}
                        style={{
                          padding: '7px 14px',
                          background: copiato ? 'var(--verde)' : 'var(--accent)',
                          color: '#0a0a0a', border: 'none', borderRadius: 2, cursor: 'pointer',
                          fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', fontWeight: 700,
                        }}
                      >
                        {copiato ? '✓ Copiato' : 'Copia testo'}
                      </button>
                      <button
                        onClick={() => scaricaTxt(
                          testoEditabile,
                          `${templateSelezionato.id}_${new Date().toISOString().slice(0, 10)}.txt`
                        )}
                        style={{
                          padding: '7px 14px', background: 'transparent',
                          color: 'var(--grigio-3)', border: '1px solid var(--border-solid)',
                          borderRadius: 2, cursor: 'pointer',
                          fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase',
                        }}
                      >
                        Scarica .txt
                      </button>
                      <button
                        onClick={() => setTestoEditabile(templateSelezionato.testo)}
                        title="Ripristina testo originale"
                        style={{
                          padding: '7px 10px', background: 'transparent',
                          color: 'var(--grigio-4)', border: '1px solid var(--border-solid)',
                          borderRadius: 2, cursor: 'pointer', fontSize: 13,
                        }}
                      >
                        ↺
                      </button>
                    </div>
                  </div>
                </div>

                {/* Istruzioni */}
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(200,240,0,0.04)',
                  border: '1px solid rgba(200,240,0,0.15)',
                  borderRadius: 2, fontSize: 12, color: 'var(--grigio-3)',
                }}>
                  💡 <strong>Come usare il template:</strong> i campi tra parentesi quadre{' '}
                  <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>[COME QUESTO]</code>{' '}
                  vanno sostituiti con le informazioni reali. Edita direttamente il testo qui sotto.
                </div>

                {/* Editor */}
                <div className="card" style={{ padding: 16 }}>
                  <label style={labelStyle}>Testo modificabile</label>
                  <textarea
                    value={testoEditabile}
                    onChange={e => setTestoEditabile(e.target.value)}
                    rows={28}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      lineHeight: 1.7,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODALITÀ GENERA DA PARTITA ───────────────────────────────────── */}
      {modalita === 'partita' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Selezione partita */}
          <div>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--grigio-3)', marginBottom: 12 }}>
                Seleziona partita
              </div>
              {partite.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--grigio-4)', padding: '20px 0', textAlign: 'center' }}>
                  Nessuna partita trovata
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 500, overflowY: 'auto' }}>
                  {partite.map((p: any) => {
                    const squadraNome = p.squadre?.nome ?? 'Noi'
                    const titolo = p.casa_trasferta === 'casa'
                      ? `${squadraNome} vs ${p.avversario}`
                      : `${p.avversario} vs ${squadraNome}`
                    const isGiocata = p.stato === 'giocata'
                    const isSelected = selectedPartitaId === p.id
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPartitaId(p.id)
                          generaTemplatePartita(p.id)
                        }}
                        style={{
                          padding: '10px 12px', textAlign: 'left',
                          background: isSelected ? 'rgba(200,240,0,0.08)' : '#111',
                          border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-solid)',
                          borderRadius: 2, cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? 'var(--accent)' : 'var(--white)', marginBottom: 3 }}>
                          {titolo}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grigio-4)' }}>
                            {formatData(p.data_ora)}
                          </span>
                          <span style={{
                            fontSize: 9, fontFamily: 'var(--font-mono)',
                            color: isGiocata ? 'var(--verde)' : 'var(--ambra)',
                            background: isGiocata ? 'var(--verde-lt)' : 'var(--ambra-lt)',
                            padding: '2px 6px', borderRadius: 2,
                          }}>
                            {isGiocata ? 'Post-gara' : 'Pre-gara'}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Template generato */}
          <div>
            {!selectedPartitaId && !loadingPartita && (
              <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚽</div>
                <div style={{ fontSize: 14, color: 'var(--grigio-4)' }}>
                  Seleziona una partita per generare il template articolo con i dati reali
                </div>
              </div>
            )}

            {loadingPartita && (
              <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: 'var(--grigio-4)' }}>Generazione template…</div>
              </div>
            )}

            {templatePartitaFull && !loadingPartita && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>
                        {partitaInfo?.home} vs {partitaInfo?.away}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--grigio-4)' }}>
                        {formatData(partitaInfo?.data_ora)} · {partitaInfo?.competizione ?? '—'}
                        {partitaInfo?.risultato && (
                          <span style={{ marginLeft: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>
                            {partitaInfo.risultato}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => copia(templatePartitaFull)}
                        style={{
                          padding: '7px 14px',
                          background: copiato ? 'var(--verde)' : 'var(--accent)',
                          color: '#0a0a0a', border: 'none', borderRadius: 2, cursor: 'pointer',
                          fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', fontWeight: 700,
                        }}
                      >
                        {copiato ? '✓ Copiato' : 'Copia testo'}
                      </button>
                      <button
                        onClick={() => scaricaTxt(
                          templatePartitaFull,
                          `articolo_${partitaInfo?.home}_vs_${partitaInfo?.away}_${partitaInfo?.data_ora?.slice(0, 10) ?? ''}.txt`.replace(/\s+/g, '_').toLowerCase()
                        )}
                        style={{
                          padding: '7px 14px', background: 'transparent',
                          color: 'var(--grigio-3)', border: '1px solid var(--border-solid)',
                          borderRadius: 2, cursor: 'pointer',
                          fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase',
                        }}
                      >
                        Scarica .txt
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dati header */}
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#444', marginBottom: 12 }}>
                    Dati scheda (auto-generati)
                  </div>
                  <pre style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7,
                    color: 'var(--grigio-3)', background: '#0a0a0a',
                    padding: '14px 16px', borderRadius: 2, overflow: 'auto',
                    border: '1px solid var(--border-solid)',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {templatePartita?.split('---')[0]?.trim()}
                  </pre>
                </div>

                {/* Note allenatore */}
                <div className="card" style={{ padding: 16 }}>
                  <label style={labelStyle}>Note / dichiarazioni allenatore</label>
                  <textarea
                    value={noteAllenatore}
                    onChange={e => setNoteAllenatore(e.target.value)}
                    placeholder="Inserisci le dichiarazioni del mister, commenti post-partita…"
                    rows={4}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>

                {/* Corpo articolo */}
                <div className="card" style={{ padding: 16 }}>
                  <label style={labelStyle}>Corpo articolo</label>
                  <textarea
                    value={corpoArticolo}
                    onChange={e => setCorpoArticolo(e.target.value)}
                    placeholder="Scrivi qui il testo dell'articolo…"
                    rows={10}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>

                {/* Preview completa */}
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#444', marginBottom: 12 }}>
                    Preview documento completo
                  </div>
                  <pre style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7,
                    color: 'var(--grigio-3)', background: '#0a0a0a',
                    padding: '14px 16px', borderRadius: 2, overflow: 'auto',
                    border: '1px solid var(--border-solid)',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    maxHeight: 400,
                  }}>
                    {templatePartitaFull}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
