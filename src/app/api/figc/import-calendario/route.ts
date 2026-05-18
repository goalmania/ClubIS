import { getUserContext } from '@/lib/impersonation'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

interface PartitaImport {
  data_ora: string
  avversario: string
  casa_trasferta: 'casa' | 'trasferta' | 'neutro'
  campo?: string
  giornata?: number
}

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const clubId = ctx.clubId
  if (!clubId) return NextResponse.json({ error: 'Club non trovato' }, { status: 400 })

  const supabase = createAdminClient()

  const body = await req.json()
  const { partite, modalita_conflitto = 'salta', squadra_id: squadraIdBody }: {
    partite: PartitaImport[]
    modalita_conflitto: 'salta' | 'sovrascrivi' | 'aggiorna_campo'
    squadra_id?: string
  } = body

  let squadraId: string | undefined

  if (squadraIdBody) {
    // Validate the provided squadra_id belongs to this club
    const { data: sq } = await supabase
      .from('squadre').select('id').eq('id', squadraIdBody).eq('club_id', clubId).single()
    if (!sq) return NextResponse.json({ error: 'Squadra non trovata o non autorizzata' }, { status: 400 })
    squadraId = sq.id
  } else {
    // Fallback: first active squad (legacy behavior)
    const { data: squadre } = await supabase
      .from('squadre').select('id').eq('club_id', clubId).eq('attiva', true).limit(1)
    squadraId = squadre?.[0]?.id
  }

  if (!squadraId) {
    return NextResponse.json({ error: 'Nessuna squadra attiva trovata per questo club' }, { status: 400 })
  }

  if (!Array.isArray(partite) || partite.length === 0) {
    return NextResponse.json({ error: 'Nessuna partita da importare' }, { status: 400 })
  }

  let importate = 0
  let saltate = 0
  let conflitti = 0
  let firstError: string | null = null

  for (const p of partite) {
    if (!p.data_ora || !p.avversario) { saltate++; continue }

    const dataStr = p.data_ora.split('T')[0]

    const { data: existing } = await supabase
      .from('partite')
      .select('id, campo')
      .eq('squadra_id', squadraId)
      .gte('data_ora', `${dataStr}T00:00:00`)
      .lte('data_ora', `${dataStr}T23:59:59`)
      .eq('avversario', p.avversario)
      .maybeSingle()

    if (existing) {
      conflitti++
      if (modalita_conflitto === 'salta') {
        saltate++
        continue
      }
      if (modalita_conflitto === 'aggiorna_campo') {
        if (!existing.campo && p.campo) {
          await supabase.from('partite').update({ campo: p.campo }).eq('id', existing.id)
        }
        continue
      }
      if (modalita_conflitto === 'sovrascrivi') {
        await supabase.from('partite').update({
          data_ora: p.data_ora,
          campo: p.campo ?? null,
          giornata: p.giornata ?? null,
          casa_trasferta: p.casa_trasferta,
        }).eq('id', existing.id)
        importate++
        continue
      }
    }

    const { error } = await supabase.from('partite').insert({
      squadra_id: squadraId,
      avversario: p.avversario,
      data_ora: p.data_ora,
      campo: p.campo ?? null,
      giornata: p.giornata ?? null,
      casa_trasferta: p.casa_trasferta,
      tipo: 'campionato',
      stato: 'programmata',
    })

    if (error) {
      if (!firstError) firstError = error.message
      saltate++
      continue
    }
    importate++
  }

  return NextResponse.json({ importate, saltate, conflitti, _debug_error: firstError })
}
