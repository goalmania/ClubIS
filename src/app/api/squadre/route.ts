// src/app/api/squadre/route.ts
// Restituisce le squadre attive del club.
// Se il club non ha ancora squadre, le crea automaticamente (seed idempotente).

import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { stagioneCorrente } from '@/lib/helpers'

export const dynamic = 'force-dynamic'

const DEFAULT_SQUADRE = [
  { nome: 'Prima Squadra',    categoria_eta: 'prima_squadra' },
  { nome: 'Under 19',         categoria_eta: 'u19' },
  { nome: 'Juniores',         categoria_eta: 'juniores' },
  { nome: 'Under 17',         categoria_eta: 'u17' },
  { nome: 'Under 16',         categoria_eta: 'u16' },
  { nome: 'Under 15',         categoria_eta: 'u15' },
  { nome: 'Under 14',         categoria_eta: 'u14' },
  { nome: 'Under 12',         categoria_eta: 'u12' },
  { nome: 'Under 10',         categoria_eta: 'u10' },
  { nome: 'Under 8',          categoria_eta: 'u8' },
  { nome: 'Under 6',          categoria_eta: 'u6' },
]

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()
  const { clubId } = ctx
  const stagione = stagioneCorrente()

  // Carica squadre esistenti per la stagione corrente
  const { data: esistenti } = await supabase
    .from('squadre')
    .select('id, nome, categoria_eta')
    .eq('club_id', clubId)
    .eq('attiva', true)
    .order('nome')

  const categorieEsistenti = new Set((esistenti ?? []).map(s => s.categoria_eta))

  // Inserisce solo le categorie mancanti (upsert idempotente)
  const mancanti = DEFAULT_SQUADRE.filter(d => !categorieEsistenti.has(d.categoria_eta))
  if (mancanti.length > 0) {
    await supabase.from('squadre').upsert(
      mancanti.map(d => ({
        club_id:      clubId,
        nome:         d.nome,
        categoria_eta: d.categoria_eta,
        stagione,
        attiva:       true,
      })),
      { onConflict: 'club_id,categoria_eta,stagione', ignoreDuplicates: true },
    )
  }

  // Ricarica la lista completa dopo l'eventuale seed
  const { data, error } = await supabase
    .from('squadre')
    .select('id, nome, categoria_eta')
    .eq('club_id', clubId)
    .eq('attiva', true)
    .order('nome')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}
