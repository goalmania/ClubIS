import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { matchSearch } from '@/lib/search'

// ── Registro completo di tutte le pagine CIS ────────────────────────────────
// Ogni voce: label, sottotitolo, path, ruoli che possono vederla, parole chiave
// Le keywords sono sinonimi italiani per trovare la pagina anche senza sapere
// il nome esatto (es. "squalifiche" trova "Monitor Squalifiche")
const PAGINE_CIS = [
  // PRESIDENTE
  { label: 'Panoramica', sub: 'Presidente', path: '/dashboard/presidente', ruoli: ['presidente'], kw: 'home dashboard riepilogo' },
  { label: 'Info Club', sub: 'Club', path: '/dashboard/presidente/club', ruoli: ['presidente'], kw: 'dati società info anagrafica club' },
  { label: 'Organigramma', sub: 'Club', path: '/dashboard/presidente/organigramma', ruoli: ['presidente'], kw: 'struttura dirigenti organizzazione gerarchia' },
  { label: 'Staff', sub: 'Club', path: '/dashboard/presidente/staff', ruoli: ['presidente'], kw: 'collaboratori staff personale dipendenti' },
  { label: 'Inviti Staff', sub: 'Club', path: '/dashboard/presidente/inviti', ruoli: ['presidente'], kw: 'invita aggiungi utenti link' },
  { label: 'Sponsor', sub: 'Finanze', path: '/dashboard/presidente/sponsor', ruoli: ['presidente'], kw: 'sponsor partner aziende pubblicità finanziatori' },
  { label: 'Compliance Campionato', sub: 'Sport', path: '/dashboard/presidente/compliance-campionato', ruoli: ['presidente'], kw: 'compliance regole campionato adempimenti federazione' },
  { label: 'Disponibilità Rosa', sub: 'Sport', path: '/dashboard/presidente/disponibilita', ruoli: ['presidente'], kw: 'disponibilità rosa giocatori convocabili' },
  { label: 'Risultati', sub: 'Sport', path: '/dashboard/presidente/risultati', ruoli: ['presidente'], kw: 'risultati partite gare classifica' },
  { label: 'Obiettivi', sub: 'Sport', path: '/dashboard/presidente/obiettivi', ruoli: ['presidente'], kw: 'obiettivi stagione target goal traguardi' },
  { label: 'Report Mensile', sub: 'Sport', path: '/dashboard/presidente/report', ruoli: ['presidente'], kw: 'report mensile analisi andamento riepilogo' },
  { label: 'Entrate & Uscite', sub: 'Finanze', path: '/dashboard/presidente/finanze', ruoli: ['presidente'], kw: 'finanze entrate uscite bilancio costi ricavi' },
  { label: 'FFP / Budget', sub: 'Finanze', path: '/dashboard/presidente/ffp', ruoli: ['presidente'], kw: 'ffp fair play finanziario budget pianificazione' },
  { label: 'Impianti', sub: 'Sport', path: '/dashboard/presidente/impianti', ruoli: ['presidente', 'ds', 'segretario', 'team_manager', 'custode'], kw: 'impianti strutture campo allenamento stadio infrastrutture' },
  { label: 'Comunicazioni', sub: 'Comunicazioni', path: '/dashboard/presidente/comunicazioni', ruoli: ['presidente'], kw: 'comunicazioni messaggi annunci bacheca' },

  // DS
  { label: 'Panoramica DS', sub: 'Direttore Sportivo', path: '/dashboard/ds', ruoli: ['ds'], kw: 'home dashboard direttore sportivo' },
  { label: 'Gestione Rosa', sub: 'Rosa', path: '/dashboard/ds/rosa', ruoli: ['ds'], kw: 'rosa giocatori squadra mercato ingaggi' },
  { label: 'Contratti', sub: 'Rosa', path: '/dashboard/ds/contratti', ruoli: ['ds'], kw: 'contratti ingaggi scadenze accordi stipendi' },
  { label: 'Scadenze Contratti', sub: 'Rosa', path: '/dashboard/ds/scadenze', ruoli: ['ds'], kw: 'scadenze contratti rinnovi calciatori rosa' },
  { label: 'Mercato', sub: 'Rosa', path: '/dashboard/ds/mercato', ruoli: ['ds'], kw: 'mercato trasferimenti acquisti cessioni trattative' },
  { label: 'Disponibilità DS', sub: 'Gare', path: '/dashboard/ds/disponibilita', ruoli: ['ds'], kw: 'disponibilità rosa convocabili infortunati squalificati' },
  { label: 'Partite & Risultati DS', sub: 'Gare', path: '/dashboard/ds/partite', ruoli: ['ds'], kw: 'partite risultati calendario gare campionato' },
  { label: 'Report Scouting DS', sub: 'Scouting', path: '/dashboard/ds/scouting', ruoli: ['ds'], kw: 'scouting report osservatori giocatori esterni talenti' },
  { label: 'Database Giocatori', sub: 'Scouting', path: '/dashboard/ds/database', ruoli: ['ds'], kw: 'database giocatori profili anagrafica archivio' },
  { label: 'Statistiche DS', sub: 'Analisi', path: '/dashboard/ds/statistiche', ruoli: ['ds'], kw: 'statistiche dati analisi performance indicatori' },

  // SEGRETARIO
  { label: 'Panoramica Segreteria', sub: 'Segretario', path: '/dashboard/segretario', ruoli: ['segretario'], kw: 'home dashboard segreteria riepilogo' },
  { label: 'Giocatori', sub: 'Anagrafica', path: '/dashboard/segretario/giocatori', ruoli: ['segretario'], kw: 'giocatori calciatori atleti anagrafica rosa' },
  { label: 'Gruppi / Squadre', sub: 'Anagrafica', path: '/dashboard/segretario/gruppi', ruoli: ['segretario'], kw: 'gruppi squadre settore giovanile categorie' },
  { label: 'Tesseramenti', sub: 'Anagrafica', path: '/dashboard/segretario/tesseramenti', ruoli: ['segretario'], kw: 'tesseramenti federazione figc tessere registrazioni' },
  { label: 'Certificati Medici', sub: 'Anagrafica', path: '/dashboard/segretario/certificati', ruoli: ['segretario'], kw: 'certificati medici idoneità visite mediche scadenza' },
  { label: 'Disponibilità Rosa Seg.', sub: 'Gare', path: '/dashboard/segretario/disponibilita', ruoli: ['segretario'], kw: 'disponibilità rosa convocazioni' },
  { label: 'Partite', sub: 'Gare', path: '/dashboard/segretario/partite', ruoli: ['segretario'], kw: 'partite calendario gare campionato risultati' },
  { label: 'Distinte Gara', sub: 'Gare', path: '/dashboard/segretario/distinte', ruoli: ['segretario'], kw: 'distinte gara formazione convocati allineamento' },
  { label: 'Accrediti', sub: 'Gare', path: '/dashboard/segretario/accrediti', ruoli: ['segretario', 'team_manager', 'ufficio_stampa', 'presidente'], kw: 'accrediti stampa giornalisti biglietti ospiti' },
  { label: 'Scadenze FIGC', sub: 'FIGC', path: '/dashboard/segretario/scadenze-figc', ruoli: ['segretario'], kw: 'scadenze figc adempimenti federazione deadline obblighi' },
  { label: 'Pratiche Tesseramento', sub: 'FIGC', path: '/dashboard/segretario/pratiche-tesseramento', ruoli: ['segretario'], kw: 'pratiche tesseramento figc affiliazioni trasferimenti' },
  { label: 'Import Calendario FIGC', sub: 'FIGC', path: '/dashboard/segretario/figc/calendario', ruoli: ['segretario'], kw: 'import calendario figc csv partite campionato' },
  { label: 'Rosa FIGC', sub: 'FIGC', path: '/dashboard/segretario/figc/rosa', ruoli: ['segretario', 'team_manager'], kw: 'rosa figc lista giocatori federazione' },
  { label: 'Moduli FIGC', sub: 'FIGC', path: '/dashboard/segretario/figc/moduli', ruoli: ['segretario', 'team_manager'], kw: 'moduli figc documenti federazione compilare' },
  { label: 'Comunicati FIGC', sub: 'FIGC', path: '/dashboard/segretario/figc/comunicati', ruoli: ['segretario'], kw: 'comunicati figc federazione provvedimenti notizie' },
  { label: 'Monitor Squalifiche', sub: 'FIGC', path: '/dashboard/segretario/figc/squalifiche', ruoli: ['segretario'], kw: 'squalifiche ammonizioni diffide cartellini giocatori' },
  { label: 'Portafoglio FIGC', sub: 'FIGC', path: '/dashboard/segretario/figc/portafoglio', ruoli: ['segretario'], kw: 'portafoglio figc crediti tasse ammende pagamento' },
  { label: 'Pagamenti', sub: 'Finanze', path: '/dashboard/segretario/pagamenti', ruoli: ['segretario', 'presidente', 'team_manager'], kw: 'pagamenti rate quote mensili famiglie' },
  { label: 'Rimborsi SEPA', sub: 'Finanze', path: '/dashboard/segretario/rimborsi', ruoli: ['segretario'], kw: 'rimborsi sepa bonifico bancario addebito diretto' },
  { label: 'Quote Iscrizione', sub: 'Finanze', path: '/dashboard/segretario/quote', ruoli: ['segretario'], kw: 'quote iscrizione rette mensili pagamento famiglie' },
  { label: 'Prima Nota', sub: 'Finanze', path: '/dashboard/segretario/prima-nota', ruoli: ['segretario'], kw: 'prima nota contabilità entrate uscite registro cassa' },
  { label: 'Fornitori & Clienti', sub: 'Finanze', path: '/dashboard/segretario/fornitori', ruoli: ['segretario'], kw: 'fornitori clienti fatture acquisti servizi' },
  { label: 'Quietanze', sub: 'Finanze', path: '/dashboard/segretario/quietanze', ruoli: ['segretario'], kw: 'quietanze iscrizione campionato ricevute' },
  { label: 'Registro IVA', sub: 'Finanze', path: '/dashboard/segretario/registro-iva', ruoli: ['segretario'], kw: 'registro iva fatture acquisti vendite iva' },
  { label: 'Rendiconto', sub: 'Finanze', path: '/dashboard/segretario/pagamenti/rendiconto', ruoli: ['segretario', 'presidente'], kw: 'rendiconto bilancio riepilogo economico finanziario' },
  { label: 'Config. Finanziaria', sub: 'Finanze', path: '/dashboard/segretario/configurazione-finanziaria', ruoli: ['segretario'], kw: 'configurazione finanziaria impostazioni tariffe' },
  { label: 'Sconti', sub: 'Finanze', path: '/dashboard/segretario/sconti', ruoli: ['segretario'], kw: 'sconti agevolazioni borse studio riduzioni quote' },
  { label: 'Settore Giovanile', sub: 'Gestione', path: '/dashboard/segretario/settore-giovanile', ruoli: ['segretario'], kw: 'settore giovanile squadre categorie under leve' },
  { label: 'Iscrizioni Online', sub: 'Gestione', path: '/dashboard/segretario/iscrizioni', ruoli: ['segretario'], kw: 'iscrizioni online form registrazione nuovi giocatori' },
  { label: 'Compensi', sub: 'Gestione', path: '/dashboard/segretario/compensi', ruoli: ['segretario'], kw: 'compensi staff allenatori rimborsi pagamento' },
  { label: 'Documenti', sub: 'Gestione', path: '/dashboard/segretario/documenti', ruoli: ['segretario'], kw: 'documenti moduli pdf contratti lettere' },
  { label: 'Compliance', sub: 'Gestione', path: '/dashboard/segretario/compliance', ruoli: ['segretario'], kw: 'compliance adempimenti regole normativa obblighi' },
  { label: 'Archivio', sub: 'Gestione', path: '/dashboard/segretario/archivio', ruoli: ['segretario'], kw: 'archivio vecchi documenti storico stagioni passate' },
  { label: 'Import Dati', sub: 'Gestione', path: '/dashboard/segretario/import', ruoli: ['segretario'], kw: 'import importa dati csv carica excel' },

  // ALLENATORE
  { label: 'Panoramica Allenatore', sub: 'Allenatore', path: '/dashboard/allenatore', ruoli: ['allenatore'], kw: 'home dashboard coach mister' },
  { label: 'Rosa Squadra', sub: 'Squadra', path: '/dashboard/allenatore/rosa', ruoli: ['allenatore'], kw: 'rosa squadra giocatori calciatori atleti' },
  { label: 'Disponibilità Allenatore', sub: 'Squadra', path: '/dashboard/allenatore/disponibilita', ruoli: ['allenatore'], kw: 'disponibilità convocabili infortuni squalifiche' },
  { label: 'Allenamenti', sub: 'Squadra', path: '/dashboard/allenatore/allenamenti', ruoli: ['allenatore'], kw: 'allenamenti sessioni training programma settimana' },
  { label: 'Presenze Allenamenti', sub: 'Squadra', path: '/dashboard/allenatore/presenze', ruoli: ['allenatore'], kw: 'presenze allenamenti assenze registro' },
  { label: 'Indisponibili', sub: 'Squadra', path: '/dashboard/allenatore/indisponibili', ruoli: ['allenatore'], kw: 'indisponibili infortuni squalifiche fermati assenti' },
  { label: 'Partite Allenatore', sub: 'Gare', path: '/dashboard/allenatore/partite', ruoli: ['allenatore'], kw: 'partite gare campionato calendario risultati' },
  { label: 'Convocazioni', sub: 'Gare', path: '/dashboard/allenatore/convocazioni', ruoli: ['allenatore'], kw: 'convocazioni lista convocati distinta gara' },
  { label: 'Statistiche Allenatore', sub: 'Gare', path: '/dashboard/allenatore/statistiche', ruoli: ['allenatore'], kw: 'statistiche gol assist reti performance dati' },
  { label: 'Analisi Partita', sub: 'Gare', path: '/dashboard/allenatore/analisi-partita', ruoli: ['allenatore'], kw: 'analisi partita video tattica schemi prestazione' },
  { label: 'Valutazioni', sub: 'Sviluppo', path: '/dashboard/allenatore/valutazioni', ruoli: ['allenatore'], kw: 'valutazioni giocatori voti giudizi performance crescita' },
  { label: 'Tattica', sub: 'Sviluppo', path: '/dashboard/allenatore/tattica', ruoli: ['allenatore'], kw: 'tattica schemi modulo formazione campo posizioni' },
  { label: 'Programmazione', sub: 'Sviluppo', path: '/dashboard/allenatore/programmazione', ruoli: ['allenatore'], kw: 'programmazione allenamenti settimana microciclo piano' },

  // OSSERVATORE
  { label: 'Panoramica Scouting', sub: 'Osservatore', path: '/dashboard/osservatore', ruoli: ['osservatore'], kw: 'home dashboard osservatore scout' },
  { label: 'Nuovo Report Scouting', sub: 'Scouting', path: '/dashboard/osservatore/nuovo-report', ruoli: ['osservatore'], kw: 'nuovo report scouting osservazione crea aggiungi' },
  { label: 'I Miei Report', sub: 'Scouting', path: '/dashboard/osservatore/report', ruoli: ['osservatore'], kw: 'report scouting osservazioni lista' },
  { label: 'Giocatori Seguiti', sub: 'Scouting', path: '/dashboard/osservatore/giocatori', ruoli: ['osservatore'], kw: 'giocatori seguiti profili osservati schede' },
  { label: 'Mappa Osservazioni', sub: 'Scouting', path: '/dashboard/osservatore/mappa', ruoli: ['osservatore'], kw: 'mappa regioni italia giocatori distribuzione geografica' },
  { label: 'Confronto Giocatori', sub: 'Scouting', path: '/dashboard/osservatore/confronto', ruoli: ['osservatore'], kw: 'confronto paragone giocatori statistiche voti' },
  { label: 'Statistiche Scouting', sub: 'Scouting', path: '/dashboard/osservatore/statistiche', ruoli: ['osservatore'], kw: 'statistiche report dati analisi osservazioni' },

  // MEDICO
  { label: 'Panoramica Medico', sub: 'Medico', path: '/dashboard/medico', ruoli: ['medico'], kw: 'home dashboard medico sanitario staff medico' },
  { label: 'Cartelle Mediche', sub: 'Clinica', path: '/dashboard/medico/cartelle', ruoli: ['medico'], kw: 'cartelle mediche clinica pazienti giocatori schede sanitarie' },
  { label: 'Infortuni', sub: 'Clinica', path: '/dashboard/medico/infortuni', ruoli: ['medico'], kw: 'infortuni lesioni traumi muscolare osseo recupero' },
  { label: 'Visite Mediche', sub: 'Clinica', path: '/dashboard/medico/visite', ruoli: ['medico'], kw: 'visite mediche idoneità controlli appuntamenti' },
  { label: 'Certificati Medici', sub: 'Clinica', path: '/dashboard/medico/certificati', ruoli: ['medico'], kw: 'certificati idoneità sportiva medica scadenza' },
  { label: 'Prevenzione', sub: 'Prevenzione', path: '/dashboard/medico/prevenzione', ruoli: ['medico'], kw: 'prevenzione infortuni fisioterapia riscaldamento protocolli' },
  { label: 'Giocatori Medico', sub: 'Prevenzione', path: '/dashboard/medico/giocatori', ruoli: ['medico'], kw: 'giocatori profilo medico storico clinico condizione' },

  // TEAM MANAGER
  { label: 'Panoramica TM', sub: 'Team Manager', path: '/dashboard/team-manager', ruoli: ['team_manager'], kw: 'home dashboard team manager logistica' },
  { label: 'Calendario TM', sub: 'Logistica', path: '/dashboard/team-manager/calendario', ruoli: ['team_manager'], kw: 'calendario partite gare appuntamenti programma' },
  { label: 'Trasferte', sub: 'Logistica', path: '/dashboard/team-manager/trasferte', ruoli: ['team_manager'], kw: 'trasferte spostamenti viaggio bus pullman hotel albergo' },
  { label: 'Materiale', sub: 'Logistica', path: '/dashboard/team-manager/materiale', ruoli: ['team_manager'], kw: 'materiale magazzino kit divise palloni attrezzatura' },
  { label: 'Distinte TM', sub: 'Squadra', path: '/dashboard/team-manager/distinte', ruoli: ['team_manager'], kw: 'distinte gara formazione convocati' },
  { label: 'Presenze TM', sub: 'Squadra', path: '/dashboard/team-manager/presenze', ruoli: ['team_manager'], kw: 'presenze allenamenti partite registro' },
  { label: 'Comunicazioni TM', sub: 'Squadra', path: '/dashboard/team-manager/comunicazioni', ruoli: ['team_manager'], kw: 'comunicazioni messaggi bacheca annunci' },

  // GIOCATORE
  { label: 'Il Mio Profilo', sub: 'Giocatore', path: '/dashboard/giocatore', ruoli: ['giocatore'], kw: 'profilo personale dati mio account' },
  { label: 'I Miei Allenamenti', sub: 'Sport', path: '/dashboard/giocatore/allenamenti', ruoli: ['giocatore'], kw: 'allenamenti sessioni programma training' },
  { label: 'Le Mie Convocazioni', sub: 'Sport', path: '/dashboard/giocatore/convocazioni', ruoli: ['giocatore'], kw: 'convocazioni lista convocato partite gare' },
  { label: 'Le Mie Partite', sub: 'Sport', path: '/dashboard/giocatore/partite', ruoli: ['giocatore'], kw: 'partite gare risultati campionato' },
  { label: 'Le Mie Statistiche', sub: 'Sport', path: '/dashboard/giocatore/statistiche', ruoli: ['giocatore'], kw: 'statistiche gol assist minuti prestazioni' },
  { label: 'Le Mie Valutazioni', sub: 'Sviluppo', path: '/dashboard/giocatore/valutazioni', ruoli: ['giocatore'], kw: 'valutazioni voti giudizi feedback allenatore' },
  { label: 'Le Mie Quote', sub: 'Pagamenti', path: '/dashboard/giocatore/pagamenti', ruoli: ['giocatore'], kw: 'quote pagamenti rate mensili saldo dovuto' },

  // MEDICO / CUSTODE / UFFICIO STAMPA
  { label: 'Checklist Impianti', sub: 'Custode', path: '/dashboard/custode/impianti', ruoli: ['custode'], kw: 'impianti checklist manutenzione controllo problemi' },
  { label: 'Calendario Media', sub: 'Ufficio Stampa', path: '/dashboard/ufficio-stampa/calendario-media', ruoli: ['ufficio_stampa'], kw: 'media giornalisti conferenza stampa eventi comunicazione' },
  { label: 'Interviste & TV', sub: 'Ufficio Stampa', path: '/dashboard/ufficio-stampa/interviste', ruoli: ['ufficio_stampa'], kw: 'interviste televisione tv radio giornalisti dichiarazioni' },
  { label: 'Brief Locandine', sub: 'Ufficio Stampa', path: '/dashboard/ufficio-stampa/locandine', ruoli: ['ufficio_stampa'], kw: 'locandine grafiche poster social media immagini' },
  { label: 'Template Articoli', sub: 'Ufficio Stampa', path: '/dashboard/ufficio-stampa/articoli', ruoli: ['ufficio_stampa'], kw: 'articoli comunicati stampa notizie testi' },

  // PAGINE COMUNI
  { label: 'Stadio', sub: 'Impianti', path: '/dashboard/stadio', ruoli: ['presidente','segretario','allenatore','ds','team_manager','ufficio_stampa'], kw: 'stadio impianto campo partite accesso ingressi' },
  { label: 'Config. Notifiche', sub: 'Impostazioni', path: '/dashboard/notifiche/impostazioni', ruoli: ['presidente','ds','segretario','allenatore','osservatore','medico','famiglia','team_manager','giocatore','custode','ufficio_stampa'], kw: 'notifiche impostazioni avvisi email push configurazione' },
]

// ── Helper: icone per categoria ────────────────────────────────────────────
const ICONE: Record<string, string> = {
  pagina:   '→',
  giocatore: '⚽',
  staff:    '👤',
  partita:  '🏟',
  trasferta:'🚌',
  contratto:'📋',
  infortunio:'🏥',
  report:   '🔍',
  sponsor:  '💼',
}

export async function GET(req: Request) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ risultati: [] })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  const supabase = createAdminClient()
  const { clubId, ruolo } = ctx

  // Con query vuota restituiamo solo pagine rapide (prime 8)
  if (q.length < 2) {
    const pagineRapide = PAGINE_CIS
      .filter(p => p.ruoli.includes(ruolo))
      .slice(0, 8)
      .map(p => ({ tipo: 'pagina', id: p.path, label: p.label, sublabel: p.sub, path: p.path, icon: '→', categoria: 'Accesso rapido' }))
    return Response.json({ risultati: pagineRapide })
  }

  const primoToken = q.split(' ')[0]
  const pattern = `%${primoToken}%`

  // ── Query DB in parallelo ──────────────────────────────────────────────────
  const [
    tesseramentiRes,
    utentiRes,
    partiteRes,
    trasfertRes,
    contratti_,
    infortuni_,
    reportRes,
    sponsorRes,
  ] = await Promise.all([
    // Giocatori via tesseramenti attivi
    supabase
      .from('tesseramenti')
      .select('giocatori(id, nome, cognome, ruolo_principale)')
      .eq('club_id', clubId)
      .eq('stato', 'attivo')
      .limit(8),

    // Staff / utenti
    supabase
      .from('utenti')
      .select('id, nome, cognome, ruolo')
      .eq('club_id', clubId)
      .or(`cognome.ilike.${pattern},nome.ilike.${pattern}`)
      .limit(5),

    // Partite — via squadre.club_id per evitare il bug della query diretta
    supabase
      .from('partite')
      .select('id, avversario, data_ora, stato, squadre!inner(club_id)')
      .eq('squadre.club_id', clubId)
      .ilike('avversario', pattern)
      .order('data_ora', { ascending: false })
      .limit(4),

    // Trasferte
    supabase
      .from('trasferte')
      .select('id, destinazione, data_partenza, stato')
      .eq('club_id', clubId)
      .ilike('destinazione', pattern)
      .limit(4),

    // Contratti
    supabase
      .from('contratti')
      .select('id, giocatori(id, nome, cognome), tipo, data_scadenza')
      .eq('club_id', clubId)
      .limit(8),

    // Infortuni
    supabase
      .from('infortuni')
      .select('id, tipo, gravita, giocatori(id, nome, cognome, ruolo_principale)')
      .eq('club_id', clubId)
      .limit(8),

    // Report scouting
    supabase
      .from('report_scouting')
      .select('id, nome_giocatore_ext, club_attuale_ext, voto_globale, data_osservazione')
      .eq('club_richiedente_id', clubId)
      .ilike('nome_giocatore_ext', pattern)
      .order('data_osservazione', { ascending: false })
      .limit(4),

    // Sponsor
    supabase
      .from('sponsors')
      .select('id, nome, tipo')
      .eq('club_id', clubId)
      .ilike('nome', pattern)
      .limit(3),
  ])

  type Risultato = {
    tipo: string; id: string; label: string; sublabel: string
    path: string; icon: string; categoria: string
  }
  const out: Risultato[] = []

  // ── 1. Pagine ──────────────────────────────────────────────────────────────
  const pagineMatch = PAGINE_CIS.filter(p =>
    p.ruoli.includes(ruolo) && matchSearch(q, p.label, p.sub, p.kw)
  ).slice(0, 6)

  out.push(...pagineMatch.map(p => ({
    tipo: 'pagina', id: p.path, label: p.label, sublabel: p.sub,
    path: p.path, icon: ICONE.pagina, categoria: 'Pagine',
  })))

  // ── 2. Giocatori ──────────────────────────────────────────────────────────
  const giocatori = (tesseramentiRes.data ?? []).flatMap((t: any) => {
    const g = t.giocatori
    if (!g || !matchSearch(q, g.nome, g.cognome, g.ruolo_principale)) return []
    return [g]
  }).slice(0, 5)

  out.push(...giocatori.map((g: any) => ({
    tipo: 'giocatore', id: g.id,
    label: `${g.cognome} ${g.nome}`,
    sublabel: g.ruolo_principale?.replace(/_/g, ' ') ?? 'Giocatore',
    path: `/dashboard/${ruolo === 'segretario' ? 'segretario' : ruolo === 'allenatore' ? 'allenatore' : ruolo === 'medico' ? 'medico' : 'segretario'}/giocatori/${g.id}`,
    icon: ICONE.giocatore, categoria: 'Giocatori',
  })))

  // ── 3. Staff ───────────────────────────────────────────────────────────────
  const staff = (utentiRes.data ?? []).filter((u: any) => matchSearch(q, u.nome, u.cognome, u.ruolo))
  out.push(...staff.map((u: any) => ({
    tipo: 'staff', id: u.id,
    label: `${u.cognome} ${u.nome}`,
    sublabel: u.ruolo?.replace(/_/g, ' ') ?? 'Staff',
    path: `/dashboard/presidente/staff`,
    icon: ICONE.staff, categoria: 'Staff',
  })))

  // ── 4. Partite ─────────────────────────────────────────────────────────────
  const partite = (partiteRes.data ?? []).filter((p: any) => matchSearch(q, p.avversario))
  out.push(...partite.map((p: any) => ({
    tipo: 'partita', id: p.id,
    label: `vs ${p.avversario}`,
    sublabel: p.data_ora ? new Date(p.data_ora).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
    path: `/dashboard/${ruolo}/partite`,
    icon: ICONE.partita, categoria: 'Partite',
  })))

  // ── 5. Trasferte ────────────────────────────────────────────────────────────
  const trasferte = (trasfertRes.data ?? []).filter((t: any) => matchSearch(q, t.destinazione))
  out.push(...trasferte.map((t: any) => ({
    tipo: 'trasferta', id: t.id,
    label: t.destinazione ?? 'Trasferta',
    sublabel: t.data_partenza ? new Date(t.data_partenza).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
    path: '/dashboard/team-manager/trasferte',
    icon: ICONE.trasferta, categoria: 'Trasferte',
  })))

  // ── 6. Contratti ────────────────────────────────────────────────────────────
  const contratti = (contratti_.data ?? []).filter((c: any) => {
    const g = c.giocatori
    return g && matchSearch(q, g.nome, g.cognome, c.tipo)
  }).slice(0, 3)
  out.push(...contratti.map((c: any) => ({
    tipo: 'contratto', id: c.id,
    label: `${c.giocatori?.cognome} ${c.giocatori?.nome}`,
    sublabel: `Contratto · scad. ${c.data_scadenza ? new Date(c.data_scadenza).toLocaleDateString('it-IT', { month: 'short', year: 'numeric' }) : '—'}`,
    path: '/dashboard/ds/contratti',
    icon: ICONE.contratto, categoria: 'Contratti',
  })))

  // ── 7. Infortuni ────────────────────────────────────────────────────────────
  const infortuni = (infortuni_.data ?? []).filter((i: any) => {
    const g = i.giocatori
    return g && matchSearch(q, g.nome, g.cognome, i.tipo)
  }).slice(0, 3)
  out.push(...infortuni.map((i: any) => ({
    tipo: 'infortunio', id: i.id,
    label: `${i.giocatori?.cognome} ${i.giocatori?.nome}`,
    sublabel: `${i.tipo ?? 'Infortunio'} · ${i.gravita ?? ''}`,
    path: '/dashboard/medico/infortuni',
    icon: ICONE.infortunio, categoria: 'Infortuni',
  })))

  // ── 8. Report Scouting ──────────────────────────────────────────────────────
  const reportScouting = (reportRes.data ?? [])
  out.push(...reportScouting.map((r: any) => ({
    tipo: 'report', id: r.id,
    label: r.nome_giocatore_ext ?? 'Giocatore',
    sublabel: `${r.club_attuale_ext ?? ''} · voto ${r.voto_globale ?? '—'}`,
    path: `/dashboard/osservatore/giocatori/${r.id}`,
    icon: ICONE.report, categoria: 'Report Scouting',
  })))

  // ── 9. Sponsor ──────────────────────────────────────────────────────────────
  out.push(...(sponsorRes.data ?? []).map((s: any) => ({
    tipo: 'sponsor', id: s.id,
    label: s.nome,
    sublabel: s.tipo ?? 'Sponsor',
    path: '/dashboard/presidente/sponsor',
    icon: ICONE.sponsor, categoria: 'Sponsor',
  })))

  return Response.json({ risultati: out })
}
