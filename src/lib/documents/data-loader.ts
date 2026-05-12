import type { SupabaseClient } from '@supabase/supabase-js'
import type { DatiSocieta, DatiTesserato, DatiGenitore } from './types'

export async function caricaDatiGenerazione(
  supabase: SupabaseClient,
  clubId: string,
  giocatoreId?: string
) {
  const { data: clubRaw } = await supabase
    .from('clubs')
    .select('nome, nome_esteso, citta, indirizzo, codice_fiscale, partita_iva, pec, ' +
            'presidente_nome, presidente_cf, logo_url, iban, nome_banca')
    .eq('id', clubId)
    .single()
  const club = clubRaw as Record<string, any> | null

  const societa: DatiSocieta = {
    nome:             club?.nome ?? '',
    nome_esteso:      club?.nome_esteso ?? undefined,
    citta:            club?.citta ?? '',
    indirizzo:        club?.indirizzo ?? undefined,
    codice_fiscale:   club?.codice_fiscale ?? undefined,
    partita_iva:      club?.partita_iva ?? undefined,
    pec:              club?.pec ?? undefined,
    presidente_nome:  club?.presidente_nome ?? undefined,
    presidente_cf:    club?.presidente_cf ?? undefined,
    logo_url:         club?.logo_url ?? undefined,
    iban:             club?.iban ?? undefined,
    nome_banca:       club?.nome_banca ?? undefined,
  }

  if (!giocatoreId) {
    return { societa, tesserato: null, genitore: null, importo730: 0 }
  }

  const { data: gRaw } = await supabase
    .from('giocatori')
    .select('nome, cognome, data_nascita, luogo_nascita, codice_fiscale, ' +
            'codice_tessera_figc, ruolo_principale, nazionalita_paese, ' +
            'email_contatto, telefono_contatto, via, citta, cap, provincia')
    .eq('id', giocatoreId)
    .single()
  const g = gRaw as Record<string, any> | null

  const isMinorenne = g?.data_nascita
    ? (new Date().getFullYear() - new Date(g.data_nascita).getFullYear()) < 18
    : false

  const tesserato: DatiTesserato = {
    nome:                  g?.nome ?? '',
    cognome:               g?.cognome ?? '',
    data_nascita:          g?.data_nascita ?? '',
    luogo_nascita:         g?.luogo_nascita ?? undefined,
    codice_fiscale:        g?.codice_fiscale ?? undefined,
    codice_tessera_figc:   g?.codice_tessera_figc ?? undefined,
    ruolo_principale:      g?.ruolo_principale ?? undefined,
    nazionalita_paese:     g?.nazionalita_paese ?? undefined,
    email_contatto:        g?.email_contatto ?? undefined,
    telefono_contatto:     g?.telefono_contatto ?? undefined,
    indirizzo:             g?.via ?? undefined,
    citta:                 g?.citta ?? undefined,
    cap:                   g?.cap ?? undefined,
    provincia:             g?.provincia ?? undefined,
    is_minorenne:          isMinorenne,
  }

  let genitore: DatiGenitore | undefined
  if (isMinorenne) {
    const { data: fam } = await supabase
      .from('famiglie')
      .select('nome, cognome, email, telefono, relazione')
      .eq('giocatore_id', giocatoreId)
      .maybeSingle()

    if (fam) {
      genitore = {
        nome:      fam.nome,
        cognome:   fam.cognome,
        email:     fam.email ?? undefined,
        telefono:  fam.telefono ?? undefined,
        relazione: fam.relazione ?? 'genitore',
      }
    }
  }

  const { data: rate } = await supabase
    .from('rate_pagamento')
    .select('importo, piani_pagamento!inner(giocatore_id)')
    .eq('stato', 'pagata')
    .eq('piani_pagamento.giocatore_id', giocatoreId)

  const importo730 = rate?.reduce((s: number, r: any) => s + Number(r.importo), 0) ?? 0

  return { societa, tesserato, genitore, importo730 }
}
