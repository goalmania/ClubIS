export type PlanTier = 'starter' | 'pro' | 'elite' | 'super_admin'

export type Feature =
  | 'rosa_base'
  | 'calendario_partite'
  | 'gestione_quote_iscrizioni'
  | 'scadenze_figc'
  | 'distinta_gara_pdf'
  | 'bacheca_comunicazioni'
  | 'presenze_allenamenti'
  | 'certificati_medici'
  | 'portafoglio_figc'
  | 'gestione_fornitori'
  | 'archivio_documenti'
  | 'iscrizioni_online'
  | 'onboarding_tour'
  | 'consigli_interviste'
  | 'budget_stagionale'
  | 'gestione_account_membri'
  | 'dashboard_ds'
  | 'contratti_tesserati'
  | 'trattative_mercato'
  | 'scouting_report'
  | 'dashboard_medico_completa'
  | 'cartelle_cliniche'
  | 'visite_mediche'
  | 'compensi_staff'
  | 'rimborso_sepa'
  | 'comunicati_figc_analisi'
  | 'monitor_squalifiche'
  | 'configurazione_finanziaria'
  | 'compliance_indice'
  | 'genera_documenti'
  | 'obiettivi_club'
  | 'dashboard_addetto_stampa'
  | 'ufficio_stampa_ai'
  | 'biglietteria_stadio'
  | 'configurazione_stadio'
  | 'budget_mercato_ds'
  | 'dm_scout_integrazione'
  | 'ai_interview_prep_avanzato'
  | 'report_mensile_automatico'
  | 'multi_osservatore'

const ALL: PlanTier[] = ['starter', 'pro', 'elite']
const PRO_UP: PlanTier[] = ['pro', 'elite']
const ELITE: PlanTier[] = ['elite']

export const FEATURE_GATES: Record<Feature, PlanTier[]> = {
  // Starter+
  rosa_base:                 ALL,
  calendario_partite:        ALL,
  gestione_quote_iscrizioni: ALL,
  scadenze_figc:             ALL,
  distinta_gara_pdf:         ALL,
  bacheca_comunicazioni:     ALL,
  presenze_allenamenti:      ALL,
  certificati_medici:        ALL,
  portafoglio_figc:          ALL,
  gestione_fornitori:        ALL,
  archivio_documenti:        ALL,
  iscrizioni_online:         ALL,
  onboarding_tour:           ALL,
  consigli_interviste:       ALL,
  budget_stagionale:         ALL,
  gestione_account_membri:   ALL,
  // Pro+
  dashboard_ds:              PRO_UP,
  contratti_tesserati:       PRO_UP,
  trattative_mercato:        PRO_UP,
  scouting_report:           PRO_UP,
  dashboard_medico_completa: PRO_UP,
  cartelle_cliniche:         PRO_UP,
  visite_mediche:            PRO_UP,
  compensi_staff:            PRO_UP,
  rimborso_sepa:             PRO_UP,
  comunicati_figc_analisi:   PRO_UP,
  monitor_squalifiche:       PRO_UP,
  configurazione_finanziaria:PRO_UP,
  compliance_indice:         PRO_UP,
  genera_documenti:          PRO_UP,
  obiettivi_club:            PRO_UP,
  dashboard_addetto_stampa:  PRO_UP,
  ufficio_stampa_ai:         PRO_UP,
  biglietteria_stadio:       PRO_UP,
  configurazione_stadio:     PRO_UP,
  budget_mercato_ds:         PRO_UP,
  // Elite only
  dm_scout_integrazione:        ELITE,
  ai_interview_prep_avanzato:   ELITE,
  report_mensile_automatico:    ELITE,
  multi_osservatore:            ELITE,
}

export function canAccess(feature: Feature, plan: PlanTier): boolean {
  if (plan === 'super_admin') return true
  return FEATURE_GATES[feature]?.includes(plan) ?? false
}

/** Piano minimo richiesto per una feature (per UpgradeBanner) */
export function requiredPlan(feature: Feature): PlanTier {
  const gates = FEATURE_GATES[feature]
  if (gates?.includes('starter')) return 'starter'
  if (gates?.includes('pro'))     return 'pro'
  return 'elite'
}

export const PLAN_LABEL: Record<PlanTier, string> = {
  starter:     'Starter',
  pro:         'Pro',
  elite:       'Elite',
  super_admin: 'Super Admin',
}
