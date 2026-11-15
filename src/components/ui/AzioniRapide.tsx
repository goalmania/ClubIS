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

export default function AzioniRapide({ ruolo, variante = 'agonistico' }: { ruolo: RuoloUtente; variante?: 'agonistico' | 'scuola_calcio' }) {
  const azioni = (variante === 'scuola_calcio' ? AZIONI_PER_RUOLO_SCUOLA_CALCIO[ruolo] : undefined) ?? AZIONI_PER_RUOLO[ruolo] ?? []

  // Raggruppa per area
  const perArea = azioni.reduce<Record<string, AzioneRapida[]>>((acc, a) => {
    if (!acc[a.area]) acc[a.area] = []
    acc[a.area].push(a)
    return acc
  }, {})

  return (
    <section style={{
      background: 'var(--surface-2)',
      borderRadius: 20,
      marginBottom: 24,
      padding: '16px 18px 18px',
    }}>
      <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--white)', marginBottom: 12 }}>
        Azioni rapide
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
        gap: '16px 18px',
      }}>
        {Object.entries(perArea).map(([area, azioniArea]) => (
          <div key={area} style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray)', marginBottom: 6 }}>
              {area}
            </div>
            <div className="azioni-list" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {azioniArea.map(a => (
                <AzioneLink key={a.href} azione={a} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function AzioneLink({ azione: a }: { azione: AzioneRapida }) {
  return (
    <Link href={a.href} className="quick-action-link" style={{ gap: 10 }}>
      <span aria-hidden="true" style={{
        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, lineHeight: 1,
        color: a.colore ?? 'var(--accent)',
        background: `color-mix(in srgb, ${a.colore ?? 'var(--accent)'} 18%, transparent)`,
      }}>{a.icon}</span>
      <span style={{ lineHeight: 1.25, minWidth: 0 }}>{a.label}</span>
    </Link>
  )
}
