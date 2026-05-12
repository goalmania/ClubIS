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
    { area: 'Contabilità',   label: 'Rimborso trasferta',     href: '/dashboard/segretario/pagamenti/nuovo?tipo=rimborso_trasferta', icon: '🚌', colore: 'var(--accent)' },
    { area: 'Contabilità',   label: 'Pagamento fornitore',    href: '/dashboard/segretario/pagamenti/nuovo?tipo=fornitore',       icon: '🏢', colore: 'var(--accent)' },
    { area: 'Contabilità',   label: 'Tassa federale',         href: '/dashboard/segretario/pagamenti/nuovo?tipo=tassa_federale',  icon: '💰', colore: 'var(--accent)' },
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
    { area: 'Impianti',  label: 'Apri ticket',        href: '/dashboard/custode/impianti', icon: '🔴', colore: 'var(--rosso)' },
  ],
  ufficio_stampa: [
    { area: 'Media',      label: 'Nuova intervista',    href: '/dashboard/ufficio-stampa/interviste/nuova',   icon: '🎙', colore: 'var(--accent)' },
    { area: 'Media',      label: 'Calendario media',    href: '/dashboard/ufficio-stampa/calendario-media',   icon: '📅', colore: 'var(--accent)' },
    { area: 'Media',      label: 'Accrediti',           href: '/dashboard/ufficio-stampa/accrediti',          icon: '🎫', colore: 'var(--ambra)' },
    { area: 'Contenuti',  label: 'Nuovo brief',         href: '/dashboard/ufficio-stampa/locandine/nuova',    icon: '🎨', colore: 'var(--verde)' },
    { area: 'Contenuti',  label: 'Template articoli',   href: '/dashboard/ufficio-stampa/articoli',           icon: '📰', colore: 'var(--verde)' },
  ],
}

export default function AzioniRapide({ ruolo }: { ruolo: RuoloUtente }) {
  const azioni = AZIONI_PER_RUOLO[ruolo] ?? []

  // Raggruppa per area
  const perArea = azioni.reduce<Record<string, AzioneRapida[]>>((acc, a) => {
    if (!acc[a.area]) acc[a.area] = []
    acc[a.area].push(a)
    return acc
  }, {})

  return (
    <div style={{
      background: '#0d0d0d',
      border: '1px solid var(--border-solid)',
      borderRadius: 12,
      marginBottom: 24,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 18px',
        borderBottom: '1px solid var(--border-solid)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 14 }}>⚡</span>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 12,
          color: 'var(--white)',
        }}>
          Azioni Rapide
        </span>
      </div>

      {/* Grid aree */}
      <div style={{
        padding: '14px 16px',
        display: 'flex', flexWrap: 'wrap', gap: 20,
      }}>
        {Object.entries(perArea).map(([area, azioniArea]) => (
          <div key={area} style={{ minWidth: 140 }}>
            {/* Area label */}
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: '#444', marginBottom: 7,
            }}>
              {area}
            </div>
            {/* Azioni */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {azioniArea.map(a => (
                <AzioneLink key={a.href} azione={a} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Tiny client wrapper per hover effect — isolato così AzioniRapide resta server-compatible
function AzioneLink({ azione: a }: { azione: AzioneRapida }) {
  return (
    <Link href={a.href} style={{ textDecoration: 'none' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px',
          background: '#111',
          border: '1px solid var(--border-solid)',
          borderLeft: `3px solid ${a.colore ?? 'var(--accent)'}`,
          borderRadius: 10,
          cursor: 'pointer',
          fontSize: 11, color: 'var(--white)',
          fontFamily: 'var(--font-display)', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.05em',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(200,240,0,0.05)'
          e.currentTarget.style.borderLeftColor = a.colore ?? 'var(--accent)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = '#111'
          e.currentTarget.style.borderLeftColor = a.colore ?? 'var(--accent)'
        }}
      >
        <span style={{ fontSize: 13, flexShrink: 0, lineHeight: 1 }}>{a.icon}</span>
        <span style={{ lineHeight: 1.2 }}>{a.label}</span>
      </div>
    </Link>
  )
}
