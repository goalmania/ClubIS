import { createAdminClient } from '@/lib/supabase/admin'

export interface GiocatoreElegibile {
  id: string
  nome: string
  cognome: string
  numero_maglia: number | null
  ruolo_principale: string | null
  codice_tessera_figc: string | null
}

export interface GiocatoreNonElegibile {
  giocatore: GiocatoreElegibile
  motivi: string[]
}

interface SqualificaComunicatoDetail {
  durata: string
  tipo_sanzione: string
  numero_comunicato: string | null
  data_comunicato: string | null
}

function formatDataBreve(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function buildMotivoSqualifica(
  detail: SqualificaComunicatoDetail | undefined,
  partiteRestanti?: number
): string {
  if (!detail) {
    return partiteRestanti != null
      ? `Squalificato (${partiteRestanti} gior. rimanenti)`
      : 'Squalificato'
  }
  const ref = detail.numero_comunicato
    ? `C.U. n°${detail.numero_comunicato}${detail.data_comunicato ? ' del ' + formatDataBreve(detail.data_comunicato) : ''}`
    : null
  const parts = [detail.durata]
  if (ref) parts.push(ref)
  return `Squalificato (${parts.join(' — ')})`
}

export async function getGiocatoriEleggibili(
  _supabase: any,
  partitaId: string,
  clubId: string
): Promise<{ eleggibili: GiocatoreElegibile[]; nonEleggibili: GiocatoreNonElegibile[]; squalificheManuale: number }> {
  // Usa il client admin per bypassare RLS: il clubId è già verificato dal
  // chiamante tramite getUserContext(), quindi il filtro esplicito è sufficiente.
  const supabase = createAdminClient()

  const { data: partita } = await supabase
    .from('partite')
    .select('data_ora')
    .eq('id', partitaId)
    .single()

  if (!partita) return { eleggibili: [], nonEleggibili: [], squalificheManuale: 0 }

  const dataStr = partita.data_ora.split('T')[0]

  // Recupera gli ID delle squadre del club per la query fallback via squadra_id.
  // Questo copre il caso in cui tesseramenti.club_id è NULL o errato ma il link
  // alla squadra è corretto (stessa logica di /api/giocatori).
  const { data: squadreClub } = await supabase
    .from('squadre')
    .select('id')
    .eq('club_id', clubId)
  const squadraIds = (squadreClub ?? []).map((s: any) => s.id)

  const tessBaseQuery = supabase
    .from('tesseramenti')
    .select('numero_maglia, giocatori(id, nome, cognome, ruolo_principale, codice_tessera_figc)')
    .eq('stato', 'attivo')

  const tessQuery = squadraIds.length > 0
    ? tessBaseQuery.or(`club_id.eq.${clubId},squadra_id.in.(${squadraIds.join(',')})`)
    : tessBaseQuery.eq('club_id', clubId)

  const [
    { data: tesseramenti },
    { data: certificati },
    { data: squalifiche },
    { data: infortuni },
    { data: sqComunicato },
  ] = await Promise.all([
    tessQuery,
    supabase
      .from('certificati_medici')
      .select('giocatore_id, data_scadenza')
      .eq('club_id', clubId)
      .gte('data_scadenza', dataStr),
    supabase
      .from('squalifiche')
      .select('giocatore_id, partite_restanti, data_fine, comunicato_figc')
      .eq('club_id', clubId),
    supabase
      .from('infortuni')
      .select('giocatore_id, data_rientro_prevista')
      .eq('club_id', clubId)
      .is('data_rientro_effettiva', null),
    // Squalifiche confermate dai comunicati FIGC (con riferimento C.U. per il motivo)
    supabase
      .from('squalifiche_comunicato')
      .select('giocatore_id, durata, tipo_sanzione, comunicati_figc(numero_comunicato, data_comunicato)')
      .eq('club_id', clubId)
      .eq('confermato', true),
  ])

  const certSet = new Set((certificati ?? []).map((c: any) => c.giocatore_id as string))

  // Mappa giocatore_id → dettaglio squalifica da comunicato (per messaggio arricchito)
  const sqComunicatoMap = new Map<string, SqualificaComunicatoDetail>()
  for (const s of sqComunicato ?? []) {
    if (!s.giocatore_id) continue
    const cf = s.comunicati_figc as unknown as { numero_comunicato: string | null; data_comunicato: string | null } | null
    sqComunicatoMap.set(s.giocatore_id, {
      durata: s.durata ?? '',
      tipo_sanzione: s.tipo_sanzione ?? 'squalifica',
      numero_comunicato: cf?.numero_comunicato ?? null,
      data_comunicato: cf?.data_comunicato ?? null,
    })
  }

  // Set di squalificati: unione di squalifiche table + squalifiche_comunicato confermato
  const squalifAtive = (squalifiche ?? []).filter((s: any) =>
    (s.partite_restanti ?? 0) > 0 ||
    (s.data_fine && s.data_fine >= dataStr)
  )
  const squalifMap = new Map<string, { partiteRestanti: number; dataFine: string | null }>(
    squalifAtive.map((s: any) => [s.giocatore_id as string, { partiteRestanti: s.partite_restanti, dataFine: s.data_fine }])
  )

  // Conta squalifiche attive inserite manualmente (senza riferimento comunicato FIGC)
  const squalificheManuale = squalifAtive.filter((s: any) => !s.comunicato_figc).length

  // Aggiungi quelli presenti solo in squalifiche_comunicato (edge case: confermato ma non in squalifiche table)
  for (const gId of sqComunicatoMap.keys()) {
    if (!squalifMap.has(gId)) {
      squalifMap.set(gId, { partiteRestanti: 1, dataFine: null })
    }
  }

  const infortSet = new Set(
    (infortuni ?? [])
      .filter((i: any) => !i.data_rientro_prevista || i.data_rientro_prevista >= dataStr)
      .map((i: any) => i.giocatore_id as string)
  )

  const eleggibili: GiocatoreElegibile[] = []
  const nonEleggibili: GiocatoreNonElegibile[] = []

  for (const t of tesseramenti ?? []) {
    const g: any = t.giocatori
    if (!g) continue

    const giocatore: GiocatoreElegibile = {
      id: g.id,
      nome: g.nome,
      cognome: g.cognome,
      numero_maglia: (t as any).numero_maglia ?? null,
      ruolo_principale: g.ruolo_principale ?? null,
      codice_tessera_figc: g.codice_tessera_figc ?? null,
    }

    const motivi: string[] = []
    if (!certSet.has(g.id)) motivi.push('Certificato medico assente o scaduto')

    if (squalifMap.has(g.id)) {
      const sqDetail = squalifMap.get(g.id)!
      motivi.push(buildMotivoSqualifica(sqComunicatoMap.get(g.id), sqDetail.partiteRestanti))
    }

    if (infortSet.has(g.id)) motivi.push('Infortunato')

    if (motivi.length === 0) {
      eleggibili.push(giocatore)
    } else {
      nonEleggibili.push({ giocatore, motivi })
    }
  }

  eleggibili.sort((a, b) => (a.numero_maglia ?? 99) - (b.numero_maglia ?? 99))
  nonEleggibili.sort((a, b) => a.giocatore.cognome.localeCompare(b.giocatore.cognome))

  return { eleggibili, nonEleggibili, squalificheManuale }
}
