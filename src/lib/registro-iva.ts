import type { SupabaseClient } from '@supabase/supabase-js'

export function stagioneDaData(data: string): string {
  const d = new Date(data)
  const anno = d.getFullYear()
  const mese = d.getMonth() + 1
  if (mese >= 9) return `${anno}-${String(anno + 1).slice(2)}`
  return `${anno - 1}-${String(anno).slice(2)}`
}

export async function inserisciRegistroIva(
  supabase: SupabaseClient,
  params: {
    club_id: string
    data_operazione: string
    tipo: 'entrata' | 'uscita'
    natura: string
    controparte?: string
    importo: number
    regime?: string
    riferimento_pagamento_id?: string
    note?: string
  }
) {
  const anno = new Date(params.data_operazione).getFullYear()

  const { count } = await supabase
    .from('registro_iva')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', params.club_id)
    .gte('data_operazione', `${anno}-01-01`)
    .lte('data_operazione', `${anno}-12-31`)

  const numero_progressivo = `${anno}/${String((count ?? 0) + 1).padStart(4, '0')}`

  return supabase.from('registro_iva').insert({
    club_id: params.club_id,
    numero_progressivo,
    data_operazione: params.data_operazione,
    tipo: params.tipo,
    natura: params.natura,
    controparte: params.controparte ?? null,
    imponibile: params.importo,
    iva: 0,
    totale: params.importo,
    regime: params.regime ?? 'esente_art10',
    riferimento_pagamento_id: params.riferimento_pagamento_id ?? null,
    note: params.note ?? null,
  })
}
