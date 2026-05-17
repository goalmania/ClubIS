import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

// Genera un codice fiscale placeholder ≤ 16 caratteri (limite VARCHAR(16))
// Formato: "XX" + ultimi 14 caratteri del timestamp → es. "XX46134567890123" (16 chars)
function cfPlaceholder(): string {
  return `XX${String(Date.now()).slice(-14)}`
}

// Normalizza un valore enum: lowercase + gestione alias italiani
function normEnum(val: string | null | undefined, fallback: string): string {
  if (!val) return fallback
  return val.toLowerCase().trim()
}

// Mappa categorie CSV libere → enum categoria_movimento PostgreSQL
// Valori validi: quote_iscrizione | sponsorizzazioni | proventi_gare |
//   stipendi | compensi_staff | trasferte | materiale_sportivo |
//   affitto_strutture | utenze | federazione | altro
const CATEGORIA_ALIAS: Record<string, string> = {
  'quote_associative':    'quote_iscrizione',
  'quote associative':    'quote_iscrizione',
  'quote':                'quote_iscrizione',
  'iscrizioni':           'quote_iscrizione',
  'sponsor':              'sponsorizzazioni',
  'sponsorizzazione':     'sponsorizzazioni',
  'sponsorizzazioni':     'sponsorizzazioni',
  'tornei':               'proventi_gare',
  'proventi_gare':        'proventi_gare',
  'proventi gare':        'proventi_gare',
  'biglietteria':         'proventi_gare',
  'donazioni':            'altro',
  'donazione':            'altro',
  'liberalita':           'altro',
  'stipendi':             'stipendi',
  'stipendio':            'stipendi',
  'compensi':             'compensi_staff',
  'compensi_staff':       'compensi_staff',
  'compenso':             'compensi_staff',
  'formazione':           'compensi_staff',
  'trasferte':            'trasferte',
  'trasferta':            'trasferte',
  'rimborso trasferta':   'trasferte',
  'materiale_sportivo':   'materiale_sportivo',
  'materiale sportivo':   'materiale_sportivo',
  'attrezzatura':         'materiale_sportivo',
  'attrezzatura sportiva':'materiale_sportivo',
  'divise':               'materiale_sportivo',
  'abbigliamento':        'materiale_sportivo',
  'materiale sanitario':  'materiale_sportivo',
  'medico':               'materiale_sportivo',
  'affitto_strutture':    'affitto_strutture',
  'affitto strutture':    'affitto_strutture',
  'affitto':              'affitto_strutture',
  'affitto impianti':     'affitto_strutture',
  'impianti':             'affitto_strutture',
  'utenze':               'utenze',
  'bollette':             'utenze',
  'elettricita':          'utenze',
  'federazione':          'federazione',
  'arbitraggi':           'federazione',
  'arbitraggio':          'federazione',
  'assicurazioni':        'federazione',
  'assicurazione':        'federazione',
  'comunicazioni':        'altro',
  'abbonamenti':          'altro',
  'altro':                'altro',
}

function normCategoria(val: string | null | undefined): string {
  if (!val) return 'altro'
  const k = val.toLowerCase().trim()
  return CATEGORIA_ALIAS[k] ?? 'altro'
}

// Mappa alias generici → valore enum ruolo_campo PostgreSQL
// Il CSV può contenere termini comuni come "Attaccante" o "Difensore";
// li traduciamo al valore enum più appropriato.
const RUOLO_ALIAS: Record<string, string> = {
  // attaccanti
  'attaccante':         'centravanti',
  'punta':              'centravanti',
  'centravanti':        'centravanti',
  'prima_punta':        'centravanti',
  'seconda_punta':      'seconda_punta',
  'trequartista':       'trequartista',
  'fantasista':         'trequartista',
  // ali
  'ala':                'ala',
  'ala_destra':         'ala',
  'ala_sinistra':       'ala',
  'esterno':            'ala',
  // centrocampisti
  'centrocampista':     'centrocampista',
  'mezzala':            'centrocampista',
  'mediano':            'centrocampista_difensivo',
  'centrocampista_difensivo': 'centrocampista_difensivo',
  'regista':            'centrocampista_difensivo',
  // difensori
  'difensore':          'difensore_centrale',
  'difensore_centrale': 'difensore_centrale',
  'terzino':            'terzino',
  'terzino_destro':     'terzino',
  'terzino_sinistro':   'terzino',
  'libero':             'difensore_centrale',
  'stopper':            'difensore_centrale',
  // portieri
  'portiere':           'portiere',
}

// Normalizza ruolo principale: traduce alias generici al valore enum DB
function normRuolo(val: string | null | undefined): string | null {
  if (!val) return null
  const k = val.toLowerCase().trim().replace(/\s+/g, '_')
  return RUOLO_ALIAS[k] ?? k   // fallback: lowercase as-is (sarà rifiutato dal DB se non valido)
}

export async function POST(req: Request, { params }: { params: { tipo: string } }) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const { righe, stagione = '2024-25', creaTestamento = true } = await req.json()
  const supabase = createAdminClient()
  const { clubId } = ctx

  const risultati = { importati: 0, saltati: 0, errori: [] as string[] }

  if (params.tipo === 'giocatori') {
    for (const r of righe) {
      try {
        // Controlla duplicato SOLO nel proprio club (club_id filter obbligatorio)
        let esistente = null
        if (r.codice_fiscale && !r.codice_fiscale.startsWith('IMP-') && !r.codice_fiscale.startsWith('XX')) {
          const { data } = await supabase
            .from('giocatori')
            .select('id')
            .eq('club_id', clubId)
            .eq('codice_fiscale', r.codice_fiscale)
            .maybeSingle()
          esistente = data
        }

        if (!esistente) {
          const { data: dup } = await supabase
            .from('giocatori')
            .select('id')
            .eq('club_id', clubId)
            .eq('cognome', r.cognome)
            .eq('nome', r.nome)
            .eq('data_nascita', r.data_nascita ?? '')
            .maybeSingle()
          esistente = dup
        }

        if (esistente) {
          risultati.saltati++
          continue
        }

        const { data: g, error: gErr } = await supabase
          .from('giocatori')
          .insert({
            club_id:           clubId,
            nome:              r.nome,
            cognome:           r.cognome,
            data_nascita:      r.data_nascita ?? null,
            luogo_nascita:     r.luogo_nascita ?? null,
            codice_fiscale:    r.codice_fiscale ?? cfPlaceholder(),
            ruolo_principale:  normRuolo(r.ruolo_principale),
            piede:             normEnum(r.piede, 'destro'),
            altezza_cm:        r.altezza_cm ?? null,
            peso_kg:           r.peso_kg ?? null,
            email_contatto:    r.email_contatto ?? null,
            telefono_contatto: r.telefono_contatto ?? null,
            nazionalita_tipo:  normEnum(r.nazionalita_tipo, 'italiano'),
            nazionalita_paese: 'Italia',
            iban:              r.iban ?? null,
            codice_fiscale_figc: r.codice_fiscale_figc ?? null,
            consenso_gdpr:     false,
          })
          .select('id')
          .single()

        if (gErr) throw new Error(gErr.message)

        if (g && creaTestamento) {
          await supabase.from('tesseramenti').insert({
            giocatore_id: g.id,
            club_id: clubId,
            stagione,
            tipo: 'definitivo',
            data_inizio: new Date().toISOString().split('T')[0],
            numero_maglia: r.numero_maglia ?? null,
            stato: 'attivo',
          })
        }

        risultati.importati++
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        risultati.errori.push(`${r.cognome} ${r.nome}: ${msg}`)
      }
    }
  }

  if (params.tipo === 'movimenti') {
    // Inserimento riga per riga per avere errori granulari invece di un
    // errore bulk che azzera tutto il batch
    for (const r of righe as Record<string, unknown>[]) {
      try {
        const tipo = String(r.tipo ?? '').toLowerCase().trim()
        const { error } = await supabase.from('prima_nota').insert({
          club_id:     clubId,
          tipo:        tipo === 'entrata' ? 'entrata' : 'uscita',
          categoria:   normCategoria(String(r.categoria ?? '')),
          importo:     Number(r.importo),
          data:        r.data,
          descrizione: String(r.descrizione ?? ''),
          controparte: r.controparte ? String(r.controparte) : null,
          // 'note' non esiste in prima_nota — il contenuto della colonna note
          // del CSV viene accodato alla descrizione se presente
          ...(r.note ? { descrizione: `${String(r.descrizione ?? '')} — ${String(r.note)}`.slice(0, 255) } : {}),
        })
        if (error) throw new Error(error.message)
        risultati.importati++
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        risultati.errori.push(`Riga ${r.data} ${r.descrizione}: ${msg}`)
      }
    }
  }

  if (params.tipo === 'famiglie') {
    // Schema reale di `famiglie`:
    //   giocatore_id UUID NOT NULL  ← il bambino (chiave di relazione)
    //   cognome, nome               ← del genitore
    //   relazione, email, telefono
    // Flusso corretto: 1) crea/trova il giocatore bambino  2) crea il record famiglia
    for (const r of righe) {
      try {
        // ── 1. Crea o trova il giocatore (bambino) ─────────────────────────
        let giocatoreId: string

        const { data: bimboEsistente } = await supabase
          .from('giocatori')
          .select('id')
          .eq('club_id', clubId)
          .eq('cognome', r.giocatore_cognome)
          .eq('nome',    r.giocatore_nome)
          .maybeSingle()

        if (bimboEsistente) {
          giocatoreId = bimboEsistente.id
        } else {
          const { data: g, error: gErr } = await supabase
            .from('giocatori')
            .insert({
              club_id:          clubId,
              nome:             r.giocatore_nome,
              cognome:          r.giocatore_cognome,
              data_nascita:     r.giocatore_data_nascita ?? null,
              codice_fiscale:   r.giocatore_cf ?? cfPlaceholder(),
              piede:            'destro',
              nazionalita_tipo: 'italiano',
              nazionalita_paese:'Italia',
              consenso_gdpr:    false,
            })
            .select('id')
            .single()
          if (gErr || !g) throw new Error(gErr?.message ?? 'Errore creazione giocatore')
          giocatoreId = g.id

          // Tesseramento automatico
          await supabase.from('tesseramenti').insert({
            giocatore_id: giocatoreId,
            club_id:      clubId,
            stagione,
            tipo:         'definitivo',
            data_inizio:  new Date().toISOString().split('T')[0],
            stato:        'attivo',
          })
        }

        // ── 2. Controlla se il genitore esiste già per questo giocatore ────
        const { data: famEsistente } = await supabase
          .from('famiglie')
          .select('id')
          .eq('giocatore_id', giocatoreId)
          .eq('cognome',      r.cognome)
          .eq('nome',         r.nome)
          .maybeSingle()

        if (famEsistente) {
          risultati.saltati++
          continue
        }

        // ── 3. Inserisce il record famiglia collegato al giocatore ─────────
        const { error: famErr } = await supabase
          .from('famiglie')
          .insert({
            giocatore_id: giocatoreId,
            cognome:      r.cognome,
            nome:         r.nome,
            relazione:    String(r.relazione ?? 'genitore').toLowerCase(),
            email:        r.email    ?? null,
            telefono:     r.telefono ?? null,
          })
        if (famErr) throw new Error(famErr.message)

        risultati.importati++
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        risultati.errori.push(`${r.cognome} ${r.nome}: ${msg}`)
      }
    }
  }

  return Response.json(risultati)
}
