// src/app/api/prima-nota/route.ts
// API unificata per prima_nota — accessibile da tutti i ruoli autorizzati
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'

// Tutti i ruoli gestionali possono vedere; solo questi possono scrivere
const RUOLI_READ  = ['presidente', 'ds', 'segretario', 'team_manager', 'admin']
const RUOLI_WRITE = ['presidente', 'ds', 'segretario', 'admin']

export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!RUOLI_READ.includes(ctx.ruolo)) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const tipo      = searchParams.get('tipo')          // 'entrata' | 'uscita'
  const categoria = searchParams.get('categoria')
  const da        = searchParams.get('da')            // data ISO inizio
  const a         = searchParams.get('a')             // data ISO fine
  const squadraId = searchParams.get('squadra_id')
  const sorgente  = searchParams.get('sorgente')
  const limit     = parseInt(searchParams.get('limit') ?? '200')
  const mese      = searchParams.get('mese')          // es. '2025-09' → filtra per mese

  let query = supabase
    .from('prima_nota')
    .select('id, tipo, categoria, importo, data, descrizione, controparte, note, stornato, sorgente, sorgente_id, squadra_id, created_at')
    .eq('club_id', ctx.clubId)
    .order('data', { ascending: false })
    .limit(limit)

  if (tipo)      query = query.eq('tipo', tipo)
  if (categoria) query = query.eq('categoria', categoria)
  if (da)        query = query.gte('data', da)
  if (a)         query = query.lte('data', a)
  if (squadraId) query = query.eq('squadra_id', squadraId)
  if (sorgente)  query = query.eq('sorgente', sorgente)
  if (mese) {
    const [anno, meseN] = mese.split('-')
    const inizio = `${anno}-${meseN}-01`
    const fine   = new Date(parseInt(anno), parseInt(meseN), 0).toISOString().split('T')[0]
    query = query.gte('data', inizio).lte('data', fine)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Aggrega KPI
  const movimenti = data ?? []
  const totEntrate = movimenti.filter(m => m.tipo === 'entrata' && !m.stornato).reduce((s, m) => s + Number(m.importo), 0)
  const totUscite  = movimenti.filter(m => m.tipo === 'uscita'  && !m.stornato).reduce((s, m) => s + Number(m.importo), 0)

  return Response.json({
    movimenti,
    kpi: {
      totEntrate,
      totUscite,
      saldo: totEntrate - totUscite,
    },
  })
}

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!RUOLI_WRITE.includes(ctx.ruolo)) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const supabase = createAdminClient()
  const body = await req.json()

  if (!body.tipo || !body.importo || !body.data) {
    return Response.json({ error: 'Campi obbligatori: tipo, importo, data' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('prima_nota')
    .insert({
      club_id:     ctx.clubId,
      tipo:        body.tipo,
      categoria:   body.categoria ?? 'altro',
      importo:     parseFloat(body.importo),
      data:        body.data,
      descrizione: body.descrizione ?? null,
      controparte: body.controparte ?? null,
      note:        body.note ?? null,
      sorgente:    body.sorgente ?? 'manuale',
      sorgente_id: body.sorgente_id ?? null,
      squadra_id:  body.squadra_id ?? null,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ movimento: data }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!RUOLI_WRITE.includes(ctx.ruolo)) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'id mancante' }, { status: 400 })

  // Storno contabile invece di DELETE fisica
  const { data: orig } = await supabase
    .from('prima_nota')
    .select('tipo, importo, data, descrizione, categoria')
    .eq('id', id)
    .eq('club_id', ctx.clubId)
    .single()

  if (!orig) return Response.json({ error: 'Movimento non trovato' }, { status: 404 })

  const supabaseTx = createAdminClient()
  // Marca originale come stornato
  await supabaseTx.from('prima_nota').update({ stornato: true }).eq('id', id).eq('club_id', ctx.clubId)

  // Inserisce il movimento di storno
  const { data: storno } = await supabaseTx.from('prima_nota').insert({
    club_id:     ctx.clubId,
    tipo:        orig.tipo === 'entrata' ? 'uscita' : 'entrata',
    categoria:   orig.categoria,
    importo:     orig.importo,
    data:        new Date().toISOString().split('T')[0],
    descrizione: `[STORNO] ${orig.descrizione ?? ''}`,
    sorgente:    'storno',
    sorgente_id: id,
  }).select().single()

  return Response.json({ storno })
}
