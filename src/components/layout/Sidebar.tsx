'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { RuoloUtente } from '@/types/database'
import clsx from 'clsx'
import { useScadenzeFIGCCount } from '@/hooks/useScadenzeFIGCCount'
import { canAccess, type Feature, type PlanTier } from '@/lib/features'

const Icon = {
  Home:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Users:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Calendar:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
  Check:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Trophy:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
  FileText:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>,
  Search:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  Euro:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 20.1 8 8 0 0 0 19 18"/></svg>,
  Bell:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  Message:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  BarChart:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>,
  Shield:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  LogOut:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>,
  Star:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Clipboard: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/></svg>,
  User:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Settings:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
  Heart:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>,
  Target:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Map:       () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" x2="8" y1="2" y2="18"/><line x1="16" x2="16" y1="6" y2="22"/></svg>,
  Handshake: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88"/><path d="m6.7 17.3-1.4 1.4a1 1 0 1 0 3 3"/><path d="M2 12h2"/><path d="M22 12h-2"/></svg>,
  Layout:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="21" y2="9"/></svg>,
  Upload:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
  Tag:       () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" x2="7.01" y1="7" y2="7"/></svg>,
  AlertTriangle: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>,
  Folder:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>,
  Activity:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Stadium:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18"/><path d="M5 10v8"/><path d="M19 10v8"/><path d="M3 18h18"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v4"/></svg>,
  Link:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Mic:       () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>,
  Newspaper: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>,
  Tv:        () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>,
  Image:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  Ticket:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>,
}

type NavVoce = { label: string; href: string; icon: keyof typeof Icon; feature?: Feature }
type NavSezione = { titolo?: string; voci: NavVoce[] }

const navConfig: Record<RuoloUtente, NavSezione[]> = {
  presidente: [
    { voci: [{ label: 'Panoramica', href: '/dashboard/presidente', icon: 'Home' }] },
    { titolo: 'Club', voci: [
      { label: 'Info Club', href: '/dashboard/presidente/club', icon: 'Shield' },
      { label: 'Organigramma', href: '/dashboard/presidente/organigramma', icon: 'Users' },
      { label: 'Staff', href: '/dashboard/presidente/staff', icon: 'Users' },
      { label: 'Gestione Account', href: '/dashboard/presidente/gestione-account', icon: 'Settings' },
      { label: 'Abbonamento', href: '/dashboard/presidente/abbonamento', icon: 'Tag' },
      { label: 'Inviti Staff', href: '/dashboard/presidente/inviti', icon: 'Link' },
      { label: 'Sponsor', href: '/dashboard/presidente/sponsor', icon: 'Handshake' },
      { label: 'Compliance campionato', href: '/dashboard/presidente/compliance-campionato', icon: 'Check', feature: 'compliance_indice' },
    ]},
    { titolo: 'Finanze', voci: [
      { label: 'Pagamenti', href: '/dashboard/segretario/pagamenti', icon: 'Euro' },
      { label: 'Rendiconto', href: '/dashboard/segretario/pagamenti/rendiconto', icon: 'BarChart' },
      { label: 'Entrate & Uscite', href: '/dashboard/presidente/finanze', icon: 'BarChart' },
      { label: 'FFP / Budget', href: '/dashboard/presidente/ffp', icon: 'Target' },
      { label: 'Budget Stagionale', href: '/dashboard/presidente/budget-stagionale', icon: 'BarChart' },
    ]},
    { titolo: 'Sport', voci: [
      { label: 'Disponibilità rosa', href: '/dashboard/presidente/disponibilita', icon: 'Check' },
      { label: 'Risultati', href: '/dashboard/presidente/risultati', icon: 'Trophy' },
      { label: 'Obiettivi', href: '/dashboard/presidente/obiettivi', icon: 'Star', feature: 'obiettivi_club' },
      { label: 'Report mensile', href: '/dashboard/presidente/report', icon: 'BarChart', feature: 'report_mensile_automatico' },
      { label: 'Accrediti', href: '/dashboard/segretario/accrediti', icon: 'Ticket' },
      { label: 'Impianti', href: '/dashboard/presidente/impianti', icon: 'Stadium' },
      { label: 'Stadio', href: '/dashboard/stadio', icon: 'Stadium', feature: 'biglietteria_stadio' },
    ]},
    { voci: [
      { label: 'Consigli Interviste', href: '/dashboard/ufficio-stampa/consigli-interviste', icon: 'Mic' },
      { label: 'Comunicazioni', href: '/dashboard/presidente/comunicazioni', icon: 'Message' },
      { label: 'Bacheca', href: '/dashboard/presidente/messaggi', icon: 'Layout' },
      { label: 'Config. notifiche', href: '/dashboard/notifiche/impostazioni', icon: 'Bell' },
    ]},
  ],
  ds: [
    { voci: [{ label: 'Panoramica', href: '/dashboard/ds', icon: 'Home' }] },
    { titolo: 'Rosa', voci: [
      { label: 'Disponibilità', href: '/dashboard/ds/disponibilita', icon: 'Check' },
      { label: 'Gestione rosa', href: '/dashboard/ds/rosa', icon: 'Users' },
      { label: 'Contratti', href: '/dashboard/ds/contratti', icon: 'FileText', feature: 'contratti_tesserati' },
      { label: 'Scadenze', href: '/dashboard/ds/scadenze', icon: 'Bell' },
      { label: 'Mercato', href: '/dashboard/ds/mercato', icon: 'Target', feature: 'trattative_mercato' },
      { label: 'Budget Mercato', href: '/dashboard/ds/budget-mercato', icon: 'Euro', feature: 'budget_mercato_ds' },
      { label: 'Tracker Movimenti', href: '/dashboard/ds/tracker-mercato', icon: 'Activity', feature: 'trattative_mercato' },
      { label: 'Consigli Interviste', href: '/dashboard/ufficio-stampa/consigli-interviste', icon: 'Mic' },
    ]},
    { titolo: 'Gare', voci: [
      { label: 'Partite & Risultati', href: '/dashboard/ds/partite', icon: 'Trophy' },
    ]},
    { titolo: 'Scouting', voci: [
      { label: 'Report scouting', href: '/dashboard/ds/scouting', icon: 'Search', feature: 'scouting_report' },
      { label: 'Database giocatori', href: '/dashboard/ds/database', icon: 'Users', feature: 'scouting_report' },
      { label: 'Impianti', href: '/dashboard/presidente/impianti', icon: 'Stadium' },
      { label: 'Stadio', href: '/dashboard/stadio', icon: 'Stadium', feature: 'biglietteria_stadio' },
    ]},
    { voci: [
      { label: 'Statistiche', href: '/dashboard/ds/statistiche', icon: 'BarChart' },
      { label: 'Bacheca', href: '/dashboard/ds/messaggi', icon: 'Layout' },
      { label: 'Config. notifiche', href: '/dashboard/notifiche/impostazioni', icon: 'Bell' },
    ]},
  ],
  segretario: [
    { voci: [{ label: 'Panoramica', href: '/dashboard/segretario', icon: 'Home' }] },
    { titolo: 'Anagrafica', voci: [
      { label: 'Giocatori', href: '/dashboard/segretario/giocatori', icon: 'Users' },
      { label: 'Gruppi', href: '/dashboard/segretario/gruppi', icon: 'Layout' },
      { label: 'Tesseramenti', href: '/dashboard/segretario/tesseramenti', icon: 'FileText' },
      { label: 'Certificati medici', href: '/dashboard/segretario/certificati', icon: 'Shield' },
    ]},
    { titolo: 'Gare', voci: [
      { label: 'Disponibilità rosa', href: '/dashboard/segretario/disponibilita', icon: 'Check' },
      { label: 'Partite', href: '/dashboard/segretario/partite', icon: 'Trophy' },
      { label: 'Distinte gara', href: '/dashboard/segretario/distinte', icon: 'Clipboard' },
      { label: 'Accrediti', href: '/dashboard/segretario/accrediti', icon: 'Ticket' },
      { label: 'Stadio', href: '/dashboard/stadio', icon: 'Stadium', feature: 'biglietteria_stadio' },
    ]},
    { titolo: 'FIGC', voci: [
      { label: 'Scadenze FIGC', href: '/dashboard/segretario/scadenze-figc', icon: 'Bell' },
      { label: 'Pratiche Tess.', href: '/dashboard/segretario/pratiche-tesseramento', icon: 'FileText' },
      { label: 'Import Calendario', href: '/dashboard/segretario/figc/calendario', icon: 'Calendar' },
      { label: 'Rosa FIGC', href: '/dashboard/segretario/figc/rosa', icon: 'Users' },
      { label: 'Moduli FIGC', href: '/dashboard/segretario/figc/moduli', icon: 'FileText' },
      { label: 'Comunicati FIGC', href: '/dashboard/segretario/figc/comunicati', icon: 'FileText', feature: 'comunicati_figc_analisi' },
      { label: 'Monitor Squalifiche', href: '/dashboard/segretario/figc/squalifiche', icon: 'AlertTriangle', feature: 'monitor_squalifiche' },
      { label: 'Portafoglio FIGC', href: '/dashboard/segretario/figc/portafoglio', icon: 'Euro' },
    ]},
    { titolo: 'Finanze', voci: [
      { label: 'Pagamenti', href: '/dashboard/segretario/pagamenti', icon: 'Euro' },
      { label: 'Rimborsi SEPA', href: '/dashboard/segretario/rimborsi', icon: 'Euro', feature: 'rimborso_sepa' },
      { label: 'Quote iscrizione', href: '/dashboard/segretario/quote', icon: 'FileText' },
      { label: 'Prima nota', href: '/dashboard/segretario/prima-nota', icon: 'BarChart' },
      { label: 'Fornitori & Clienti', href: '/dashboard/segretario/fornitori', icon: 'Handshake' },
      { label: 'Quietanze', href: '/dashboard/segretario/quietanze', icon: 'FileText' },
      { label: 'Registro IVA', href: '/dashboard/segretario/registro-iva', icon: 'FileText' },
      { label: 'Rendiconto', href: '/dashboard/segretario/pagamenti/rendiconto', icon: 'BarChart' },
      { label: 'Budget Stagionale', href: '/dashboard/presidente/budget-stagionale', icon: 'BarChart' },
      { label: 'Config. finanziaria', href: '/dashboard/segretario/configurazione-finanziaria', icon: 'Settings', feature: 'configurazione_finanziaria' },
      { label: 'Sconti', href: '/dashboard/segretario/sconti', icon: 'Tag' },
    ]},
    { titolo: 'Settore Giovanile', voci: [
      { label: 'Squadre & Quote', href: '/dashboard/segretario/settore-giovanile', icon: 'Users' },
    ]},
    { titolo: 'Iscrizioni', voci: [
      { label: 'Iscrizioni online', href: '/dashboard/segretario/iscrizioni', icon: 'Clipboard' },
      { label: 'Compensi', href: '/dashboard/segretario/compensi', icon: 'Euro', feature: 'compensi_staff' },
    ]},
    { titolo: 'Gestione', voci: [
      { label: 'Documenti', href: '/dashboard/segretario/documenti', icon: 'FileText', feature: 'genera_documenti' },
      { label: 'Compliance', href: '/dashboard/segretario/compliance', icon: 'Shield' },
      { label: 'Comunicazioni', href: '/dashboard/segretario/comunicazioni', icon: 'Message' },
      { label: 'Archivio', href: '/dashboard/segretario/archivio', icon: 'Folder' },
      { label: 'Import dati', href: '/dashboard/segretario/import', icon: 'Upload' },
      { label: 'Impianti', href: '/dashboard/presidente/impianti', icon: 'Stadium' },
    ]},
    { voci: [
      { label: 'Bacheca', href: '/dashboard/segretario/messaggi', icon: 'Layout' },
      { label: 'Config. notifiche', href: '/dashboard/notifiche/impostazioni', icon: 'Bell' },
    ]},
  ],
  allenatore: [
    { voci: [{ label: 'Panoramica', href: '/dashboard/allenatore', icon: 'Home' }] },
    { titolo: 'Squadra', voci: [
      { label: 'Disponibilità', href: '/dashboard/allenatore/disponibilita', icon: 'Check' },
      { label: 'Rosa', href: '/dashboard/allenatore/rosa', icon: 'Users' },
      { label: 'Allenamenti', href: '/dashboard/allenatore/allenamenti', icon: 'Calendar' },
      { label: 'Presenze', href: '/dashboard/allenatore/presenze', icon: 'Check' },
      { label: 'Indisponibili', href: '/dashboard/allenatore/indisponibili', icon: 'AlertTriangle' },
    ]},
    { titolo: 'Gare', voci: [
      { label: 'Partite', href: '/dashboard/allenatore/partite', icon: 'Trophy' },
      { label: 'Convocazioni', href: '/dashboard/allenatore/convocazioni', icon: 'Clipboard' },
      { label: 'Statistiche', href: '/dashboard/allenatore/statistiche', icon: 'BarChart' },
      { label: 'Analisi partita', href: '/dashboard/allenatore/analisi-partita', icon: 'Search' },
    ]},
    { titolo: 'Sviluppo', voci: [
      { label: 'Valutazioni', href: '/dashboard/allenatore/valutazioni', icon: 'Star' },
      { label: 'Tattica', href: '/dashboard/allenatore/tattica', icon: 'Layout' },
      { label: 'Programmazione', href: '/dashboard/allenatore/programmazione', icon: 'Calendar' },
    ]},
    { voci: [
      { label: 'Consigli Interviste', href: '/dashboard/ufficio-stampa/consigli-interviste', icon: 'Mic' },
      { label: 'Bacheca', href: '/dashboard/allenatore/messaggi', icon: 'Layout' },
      { label: 'Config. notifiche', href: '/dashboard/notifiche/impostazioni', icon: 'Bell' },
    ]},
  ],
  osservatore: [
    { voci: [{ label: 'Panoramica', href: '/dashboard/osservatore', icon: 'Home' }] },
    { titolo: 'Scouting', voci: [
      { label: 'Nuovo report', href: '/dashboard/osservatore/nuovo-report', icon: 'FileText' },
      { label: 'I miei report', href: '/dashboard/osservatore/report', icon: 'Search' },
      { label: 'Giocatori seguiti', href: '/dashboard/osservatore/giocatori', icon: 'Users' },
      { label: 'Mappa osservazioni', href: '/dashboard/osservatore/mappa', icon: 'Map' },
      { label: 'Confronto', href: '/dashboard/osservatore/confronto', icon: 'BarChart' },
    ]},
    { voci: [
      { label: 'Statistiche', href: '/dashboard/osservatore/statistiche', icon: 'BarChart' },
      { label: 'Bacheca', href: '/dashboard/osservatore/messaggi', icon: 'Layout' },
      { label: 'Config. notifiche', href: '/dashboard/notifiche/impostazioni', icon: 'Bell' },
    ]},
  ],
  medico: [
    { voci: [{ label: 'Panoramica', href: '/dashboard/medico', icon: 'Home' }] },
    { titolo: 'Clinica', voci: [
      { label: 'Cartelle mediche', href: '/dashboard/medico/cartelle', icon: 'Folder' },
      { label: 'Infortuni', href: '/dashboard/medico/infortuni', icon: 'AlertTriangle' },
      { label: 'Visite mediche', href: '/dashboard/medico/visite', icon: 'Calendar' },
      { label: 'Certificati', href: '/dashboard/medico/certificati', icon: 'Shield' },
    ]},
    { titolo: 'Prevenzione', voci: [
      { label: 'Prevenzione', href: '/dashboard/medico/prevenzione', icon: 'Heart' },
      { label: 'Giocatori', href: '/dashboard/medico/giocatori', icon: 'Users' },
    ]},
    { voci: [
      { label: 'Bacheca', href: '/dashboard/medico/messaggi', icon: 'Layout' },
      { label: 'Config. notifiche', href: '/dashboard/notifiche/impostazioni', icon: 'Bell' },
    ]},
  ],
  famiglia: [
    { voci: [{ label: 'Home', href: '/dashboard/famiglia', icon: 'Home' }] },
    { voci: [
      { label: 'Pagamenti', href: '/dashboard/famiglia/pagamenti', icon: 'Euro' },
      { label: 'Calendario', href: '/dashboard/famiglia/calendario', icon: 'Calendar' },
      { label: 'Sviluppo', href: '/dashboard/famiglia/sviluppo', icon: 'Star' },
      { label: 'Comunicazioni', href: '/dashboard/famiglia/comunicazioni', icon: 'Message' },
      { label: 'Bacheca', href: '/dashboard/famiglia/messaggi', icon: 'Layout' },
      { label: 'Profilo', href: '/dashboard/famiglia/profilo', icon: 'User' },
      { label: 'Config. notifiche', href: '/dashboard/notifiche/impostazioni', icon: 'Bell' },
    ]},
  ],
  team_manager: [
    { voci: [{ label: 'Panoramica', href: '/dashboard/team-manager', icon: 'Home' }] },
    { titolo: 'Logistica', voci: [
      { label: 'Calendario', href: '/dashboard/team-manager/calendario', icon: 'Calendar' },
      { label: 'Trasferte', href: '/dashboard/team-manager/trasferte', icon: 'Map' },
      { label: 'Materiale', href: '/dashboard/team-manager/materiale', icon: 'Clipboard' },
    ]},
    { titolo: 'Squadra', voci: [
      { label: 'Distinte gara', href: '/dashboard/team-manager/distinte', icon: 'FileText' },
      { label: 'Presenze', href: '/dashboard/team-manager/presenze', icon: 'Check' },
      { label: 'Accrediti', href: '/dashboard/team-manager/accrediti', icon: 'Ticket' },
      { label: 'Comunicazioni', href: '/dashboard/team-manager/comunicazioni', icon: 'Message' },
      { label: 'Stadio', href: '/dashboard/stadio', icon: 'Stadium', feature: 'biglietteria_stadio' },
    ]},
    { titolo: 'Finanze', voci: [
      { label: 'Pagamenti', href: '/dashboard/segretario/pagamenti', icon: 'Euro' },
      { label: 'Budget Stagionale', href: '/dashboard/presidente/budget-stagionale', icon: 'BarChart' },
    ]},
    { titolo: 'FIGC', voci: [
      { label: 'Rosa FIGC', href: '/dashboard/segretario/figc/rosa', icon: 'Users' },
      { label: 'Moduli FIGC', href: '/dashboard/segretario/figc/moduli', icon: 'FileText' },
    ]},
    { voci: [
      { label: 'Consigli Interviste', href: '/dashboard/ufficio-stampa/consigli-interviste', icon: 'Mic' },
      { label: 'Bacheca', href: '/dashboard/team-manager/messaggi', icon: 'Layout' },
      { label: 'Config. notifiche', href: '/dashboard/notifiche/impostazioni', icon: 'Bell' },
    ]},
  ],
  giocatore: [
    { voci: [{ label: 'Il mio profilo', href: '/dashboard/giocatore', icon: 'Home' }] },
    { titolo: 'Sport', voci: [
      { label: 'Allenamenti', href: '/dashboard/giocatore/allenamenti', icon: 'Calendar' },
      { label: 'Convocazioni', href: '/dashboard/giocatore/convocazioni', icon: 'Clipboard' },
      { label: 'Partite', href: '/dashboard/giocatore/partite', icon: 'Trophy' },
      { label: 'Statistiche', href: '/dashboard/giocatore/statistiche', icon: 'BarChart' },
    ]},
    { titolo: 'Sviluppo', voci: [
      { label: 'Valutazioni', href: '/dashboard/giocatore/valutazioni', icon: 'Star' },
    ]},
    { titolo: 'Pagamenti', voci: [
      { label: 'Le mie quote', href: '/dashboard/giocatore/pagamenti', icon: 'Euro' },
    ]},
    { voci: [
      { label: 'Consigli Interviste', href: '/dashboard/ufficio-stampa/consigli-interviste', icon: 'Mic' },
      { label: 'Comunicazioni', href: '/dashboard/giocatore/comunicazioni', icon: 'Message' },
      { label: 'Config. notifiche', href: '/dashboard/notifiche/impostazioni', icon: 'Bell' },
    ]},
  ],
  custode: [
    { voci: [{ label: 'Panoramica', href: '/dashboard/custode', icon: 'Home' }] },
    { titolo: 'Impianti', voci: [
      { label: 'Checklist', href: '/dashboard/custode/impianti', icon: 'Clipboard' },
      { label: 'Ticket problemi', href: '/dashboard/custode/impianti', icon: 'AlertTriangle' },
    ]},
    { voci: [
      { label: 'Config. notifiche', href: '/dashboard/notifiche/impostazioni', icon: 'Bell' },
    ]},
  ],
  ufficio_stampa: [
    { voci: [{ label: 'Panoramica', href: '/dashboard/ufficio-stampa', icon: 'Home' }] },
    { titolo: 'Media', voci: [
      { label: 'Calendario media', href: '/dashboard/ufficio-stampa/calendario-media', icon: 'Calendar' },
      { label: 'Interviste & TV', href: '/dashboard/ufficio-stampa/interviste', icon: 'Tv' },
      { label: 'Nuova intervista', href: '/dashboard/ufficio-stampa/interviste/nuova', icon: 'Mic' },
    ]},
    { titolo: 'Contenuti', voci: [
      { label: 'Brief locandine', href: '/dashboard/ufficio-stampa/locandine', icon: 'Image' },
      { label: 'Nuovo brief', href: '/dashboard/ufficio-stampa/locandine/nuova', icon: 'FileText' },
      { label: 'Template articoli', href: '/dashboard/ufficio-stampa/articoli', icon: 'Newspaper' },
      { label: 'Accrediti', href: '/dashboard/ufficio-stampa/accrediti', icon: 'Ticket' },
      { label: 'Consigli Interviste', href: '/dashboard/ufficio-stampa/consigli-interviste', icon: 'Mic' },
    ]},
    { voci: [
      { label: 'Config. notifiche', href: '/dashboard/notifiche/impostazioni', icon: 'Bell' },
    ]},
  ],
}

const ruoloLabel: Record<RuoloUtente, string> = {
  presidente: 'Presidente', ds: 'Direttore Sportivo', segretario: 'Segretario',
  allenatore: 'Allenatore', osservatore: 'Osservatore', medico: 'Medico',
  famiglia: 'Famiglia', team_manager: 'Team Manager', giocatore: 'Atleta',
  ufficio_stampa: 'Ufficio Stampa', custode: 'Custode',
}

interface SidebarProps {
  ruolo: RuoloUtente
  utente: { nome: string; cognome: string }
  club: { nome: string; categoria: string; logoUrl?: string | null }
  notifiche?: number
  isSuperAdmin?: boolean
  planTier?: PlanTier
}

export default function Sidebar({ ruolo, utente, club, notifiche = 0, isSuperAdmin = false, planTier = 'starter' }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const sezioni = navConfig[ruolo] ?? navConfig.segretario
  const scadenzeUrgenti = useScadenzeFIGCCount()
  const iniziali = `${utente.nome[0] ?? '?'}${utente.cognome[0] ?? ''}`.toUpperCase()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth/login')
    router.refresh()
  }

  const basePath = ruolo === 'team_manager'
    ? '/dashboard/team-manager'
    : ruolo === 'ufficio_stampa'
    ? '/dashboard/ufficio-stampa'
    : `/dashboard/${ruolo}`

  const isActive = (href: string) => {
    if (href === basePath) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside style={{
      width: 240,
      minHeight: '100vh',
      background: '#0d0d0d',
      borderRight: '1px solid var(--border-solid)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflowY: 'auto',
    }}>
      {/* Header club */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border-solid)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Logo club — immagine se disponibile, altrimenti iniziali su lime */}
          {club.logoUrl ? (
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              overflow: 'hidden', border: '1px solid var(--border)',
              background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img
                src={club.logoUrl}
                alt={club.nome}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={e => {
                  // Fallback: nascondi img e mostra iniziali nel parent
                  const el = e.currentTarget
                  el.style.display = 'none'
                  const parent = el.parentElement
                  if (parent) {
                    parent.style.background = 'var(--accent)'
                    parent.innerHTML = `<span style="font-family:var(--font-display);font-weight:900;font-size:12px;color:#0a0a0a;letter-spacing:0.05em">${club.nome.slice(0, 2).toUpperCase()}</span>`
                  }
                }}
              />
            </div>
          ) : (
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 12,
              color: '#0a0a0a', letterSpacing: '0.05em',
              flexShrink: 0,
            }}>
              {club.nome.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {club.nome}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {club.categoria.replace(/_/g, ' ')}
            </div>
          </div>
        </div>
      </div>

      {/* Navigazione */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {sezioni.map((sezione, si) => (
          <div key={si} style={{ marginBottom: 4 }}>
            {sezione.titolo && (
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.58rem', fontWeight: 700, color: '#333',
                textTransform: 'uppercase', letterSpacing: '0.2em',
                padding: '12px 10px 6px',
              }}>
                {sezione.titolo}
              </div>
            )}
            {sezione.voci.filter(voce => !voce.feature || canAccess(voce.feature, planTier)).map(voce => {
              const IconComp = Icon[voce.icon]
              const attiva = isActive(voce.href)
              return (
                <Link
                  key={voce.href}
                  href={voce.href}
                  className={clsx('sidebar-nav-link', { active: attiva })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.78rem', letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    marginBottom: 1,
                  }}
                >
                  <IconComp />
                  <span>{voce.label}</span>
                  {voce.icon === 'Bell' && notifiche > 0 && (
                    <span style={{
                      marginLeft: 'auto', background: 'var(--accent-red)', color: 'white',
                      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                      padding: '1px 6px', borderRadius: 999,
                    }}>
                      {notifiche}
                    </span>
                  )}
                  {voce.href === '/dashboard/segretario/scadenze-figc' && scadenzeUrgenti > 0 && (
                    <span style={{
                      marginLeft: 'auto', background: '#ff4444', color: 'white',
                      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                      padding: '1px 6px', borderRadius: 999,
                    }}>
                      {scadenzeUrgenti}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Admin link */}
      {isSuperAdmin && (
        <div style={{ padding: '0 8px 8px' }}>
          <div style={{ height: 1, background: 'var(--border-solid)', marginBottom: 8 }} />
          <Link
            href="/admin"
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8,
              fontFamily: 'var(--font-display)', fontSize: '0.78rem',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              textDecoration: 'none',
              background: 'var(--accent-red-lt)', color: 'var(--accent-red)',
              fontWeight: 600,
            }}
          >
            <Icon.Settings />
            <span>Pannello Admin</span>
          </Link>
        </div>
      )}

      {/* Utente / logout */}
      <div style={{
        padding: '12px 12px',
        borderTop: '1px solid var(--border-solid)',
        display: 'flex', alignItems: 'center', gap: 9,
        background: '#0d0d0d',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--gray-mid)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          flexShrink: 0, border: '1px solid var(--border)',
        }}>
          {iniziali}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600,
            letterSpacing: '0.05em', textTransform: 'uppercase',
            color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {utente.nome} {utente.cognome}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', letterSpacing: '0.08em' }}>{ruoloLabel[ruolo]}</div>
        </div>
        <button
          onClick={handleLogout}
          title="Esci"
          className="topbar-icon-btn"
          style={{ flexShrink: 0 }}
        >
          <Icon.LogOut />
        </button>
      </div>
    </aside>
  )
}
