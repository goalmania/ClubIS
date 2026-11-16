'use client'
import Link from 'next/link'
import type { RuoloUtente } from '@/types/database'

type AzioneRapida = {
  label: string
  href: string
  icon: string
  area: string
  colore?: string
}

const AZIONI_PER_RUOLO: Record<RuoloUtente, AzioneRapida[]> = {
  segretario: [
    { area: 'Anagrafica',    label: 'Importa dati',           href: '/dashboard/segretario/import',                               icon: '⬆',  colore: 'var(--verde)' },
    { area: 'Anagrafica',    label: 'Gestisci iscrizioni',    href: '/dashboard/segretario/iscrizioni',                           icon: '📝', colore: 'var(--verde)' },
    { area: 'Anagrafica',    label: 'Visite mediche',         href: '/dashboard/segretario/certificati',                          icon: '🏥', colore: '#f97316' },
    { area: 'Contabilità',   label: 'Rimborso trasferta',     href: '/dashboard/segretario/prima-nota?tipo=uscita&categoria=trasferte&form=1',   icon: '🚌', colore: 'var(--accent)' },
    { area: 'Contabilità',   label: 'Pagamento fornitore',    href: '/dashboard/segretario/prima-nota?tipo=uscita&categoria=altro&form=1',        icon: '🏢', colore: 'var(--accent)' },
    { area: 'Contabilità',   label: 'Tassa federale',         href: '/dashboard/segretario/prima-nota?tipo=uscita&categoria=federazione&form=1',   icon: '💰', colore: 'var(--accent)' },
    { area: 'Contabilità',   label: 'Visualizza bilancio',    href: '/dashboard/segretario/prima-nota',                          icon: '📊', colore: 'var(--accent)' },
    { area: 'FIGC',          label: 'Scadenziario FIGC',      href: '/dashboard/segretario/scadenze-figc',                       icon: '📋', colore: 'var(--rosso)' },
    { area: 'FIGC',          label: 'Pratiche tesseramento',  href: '/dashboard/segretario/pratiche-tesseramento',               icon: '🪪', colore: 'var(--rosso)' },
    { area: 'FIGC',          label: 'Comunicati FIGC',        href: '/dashboard/segretario/figc/comunicati',                     icon: '📨', colore: 'var(--rosso)' },
    { area: 'FIGC',          label: 'Monitor squalifiche',    href: '/dashboard/segretario/figc/squalifiche',                    icon: '⚠',  colore: 'var(--rosso)' },
    { area: 'Documenti',     label: 'Genera documento',       href: '/dashboard/segretario/documenti',                           icon: '📄', colore: '#a855f7' },
    { area: 'Documenti',     label: 'Quietanze',              href: '/dashboard/segretario/quietanze',                           icon: '✍',  colore: '#a855f7' },
    { area: 'Comunicazione', label: 'Invia comunicazione',    href: '/dashboard/segretario/comunicazioni',                       icon: '📣', colore: 'var(--verde)' },
    { area: 'Comunicazione', label: 'Gestisci accrediti',     href: '/dashboard/segretario/accrediti',                           icon: '🎫', colore: 'var(--ambra)' },
    { area: 'Giovanili',     label: 'Gestisci squadre',       href: '/dashboard/segretario/settore-giovanile',                   icon: '🏟', colore: '#22d3ee' },
    { area: 'Giovanili',     label: 'Quote mensili',          href: '/dashboard/segretario/settore-giovanile',                   icon: '💶', colore: '#22d3ee' },
  ],
  presidente: [
    { area: 'Finanze',    label: 'Prima nota',         href: '/dashboard/segretario/prima-nota',    icon: '📊', colore: 'var(--accent)' },
    { area: 'Finanze',    label: 'Config. finanziaria',href: '/dashboard/segretario/configurazione-finanziaria', icon: '💹', colore: 'var(--accent)' },
    { area: 'Club',       label: 'Info club',          href: '/dashboard/presidente/club',           icon: '🏛', colore: 'var(--verde)' },
    { area: 'Club',       label: 'Sponsor',            href: '/dashboard/presidente/sponsor',        icon: '💼', colore: 'var(--verde)' },
    { area: 'Club',       label: 'Organigramma',       href: '/dashboard/presidente/organigramma',   icon: '👥', colore: 'var(--verde)' },
    { area: 'Obiettivi',  label: 'Obiettivi',          href: '/dashboard/presidente/obiettivi',      icon: '🎯', colore: '#a855f7' },
    { area: 'Rosa',       label: 'Disponibilità rosa', href: '/dashboard/presidente/disponibilita',  icon: '✓',  colore: '#f97316' },
    { area: 'Risultati',  label: 'Ultimi risultati',   href: '/dashboard/presidente/risultati',      icon: '🏆', colore: '#f97316' },
  ],
  allenatore: [
    { area: 'Allenamento', label: 'Nuovo allenamento',    href: '/dashboard/allenatore/allenamenti/nuovo', icon: '⚽', colore: 'var(--accent)' },
    { area: 'Allenamento', label: 'Registra presenze',    href: '/dashboard/allenatore/presenze',          icon: '✓',  colore: 'var(--accent)' },
    { area: 'Partite',     label: 'Convocazioni',         href: '/dashboard/allenatore/convocazioni',      icon: '📋', colore: 'var(--verde)' },
    { area: 'Rosa',        label: 'Disponibilità rosa',   href: '/dashboard/allenatore/disponibilita',     icon: '👥', colore: '#f97316' },
    { area: 'Tattica',     label: 'Schema tattico',       href: '/dashboard/allenatore/tattica',           icon: '♟',  colore: '#a855f7' },
    { area: 'Valutazioni', label: 'Valuta giocatore',     href: '/dashboard/allenatore/valutazioni/nuova', icon: '⭐', colore: '#a855f7' },
    { area: 'Messaggi',    label: 'Messaggio squadra',    href: '/dashboard/allenatore/messaggi/nuovo',    icon: '✉',  colore: 'var(--verde)' },
  ],
  ds: [
    { area: 'Mercato',     label: 'Nuova trattativa',   href: '/dashboard/ds/mercato',       icon: '↗',  colore: 'var(--accent)' },
    { area: 'Rosa',        label: 'Disponibilità rosa', href: '/dashboard/ds/disponibilita', icon: '✓',  colore: 'var(--accent)' },
    { area: 'Contratti',   label: 'Scadenze contratti', href: '/dashboard/ds/contratti',     icon: '📋', colore: '#f97316' },
    { area: 'Scouting',    label: 'Nuovo scouting',     href: '/dashboard/osservatore/giocatori', icon: '🔭', colore: '#a855f7' },
    { area: 'Statistiche', label: 'Statistiche rosa',   href: '/dashboard/ds/statistiche',   icon: '📊', colore: 'var(--verde)' },
  ],
  medico: [
    { area: 'Infortuni',  label: 'Registra infortunio',   href: '/dashboard/medico/infortuni',    icon: '🏥', colore: 'var(--rosso)' },
    { area: 'Visite',     label: 'Pianifica visita',       href: '/dashboard/medico/visite',       icon: '📅', colore: 'var(--verde)' },
    { area: 'Certificati',label: 'Cert. in scadenza',      href: '/dashboard/medico/certificati',  icon: '⚠',  colore: '#f97316' },
    { area: 'Cartelle',   label: 'Cartelle mediche',       href: '/dashboard/medico/cartelle',     icon: '📁', colore: 'var(--verde)' },
    { area: 'Rosa',       label: 'Stato sanitario rosa',   href: '/dashboard/medico/giocatori',    icon: '👥', colore: 'var(--accent)' },
  ],
  osservatore: [
    { area: 'Scouting',  label: 'Nuovo report',        href: '/dashboard/osservatore/giocatori',  icon: '📝', colore: 'var(--accent)' },
    { area: 'Pipeline',  label: 'Pipeline scouting',   href: '/dashboard/osservatore/pipeline',   icon: '📊', colore: 'var(--verde)' },
    { area: 'Confronto', label: 'Confronta giocatori', href: '/dashboard/osservatore/confronto',  icon: '⚖',  colore: '#a855f7' },
  ],
  team_manager: [
    { area: 'Materiale',  label: 'Richiedi materiale', href: '/dashboard/team-manager/materiale',  icon: '🎒', colore: 'var(--accent)' },
    { area: 'Trasferte',  label: 'Gestisci trasferte', href: '/dashboard/team-manager/trasferte',  icon: '🚌', colore: 'var(--verde)' },
    { area: 'Presenze',   label: 'Presenze rapide',    href: '/dashboard/team-manager/presenze',   icon: '✓',  colore: 'var(--accent)' },
    { area: 'FIGC',       label: 'Distinte gara',      href: '/dashboard/team-manager/distinte',   icon: '📋', colore: '#f97316' },
  ],
  famiglia: [
    { area: 'Figlio',     label: 'Profilo figlio',  href: '/dashboard/famiglia',            icon: '👤', colore: 'var(--accent)' },
    { area: 'Pagamenti',  label: 'Paga quota',      href: '/dashboard/famiglia/pagamenti',  icon: '💳', colore: 'var(--verde)' },
    { area: 'Calendario', label: 'Prossimi eventi', href: '/dashboard/famiglia/calendario', icon: '📅', colore: '#f97316' },
    { area: 'Sviluppo',   label: 'Progressi figlio',href: '/dashboard/famiglia/sviluppo',   icon: '⭐', colore: '#a855f7' },
  ],
  giocatore: [
    { area: 'Sport',      label: 'Allenamenti',     href: '/dashboard/giocatore/allenamenti',   icon: '⚽', colore: 'var(--accent)' },
    { area: 'Sport',      label: 'Convocazioni',    href: '/dashboard/giocatore/convocazioni',  icon: '📋', colore: 'var(--accent)' },
    { area: 'Sport',      label: 'Partite',         href: '/dashboard/giocatore/partite',       icon: '🏆', colore: '#f97316' },
    { area: 'Sviluppo',   label: 'Valutazioni',     href: '/dashboard/giocatore/valutazioni',   icon: '⭐', colore: '#a855f7' },
    { area: 'Pagamenti',  label: 'Le mie quote',    href: '/dashboard/giocatore/pagamenti',     icon: '💳', colore: 'var(--verde)' },
  ],
  custode: [
    { area: 'Impianti',  label: 'Esegui checklist',  href: '/dashboard/custode/impianti', icon: '✅', colore: 'var(--accent)' },
    { area: 'Impianti',  label: 'Apri ticket',        href: '/dashboard/custode/impianti', icon: '⚠', colore: 'var(--rosso)' },
  ],
  ufficio_stampa: [
    { area: 'Media',      label: 'Nuova intervista',    href: '/dashboard/ufficio-stampa/interviste/nuova',   icon: '🎙', colore: 'var(--accent)' },
    { area: 'Media',      label: 'Calendario media',    href: '/dashboard/ufficio-stampa/calendario-media',   icon: '📅', colore: 'var(--accent)' },
    { area: 'Media',      label: 'Accrediti',           href: '/dashboard/ufficio-stampa/accrediti',          icon: '🎫', colore: 'var(--ambra)' },
    { area: 'Contenuti',  label: 'Nuovo brief',         href: '/dashboard/ufficio-stampa/locandine/nuova',    icon: '🎨', colore: 'var(--verde)' },
    { area: 'Contenuti',  label: 'Template articoli',   href: '/dashboard/ufficio-stampa/articoli',           icon: '📰', colore: 'var(--verde)' },
  ],
}

// Variante ridotta per il verticale "scuola calcio standalone": solo azioni
// senza machinery FIGC agonistica (distinte, squalifiche, mercato, SEPA...).
// Ruoli non coperti qui (es. famiglia) ricadono su AZIONI_PER_RUOLO come sempre.
const AZIONI_PER_RUOLO_SCUOLA_CALCIO: Partial<Record<RuoloUtente, AzioneRapida[]>> = {
  presidente: [
    { area: 'Scuola',     label: 'Info scuola',        href: '/dashboard/presidente/club',          icon: '🏛', colore: 'var(--verde)' },
    { area: 'Scuola',     label: 'Staff',              href: '/dashboard/presidente/staff',          icon: '👥', colore: 'var(--verde)' },
    { area: 'Finanze',    label: 'Entrate & uscite',   href: '/dashboard/presidente/finanze',        icon: '📊', colore: 'var(--accent)' },
    { area: 'Comunicazione', label: 'Comunicazioni',   href: '/dashboard/presidente/comunicazioni',  icon: '📣', colore: 'var(--verde)' },
  ],
  segretario: [
    { area: 'Anagrafica',    label: 'Gestisci iscrizioni', href: '/dashboard/segretario/iscrizioni',          icon: '📝', colore: 'var(--verde)' },
    { area: 'Anagrafica',    label: 'Certificati medici',  href: '/dashboard/segretario/certificati',         icon: '🏥', colore: '#f97316' },
    { area: 'Quote',         label: 'Quote mensili',       href: '/dashboard/segretario/quote',               icon: '💶', colore: 'var(--accent)' },
    { area: 'Quote',         label: 'Pagamenti',           href: '/dashboard/segretario/pagamenti',           icon: '💰', colore: 'var(--accent)' },
    { area: 'Attività',      label: 'Calendario',          href: '/dashboard/segretario/calendario',          icon: '📅', colore: '#22d3ee' },
    { area: 'Attività',      label: 'Trasferte & tornei',  href: '/dashboard/segretario/trasferte',           icon: '🚌', colore: '#22d3ee' },
    { area: 'Comunicazione', label: 'Invia comunicazione', href: '/dashboard/segretario/comunicazioni',       icon: '📣', colore: 'var(--verde)' },
  ],
  allenatore: [
    { area: 'Categoria',   label: 'Rosa',                href: '/dashboard/allenatore/rosa',          icon: '👥', colore: '#f97316' },
    { area: 'Categoria',   label: 'Registra presenze',   href: '/dashboard/allenatore/presenze',      icon: '✓',  colore: 'var(--accent)' },
    { area: 'Categoria',   label: 'Allenamenti',         href: '/dashboard/allenatore/allenamenti',   icon: '⚽', colore: 'var(--accent)' },
    { area: 'Sviluppo',    label: 'Valutazioni mensili',  href: '/dashboard/allenatore/valutazioni',  icon: '⭐', colore: '#a855f7' },
  ],
}

// Una riga sotto ogni azione per far capire subito cosa si fa.
const SPIEGAZIONI: Record<string, string> = {
  "Importa dati": "Carica giocatori da file",
  "Gestisci iscrizioni": "Richieste e moduli ricevuti",
  "Visite mediche": "Certificati e scadenze",
  "Rimborso trasferta": "Registra una spesa di viaggio",
  "Pagamento fornitore": "Registra un'uscita",
  "Tassa federale": "Registra un versamento FIGC",
  "Visualizza bilancio": "Entrate, uscite e saldo",
  "Scadenziario FIGC": "Adempimenti e date",
  "Pratiche tesseramento": "Stato delle pratiche",
  "Comunicati FIGC": "Leggi e abbina i comunicati",
  "Monitor squalifiche": "Squalificati e diffidati",
  "Genera documento": "Moduli e lettere pronti",
  "Quietanze": "Ricevute da firmare",
  "Invia comunicazione": "Messaggio a famiglie e staff",
  "Gestisci accrediti": "Richieste stampa e ospiti",
  "Gestisci squadre": "Categorie del settore giovanile",
  "Quote mensili": "Rette e pagamenti",
  "Prima nota": "Registra entrate e uscite",
  "Config. finanziaria": "Quote, conti e categorie",
  "Info club": "Dati, logo e firma",
  "Sponsor": "Contratti e importi",
  "Organigramma": "Ruoli e responsabili",
  "Obiettivi": "Traguardi della stagione",
  "Disponibilità rosa": "Chi è disponibile per la gara",
  "Ultimi risultati": "Partite giocate e punteggi",
  "Nuovo allenamento": "Pianifica una seduta",
  "Registra presenze": "Chi c'era all'allenamento",
  "Convocazioni": "Lista per la prossima gara",
  "Schema tattico": "Modulo e posizioni",
  "Valuta giocatore": "Scheda di valutazione",
  "Messaggio squadra": "Scrivi a giocatori e famiglie",
  "Nuova trattativa": "Apri una trattativa di mercato",
  "Scadenze contratti": "Contratti in scadenza",
  "Nuovo scouting": "Segnala un giocatore",
  "Statistiche rosa": "Numeri della squadra",
  "Registra infortunio": "Nuovo infortunio in rosa",
  "Pianifica visita": "Fissa una visita medica",
  "Cert. in scadenza": "Certificati da rinnovare",
  "Cartelle mediche": "Storico sanitario",
  "Stato sanitario rosa": "Chi è idoneo",
  "Nuovo report": "Scheda di osservazione",
  "Pipeline scouting": "Giocatori seguiti per fase",
  "Confronta giocatori": "Metti a confronto due profili",
  "Richiedi materiale": "Divise e attrezzatura",
  "Gestisci trasferte": "Viaggi e logistica",
  "Presenze rapide": "Segna le presenze",
  "Distinte gara": "Distinta per l'arbitro",
  "Profilo figlio": "Dati e squadra",
  "Paga quota": "Pagamenti e ricevute",
  "Prossimi eventi": "Allenamenti e partite",
  "Progressi figlio": "Valutazioni e crescita",
  "Allenamenti": "Le prossime sedute",
  "Partite": "Calendario e risultati",
  "Valutazioni": "Le tue schede",
  "Le mie quote": "Pagamenti e scadenze",
  "Esegui checklist": "Controlli di oggi",
  "Apri ticket": "Segnala un problema",
  "Nuova intervista": "Organizza un'intervista",
  "Calendario media": "Uscite e appuntamenti",
  "Accrediti": "Richieste stampa",
  "Nuovo brief": "Richiesta grafica per locandina",
  "Template articoli": "Testi pronti da usare",
  "Info scuola": "Dati, logo e firma",
  "Staff": "Allenatori e collaboratori",
  "Entrate & uscite": "Movimenti del mese",
  "Comunicazioni": "Messaggi alle famiglie",
  "Certificati medici": "Certificati e scadenze",
  "Pagamenti": "Rette incassate e da incassare",
  "Calendario": "Allenamenti ed eventi",
  "Trasferte & tornei": "Viaggi e tornei",
  "Rosa": "Giocatori della categoria",
  "Valutazioni mensili": "Schede del mese",
}

export default function AzioniRapide({ ruolo, variante = 'agonistico' }: { ruolo: RuoloUtente; variante?: 'agonistico' | 'scuola_calcio' }) {
  const azioni = (variante === 'scuola_calcio' ? AZIONI_PER_RUOLO_SCUOLA_CALCIO[ruolo] : undefined) ?? AZIONI_PER_RUOLO[ruolo] ?? []

  // Raggruppa per area
  const perArea = azioni.reduce<Record<string, AzioneRapida[]>>((acc, a) => {
    if (!acc[a.area]) acc[a.area] = []
    acc[a.area].push(a)
    return acc
  }, {})

  // Su computer: gruppi con righe (icona · nome · cosa fa). Su telefono la
  // stessa struttura diventa una griglia di icone 4 per riga (vedi globals.css).
  return (
    <section className="glass az" style={{ marginBottom: 20, padding: '16px 14px 12px' }}>
      <h2 className="az-titolo">Azioni rapide</h2>
      <div className="az-gruppi">
        {Object.entries(perArea).map(([area, azioniArea]) => (
          <div key={area} className="az-gruppo">
            <div className="az-area">{area}</div>
            {azioniArea.map(a => <AzioneLink key={a.href + a.label} azione={a} />)}
          </div>
        ))}
      </div>
    </section>
  )
}

function AzioneLink({ azione: a }: { azione: AzioneRapida }) {
  const spiegazione = SPIEGAZIONI[a.label]
  return (
    <Link href={a.href} className="az-voce">
      <span aria-hidden="true" className="az-icona">{a.icon}</span>
      <span className="az-testo">
        <span className="az-nome">{a.label}</span>
        {spiegazione && <span className="az-spiega">{spiegazione}</span>}
      </span>
      <svg className="az-freccia" aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>
    </Link>
  )
}
