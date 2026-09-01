import { createAdminClient } from '@/lib/supabase/admin'
import { controllaCertificatiInScadenza, controllaQuoteGiovaniliInScadenza } from '@/lib/scadenze-check'
import { NextRequest, NextResponse } from 'next/server'

// Eseguito ogni giorno alle 9:00 da Vercel Cron (vedi vercel.json).
// Protetto da Authorization: Bearer <CRON_SECRET> (Vercel la inietta in automatico
// per i propri Cron Jobs quando la env var CRON_SECRET è impostata sul progetto).
//
// Copertura globale (tutti i club) per due tipi di scadenza che, a differenza
// delle quote_iscrizione già gestite da /api/cron/preavviso-pagamenti, non
// avevano alcuna notifica automatica:
//
// 1. Certificati medici in scadenza (o già scaduti) — notifica segretario e medico.
// 2. Quote mensili settore giovanile / scuola calcio (tabella quote_giovanili) in
//    scadenza o in ritardo — notifica la famiglia del giocatore e il segretario.
//
// In aggiunta a questo cron, lo stesso controllo (limitato al club dell'utente)
// viene rilanciato al primo accesso della giornata da dashboard/layout.tsx —
// vedi controllaScadenzeClubSeNecessario in lib/scadenze-check.ts — così le
// notifiche arrivano anche prima delle 9:00 se qualcuno apre il gestionale prima.

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const db = createAdminClient()

  const [certificati, quote] = await Promise.all([
    controllaCertificatiInScadenza(db),
    controllaQuoteGiovaniliInScadenza(db),
  ])

  return NextResponse.json({
    ok: true,
    certificati_medici: certificati,
    quote_giovanili: quote,
    eseguito_alle: new Date().toISOString(),
  })
}
