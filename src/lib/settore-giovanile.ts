// src/lib/settore-giovanile.ts
// Costanti e helpers per il Modulo 6 — Settore Giovanile
import { stagioneCorrente } from '@/lib/helpers'

// ── Categorie squadre ─────────────────────────────────────────────────────

export const CATEGORIE_SQUADRA = {
  prima_squadra: { label: 'Prima Squadra', colore: '#c8f000', ordine: 0 },
  juniores:      { label: 'Juniores',      colore: '#388bfd', ordine: 1 },
  primavera:     { label: 'Primavera',     colore: '#00c8a0', ordine: 2 },
  u19:           { label: 'Under 19',      colore: '#a78bfa', ordine: 3 },
  u17:           { label: 'Under 17',      colore: '#ff9900', ordine: 4 },
  u16:           { label: 'Under 16',      colore: '#f97316', ordine: 5 },
  u15:           { label: 'Under 15',      colore: '#facc15', ordine: 6 },
  u14:           { label: 'Under 14',      colore: '#34d399', ordine: 7 },
  u13:           { label: 'Under 13',      colore: '#22d3ee', ordine: 8 },
  u12:           { label: 'Under 12',      colore: '#a3e635', ordine: 9 },
  u10:           { label: 'Under 10',      colore: '#fb923c', ordine: 10 },
  u8:            { label: 'Under 8',       colore: '#f472b6', ordine: 11 },
  u6:            { label: 'Under 6',       colore: '#c084fc', ordine: 12 },
  femminile:     { label: 'Femminile',     colore: '#fb7185', ordine: 13 },
} as const

export type CategoriaSquadra = keyof typeof CATEGORIE_SQUADRA

// 'femminile' resta nella mappa CATEGORIE_SQUADRA solo per compatibilità con
// eventuali letture legacy del label — il genere è ora un campo separato
// (colonna squadre.genere), quindi non è più un'età selezionabile.
export const CATEGORIE_SQUADRA_OPTIONS = Object.entries(CATEGORIE_SQUADRA)
  .filter(([value]) => value !== 'femminile')
  .sort((a, b) => a[1].ordine - b[1].ordine)
  .map(([value, meta]) => ({ value, label: meta.label }))

// ── Categorie federali (Settore Giovanile e Scolastico) ─────────────────
// Nomenclatura tradizionale usata dalle scuole calcio, che raggruppa le
// annate tecniche (categoria_eta) in fasce riconosciute dalla federazione.
// Ogni categoria federale copre una o più categoria_eta (le fasce con due
// anni di età hanno un 1° e 2° anno sulla stessa categoria_eta).
export const CATEGORIE_FEDERALI = {
  piccoli_amici: { label: 'Piccoli Amici',       etaCodes: ['u6'] as CategoriaSquadra[],                    ordine: 0 },
  primi_calci:   { label: 'Primi Calci',         etaCodes: ['u8'] as CategoriaSquadra[],                    ordine: 1 },
  pulcini:       { label: 'Pulcini',              etaCodes: ['u10'] as CategoriaSquadra[],                  ordine: 2 },
  esordienti:    { label: 'Esordienti',          etaCodes: ['u12', 'u13'] as CategoriaSquadra[],             ordine: 3 },
  giovanissimi:  { label: 'Giovanissimi',        etaCodes: ['u14', 'u15'] as CategoriaSquadra[],             ordine: 4 },
  allievi:       { label: 'Allievi',              etaCodes: ['u16', 'u17'] as CategoriaSquadra[],            ordine: 5 },
  juniores:      { label: 'Juniores/Primavera',  etaCodes: ['u19', 'juniores', 'primavera'] as CategoriaSquadra[], ordine: 6 },
} as const

export type CategoriaFederale = keyof typeof CATEGORIE_FEDERALI

export const CATEGORIE_FEDERALI_OPTIONS = Object.entries(CATEGORIE_FEDERALI)
  .sort((a, b) => a[1].ordine - b[1].ordine)
  .map(([value, meta]) => ({ value: value as CategoriaFederale, label: meta.label }))

/** categoria_eta "principale" di una categoria federale — usata per creare la squadra se non esiste ancora */
export function etaPrincipaleCategoriaFederale(categoria: CategoriaFederale): CategoriaSquadra {
  return CATEGORIE_FEDERALI[categoria].etaCodes[0]
}

/** Trova la categoria federale che contiene una data categoria_eta (utile per raggruppare squadre esistenti) */
export function categoriaFederaleDaEta(eta: string): CategoriaFederale | null {
  const entry = Object.entries(CATEGORIE_FEDERALI).find(([, meta]) => (meta.etaCodes as string[]).includes(eta))
  return entry ? (entry[0] as CategoriaFederale) : null
}

/**
 * Etichetta da mostrare per una squadra nelle select/liste: per club scuola
 * calcio usa il nome federale (Esordienti, Allievi, ecc.) invece del nome
 * tecnico grezzo ("Under 12") che alcune squadre hanno ancora salvato da
 * creazioni precedenti — non serve toccare i dati, solo la visualizzazione.
 * Se il nome della squadra è già stato personalizzato (diverso dal nome
 * federale) lo mostra tra parentesi per non perdere l'informazione.
 * Per club agonistici, o categorie non giovanili (prima_squadra, femminile),
 * torna al formato precedente invariato.
 */
export function labelSquadra(squadra: { nome: string; categoria_eta: string }, isScuolaCalcio: boolean): string {
  if (isScuolaCalcio) {
    const cat = categoriaFederaleDaEta(squadra.categoria_eta)
    if (cat) {
      const federale = CATEGORIE_FEDERALI[cat].label
      return squadra.nome && squadra.nome !== federale ? `${federale} (${squadra.nome})` : federale
    }
  }
  return `${squadra.nome}${squadra.categoria_eta ? ` (${squadra.categoria_eta.toUpperCase().replace(/_/g, ' ')})` : ''}`
}

/**
 * Definizione dei gruppi/squadre di default per club scuola calcio, usata
 * sia dal bottone "Crea gruppi default" (src/app/api/gruppi/auto-assign)
 * sia dalla card della pagina Gruppi (src/app/dashboard/segretario/gruppi) —
 * un'unica fonte di verità per evitare che le due schermate mostrino fasce
 * d'età diverse per lo stesso nome categoria.
 */
export const CATEGORIE_FEDERALI_GRUPPI_DEFAULT = [
  { nome: 'Piccoli Amici',       colore: '#ffcc00', tipo: 'squadra', etaMin: 5,  etaMax: 6,  categoriaEta: 'u6'  },
  { nome: 'Primi Calci',         colore: '#66ddff', tipo: 'squadra', etaMin: 7,  etaMax: 8,  categoriaEta: 'u8'  },
  { nome: 'Pulcini',             colore: '#ff7722', tipo: 'squadra', etaMin: 9,  etaMax: 10, categoriaEta: 'u10' },
  { nome: 'Esordienti',          colore: '#ff4444', tipo: 'squadra', etaMin: 11, etaMax: 12, categoriaEta: 'u12' },
  { nome: 'Giovanissimi',        colore: '#aa88ff', tipo: 'squadra', etaMin: 13, etaMax: 14, categoriaEta: 'u14' },
  { nome: 'Allievi',             colore: '#ff9900', tipo: 'squadra', etaMin: 15, etaMax: 16, categoriaEta: 'u16' },
  { nome: 'Juniores/Primavera',  colore: '#388bfd', tipo: 'squadra', etaMin: 17, etaMax: -1, categoriaEta: 'u19' },
  { nome: 'Staff Tecnico',       colore: '#888888', tipo: 'staff',   etaMin: -1, etaMax: -1, categoriaEta: null  },
] as const

/**
 * Collega un allenatore alla squadra della categoria federale indicata:
 * riusa la squadra del club se già esiste per una delle categoria_eta della
 * categoria federale, altrimenti la crea. Supporta più allenatori per
 * squadra (co-allenatori) tramite la tabella squadre_allenatori.
 * `supabase` è tipizzato genericamente per restare isomorfo (usato sia da
 * route server con l'admin client che da eventuali chiamate client-side).
 */
export async function collegaAllenatoreCategoria(
  supabase: any,
  params: { clubId: string; allenatoreId: string; categoriaFederale: string },
): Promise<{ squadraId: string | null }> {
  const { clubId, allenatoreId, categoriaFederale } = params
  const meta = (CATEGORIE_FEDERALI as Record<string, { label: string; etaCodes: readonly string[] }>)[categoriaFederale]
  if (!meta) return { squadraId: null }

  const { data: esistenti } = await supabase
    .from('squadre')
    .select('id')
    .eq('club_id', clubId)
    .in('categoria_eta', meta.etaCodes)
    .order('created_at', { ascending: true })
    .limit(1)

  let squadraId: string | null = esistenti?.[0]?.id ?? null

  if (!squadraId) {
    const { data: nuova } = await supabase
      .from('squadre')
      .insert({
        club_id:       clubId,
        nome:          meta.label,
        categoria_eta: meta.etaCodes[0],
        stagione:      stagioneCorrente(),
      })
      .select('id')
      .single()
    squadraId = nuova?.id ?? null
  }

  if (!squadraId) return { squadraId: null }

  await supabase
    .from('squadre_allenatori')
    .upsert(
      { club_id: clubId, squadra_id: squadraId, allenatore_id: allenatoreId },
      { onConflict: 'squadra_id,allenatore_id' },
    )

  return { squadraId }
}

/** Categoria federale stimata dalla sola data di nascita (nessuna squadra assegnata) */
export function categoriaFederaleDaEtaAnagrafica(dataNascita: string | null | undefined): CategoriaFederale | null {
  if (!dataNascita) return null
  const oggi = new Date()
  const d = new Date(dataNascita)
  let eta = oggi.getFullYear() - d.getFullYear()
  if (oggi.getMonth() < d.getMonth() || (oggi.getMonth() === d.getMonth() && oggi.getDate() < d.getDate())) eta--
  if (eta <= 6) return 'piccoli_amici'
  if (eta <= 8) return 'primi_calci'
  if (eta <= 10) return 'pulcini'
  if (eta <= 12) return 'esordienti'
  if (eta <= 14) return 'giovanissimi'
  if (eta <= 16) return 'allievi'
  return 'juniores'
}

/**
 * Collega un giocatore al "gruppo" (tabella gruppi/gruppi_membri, la vista
 * Gruppi & Categorie) della sua categoria federale: riusa il gruppo del club
 * se esiste già con quel nome, altrimenti lo crea. Questo è ciò che fa
 * apparire automaticamente il giocatore nella pagina Gruppi non appena viene
 * aggiunto, senza dover premere manualmente "Crea gruppi default".
 */
export async function collegaGiocatoreGruppoCategoria(
  supabase: any,
  params: { clubId: string; giocatoreId: string; categoriaFederale: CategoriaFederale },
): Promise<void> {
  const { clubId, giocatoreId, categoriaFederale } = params
  const label = CATEGORIE_FEDERALI[categoriaFederale].label
  const meta = CATEGORIE_FEDERALI_GRUPPI_DEFAULT.find(c => c.nome === label)

  const { data: esistente } = await supabase
    .from('gruppi')
    .select('id')
    .eq('club_id', clubId)
    .eq('nome', label)
    .eq('tipo', 'squadra')
    .maybeSingle()

  let gruppoId: string | undefined = esistente?.id

  if (!gruppoId) {
    const { data: nuovo } = await supabase
      .from('gruppi')
      .insert({
        club_id:  clubId,
        nome:     label,
        tipo:     'squadra',
        colore:   meta?.colore ?? '#c8f000',
        stagione: stagioneCorrente(),
        attivo:   true,
      })
      .select('id')
      .single()
    gruppoId = nuovo?.id
  }

  if (!gruppoId) return

  const { data: giaPresente } = await supabase
    .from('gruppi_membri')
    .select('id')
    .eq('gruppo_id', gruppoId)
    .eq('giocatore_id', giocatoreId)
    .maybeSingle()

  if (!giaPresente) {
    await supabase.from('gruppi_membri').insert({ gruppo_id: gruppoId, giocatore_id: giocatoreId })
  }
}

/**
 * Squadre di cui un allenatore è responsabile: quelle con squadre.allenatore_id
 * (titolare, usato dai club agonistici) più quelle collegate come co-allenatore
 * tramite squadre_allenatori (scuola calcio, più allenatori per categoria).
 */
export async function getSquadreAllenatore(
  supabase: any,
  params: { clubId: string; allenatoreId: string; soloAttive?: boolean },
): Promise<{ id: string; nome: string; categoria_eta: string }[]> {
  const { clubId, allenatoreId, soloAttive = true } = params

  const { data: collegamenti } = await supabase
    .from('squadre_allenatori')
    .select('squadra_id')
    .eq('allenatore_id', allenatoreId)

  const idsExtra: string[] = (collegamenti ?? []).map((c: any) => c.squadra_id)

  let query = supabase
    .from('squadre')
    .select('id, nome, categoria_eta')
    .eq('club_id', clubId)

  if (soloAttive) query = query.eq('attiva', true)

  const orParts = [`allenatore_id.eq.${allenatoreId}`]
  if (idsExtra.length > 0) orParts.push(`id.in.(${idsExtra.join(',')})`)

  const { data } = await query.or(orParts.join(','))
  return data ?? []
}

// ── Genere squadra ───────────────────────────────────────────────────────

export const GENERE_OPTIONS = [
  { value: 'maschile', label: 'Maschile' },
  { value: 'femminile', label: 'Femminile' },
]

// ── Stato quote mensili ───────────────────────────────────────────────────

export const STATI_QUOTA_GIOVANILE = {
  da_pagare: { label: 'Da pagare',  colore: '#ff9900', icona: '⏳' },
  pagata:    { label: 'Pagata',     colore: '#c8f000', icona: '✓' },
  in_ritardo:{ label: 'In ritardo', colore: '#ff4444', icona: '⚠️' },
  esonerata: { label: 'Esonerata',  colore: '#888888', icona: '—' },
} as const

export type StatoQuotaGiovanile = keyof typeof STATI_QUOTA_GIOVANILE

// ── Metodi di pagamento ───────────────────────────────────────────────────

export const METODI_PAGAMENTO = [
  { value: 'contanti',  label: '💵 Contanti' },
  { value: 'bonifico',  label: '🏦 Bonifico' },
  { value: 'stripe',    label: '💳 Carta (Stripe)' },
  { value: 'paypal',    label: '💙 PayPal' },
  { value: 'altro',     label: '📝 Altro' },
]

// ── Mesi competenza ───────────────────────────────────────────────────────

/**
 * Genera l'elenco dei mesi della stagione sportiva (sett-giugno)
 * a partire dall'anno di inizio stagione (es. 2026 per 2026-27)
 */
export function mesiStagione(annoInizio = 2026): { value: string; label: string }[] {
  const mesi = [
    { mese: 9,  anno: annoInizio,     label: 'Settembre' },
    { mese: 10, anno: annoInizio,     label: 'Ottobre' },
    { mese: 11, anno: annoInizio,     label: 'Novembre' },
    { mese: 12, anno: annoInizio,     label: 'Dicembre' },
    { mese: 1,  anno: annoInizio + 1, label: 'Gennaio' },
    { mese: 2,  anno: annoInizio + 1, label: 'Febbraio' },
    { mese: 3,  anno: annoInizio + 1, label: 'Marzo' },
    { mese: 4,  anno: annoInizio + 1, label: 'Aprile' },
    { mese: 5,  anno: annoInizio + 1, label: 'Maggio' },
    { mese: 6,  anno: annoInizio + 1, label: 'Giugno' },
  ]
  return mesi.map(m => ({
    value: `${m.anno}-${String(m.mese).padStart(2, '0')}-01`,
    label: `${m.label} ${m.anno}`,
  }))
}

/**
 * Formatta una data ISO come mese/anno in italiano
 */
export function formatMese(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
}

/**
 * Calcola se una quota è in ritardo:
 * considera in ritardo se mese_competenza è passato e non è pagata
 */
export function isQuotaInRitardo(mese_competenza: string, stato: string): boolean {
  if (stato === 'pagata' || stato === 'esonerata') return false
  const scadenza = new Date(mese_competenza)
  scadenza.setDate(10) // entro il 10 del mese
  return Date.now() > scadenza.getTime()
}

/**
 * Colore badge per la quota in base allo stato
 */
export function coloreQuota(stato: string): string {
  return STATI_QUOTA_GIOVANILE[stato as StatoQuotaGiovanile]?.colore ?? '#888'
}
