// src/app/api/gruppi/auto-assign/route.ts
// Crea i gruppi default FIGC e assegna ogni giocatore/utente in base all'età.
// Gira lato server → nessun problema di RLS o JWT client.

import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

const CATEGORIE_FIGC = [
  { nome: 'Prima Squadra', colore: '#c8f000', tipo: 'squadra',   etaMin: 19, etaMax: -1,  descrizione: 'Seniores dai 19 anni in su',                                    categoriaEta: 'prima_squadra' },
  { nome: 'Primavera',     colore: '#00e5b8', tipo: 'squadra',   etaMin: 18, etaMax: 20,  descrizione: 'Misto 18-19-20 anni — aggiungere manualmente i doppi tesserati', categoriaEta: 'primavera'     },
  { nome: 'Under 19',      colore: '#388bfd', tipo: 'squadra',   etaMin: 16, etaMax: 18,  descrizione: 'Juniores FIGC — nati 16-18 anni fa',                            categoriaEta: 'u19'          },
  { nome: 'Under 17',      colore: '#ff9900', tipo: 'squadra',   etaMin: 15, etaMax: 16,  descrizione: 'Allievi FIGC — nati 15-16 anni fa',                             categoriaEta: 'u17'          },
  { nome: 'Under 15',      colore: '#aa88ff', tipo: 'squadra',   etaMin: 13, etaMax: 14,  descrizione: 'Giovanissimi FIGC — nati 13-14 anni fa',                        categoriaEta: 'u15'          },
  { nome: 'Under 13',      colore: '#ff6699', tipo: 'squadra',   etaMin: 11, etaMax: 12,  descrizione: 'Giovanissimi C FIGC — nati 11-12 anni fa',                      categoriaEta: 'u12'          },
  { nome: 'Esordienti',    colore: '#ff4444', tipo: 'squadra',   etaMin: 9,  etaMax: 10,  descrizione: 'Under 11 — nati 9-10 anni fa',                                  categoriaEta: 'u10'          },
  { nome: 'Pulcini',       colore: '#ff7722', tipo: 'squadra',   etaMin: 7,  etaMax: 8,   descrizione: 'Under 9 — nati 7-8 anni fa',                                    categoriaEta: 'u8'           },
  { nome: 'Piccoli Amici', colore: '#ffcc00', tipo: 'squadra',   etaMin: 5,  etaMax: 6,   descrizione: 'Under 7 — nati 5-6 anni fa',                                    categoriaEta: 'u6'           },
  { nome: 'Scuola Calcio', colore: '#66ddff', tipo: 'squadra',   etaMin: 0,  etaMax: 4,   descrizione: 'Primissimi Calci — fino a 4 anni',                              categoriaEta: 'u6'           },
  { nome: 'Staff Tecnico', colore: '#888888', tipo: 'staff',     etaMin: -1, etaMax: -1,  descrizione: 'Allenatori, preparatori e staff',                               categoriaEta: null           },
]

function annoFineStagione(): number {
  const ora  = new Date()
  const mese = ora.getMonth() + 1
  return mese >= 7 ? ora.getFullYear() + 1 : ora.getFullYear()
}

function stagioneCorrente(): string {
  const ora   = new Date()
  const mese  = ora.getMonth() + 1
  const anno  = ora.getFullYear()
  const inizio = mese >= 7 ? anno : anno - 1
  return `${inizio}-${String(inizio + 1).slice(-2)}`
}

function categoriaPerNascita(annoNascita: number): string | null {
  const refAnno = annoFineStagione()
  const eta     = refAnno - annoNascita
  const cat     = CATEGORIE_FIGC.find(c =>
    c.etaMin >= 0 &&
    eta >= c.etaMin &&
    (c.etaMax === -1 || eta <= c.etaMax)
  )
  return cat?.nome ?? null
}

export async function POST() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase  = createAdminClient()
  const { clubId } = ctx
  const stagione  = stagioneCorrente()

  const risultato = {
    gruppiCreati:   0,
    gruppiEsistenti:0,
    giocatoriAssegnati: 0,
    staffAssegnati: 0,
    saltati:        0,
    errori:         [] as string[],
  }

  // ── 1. Crea/recupera tutti i gruppi + squadre corrispondenti ───────────
  const gruppiMap:  Record<string, string> = {} // nome → gruppo_id
  const squadreMap: Record<string, string> = {} // categoriaEta → squadra_id

  for (const cat of CATEGORIE_FIGC) {
    // 1a. Gruppo
    const { data: existing } = await supabase
      .from('gruppi').select('id')
      .eq('club_id', clubId).eq('nome', cat.nome)
      .maybeSingle()

    if (existing) {
      gruppiMap[cat.nome] = existing.id
      risultato.gruppiEsistenti++
    } else {
      const { data: created, error } = await supabase
        .from('gruppi')
        .insert({ club_id: clubId, nome: cat.nome, colore: cat.colore, tipo: cat.tipo, descrizione: cat.descrizione, stagione, attivo: true })
        .select('id').single()

      if (error || !created) {
        risultato.errori.push(`Gruppo ${cat.nome}: ${error?.message ?? 'errore'}`)
        continue
      }
      gruppiMap[cat.nome] = created.id
      risultato.gruppiCreati++
    }

    // 1b. Squadra corrispondente (solo per categorie non-staff)
    if (cat.categoriaEta) {
      const { data: sqEx } = await supabase
        .from('squadre').select('id')
        .eq('club_id', clubId).eq('categoria_eta', cat.categoriaEta).eq('attiva', true)
        .maybeSingle()

      if (sqEx) {
        squadreMap[cat.categoriaEta] = sqEx.id
      } else {
        const { data: sqNew } = await supabase
          .from('squadre')
          .insert({ club_id: clubId, nome: cat.nome, categoria_eta: cat.categoriaEta, stagione, attiva: true })
          .select('id').single()
        if (sqNew) squadreMap[cat.categoriaEta] = sqNew.id
      }
    }
  }

  // ── 2. Carica tutti i giocatori con data_nascita ────────────────────────
  // Prima prova scoped al club via tesseramenti, poi fallback globale
  let giocatori: Array<{ id: string; data_nascita: string | null }> = []

  const { data: tess } = await supabase
    .from('tesseramenti').select('giocatore_id')
    .eq('club_id', clubId)

  const ids = [...new Set(tess?.map(t => t.giocatore_id).filter(Boolean) ?? [])]

  if (ids.length > 0) {
    const { data: g } = await supabase
      .from('giocatori').select('id, data_nascita').in('id', ids)
    giocatori = g ?? []
  } else {
    // Fallback: giocatori del club corrente (nessun tesseramento ancora)
    const { data: g } = await supabase.from('giocatori').select('id, data_nascita').eq('club_id', clubId)
    giocatori = g ?? []
  }

  // ── 3. Assegna ciascun giocatore al gruppo corretto + aggiorna tesseramento ──
  for (const g of giocatori) {
    if (!g.data_nascita) { risultato.saltati++; continue }

    const annoNascita   = new Date(g.data_nascita).getFullYear()
    const nomeCategoria = categoriaPerNascita(annoNascita)
    const gruppoId      = nomeCategoria ? gruppiMap[nomeCategoria] : null
    const cat           = nomeCategoria ? CATEGORIE_FIGC.find(c => c.nome === nomeCategoria) : null
    const squadraId     = cat?.categoriaEta ? squadreMap[cat.categoriaEta] : null

    if (!gruppoId) { risultato.saltati++; continue }

    // 3a. Aggiungi a gruppi_membri se non già presente
    const { data: exists } = await supabase
      .from('gruppi_membri').select('id')
      .eq('gruppo_id', gruppoId).eq('giocatore_id', g.id)
      .maybeSingle()

    if (!exists) {
      const { error } = await supabase
        .from('gruppi_membri')
        .insert({ gruppo_id: gruppoId, giocatore_id: g.id })
      if (error) risultato.errori.push(`Giocatore ${g.id}: ${error.message}`)
      else risultato.giocatoriAssegnati++
    } else {
      risultato.saltati++
    }

    // 3b. Aggiorna squadra_id sul tesseramento attivo se non già impostato
    if (squadraId) {
      await supabase
        .from('tesseramenti')
        .update({ squadra_id: squadraId })
        .eq('giocatore_id', g.id)
        .eq('club_id', clubId)
        .eq('stato', 'attivo')
        .is('squadra_id', null)
    }
  }

  // ── 4. Assegna staff tecnico ────────────────────────────────────────────
  const staffGruppoId = gruppiMap['Staff Tecnico']
  if (staffGruppoId) {
    const { data: utenti } = await supabase
      .from('utenti').select('id, ruolo')
      .eq('club_id', clubId).eq('attivo', true)

    for (const u of utenti ?? []) {
      const { data: exists } = await supabase
        .from('gruppi_membri').select('id')
        .eq('gruppo_id', staffGruppoId).eq('utente_id', u.id)
        .maybeSingle()

      if (exists) continue

      const { error } = await supabase
        .from('gruppi_membri')
        .insert({ gruppo_id: staffGruppoId, utente_id: u.id, ruolo_nel_gruppo: u.ruolo ?? null })

      if (error) risultato.errori.push(`Staff ${u.id}: ${error.message}`)
      else risultato.staffAssegnati++
    }
  }

  return Response.json(risultato)
}
