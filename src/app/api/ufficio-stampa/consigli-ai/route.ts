import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getClubFromSession } from '@/lib/server-helpers'
import { canAccess } from '@/lib/features'

const RUOLO_LABEL: Record<string, string> = {
  presidente:   'Presidente',
  ds:           'Direttore Sportivo',
  team_manager: 'Team Manager',
  allenatore:   'Allenatore',
  giocatore:    'Giocatore',
}

const CONTESTO_LABEL: Record<string, string> = {
  pre_partita:       'pre-partita',
  post_partita:      'post-partita',
  conferenza_stampa: 'conferenza stampa',
  mercato:           'mercato',
  generale:          'generale',
  crisi_risultati:   'crisi risultati',
  infortunio:        'infortunio',
}

export async function POST(req: NextRequest) {
  const session = await getClubFromSession()
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canAccess('ufficio_stampa_ai', session.plan)) {
    return NextResponse.json({ error: 'Piano insufficiente. Aggiorna il tuo abbonamento.' }, { status: 403 })
  }

  const sessionClient = createClient()
  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente } = await supabase
    .from('utenti')
    .select('ruolo, club_id, clubs(nome)')
    .eq('id', user.id)
    .single()

  if (!utente || utente.ruolo !== 'ufficio_stampa') {
    return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 })
  }

  const body = await req.json()
  const { destinatario_ruolo, contesto, situazione_specifica, n_domande = 5 } = body

  if (!destinatario_ruolo || !contesto) {
    return NextResponse.json({ error: 'destinatario_ruolo e contesto sono obbligatori' }, { status: 400 })
  }

  const ruoloLabel    = RUOLO_LABEL[destinatario_ruolo]    ?? destinatario_ruolo
  const contestoLabel = CONTESTO_LABEL[contesto]            ?? contesto
  const nomeClub      = (utente.clubs as any)?.nome         ?? null
  const nDomande      = Math.min(Math.max(Number(n_domande), 1), 20)

  const situazioneClause = situazione_specifica?.trim()
    ? ` La situazione attuale del club è: ${situazione_specifica.trim()}.`
    : ''

  const clubClause = nomeClub ? ` Il club si chiama "${nomeClub}" e milita in categoria Eccellenza.` : ' Il club milita in categoria Eccellenza.'

  const prompt = `Sei un esperto di comunicazione sportiva italiana. Genera ${nDomande} domande frequenti che un giornalista potrebbe fare a un ${ruoloLabel} di un club di calcio italiano nel contesto ${contestoLabel}.${clubClause}${situazioneClause} Per ogni domanda fornisci un consiglio dettagliato su come rispondere in modo professionale, equilibrato e comunicativamente efficace. Rispondi SOLO con un array JSON valido senza markdown, nel formato: [{"domanda": string, "consiglio_risposta": string, "priorita": 1|2|3}] dove priorita 1=alta 2=media 3=bassa in base a quanto è probabile e delicata la domanda.`

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configurata nel server' }, { status: 503 })
  }

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 4096,
    messages:   [{ role: 'user', content: prompt }],
  })

  const rawText = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  let parsed: { domanda: string; consiglio_risposta: string; priorita: 1 | 2 | 3 }[]
  try {
    parsed = JSON.parse(rawText)
    if (!Array.isArray(parsed)) throw new Error('Risposta non è un array')
  } catch {
    return NextResponse.json({ error: 'Risposta AI non valida — riprova', raw: rawText }, { status: 422 })
  }

  const validated = parsed
    .filter(item => item.domanda && item.consiglio_risposta)
    .map(item => ({
      domanda:           String(item.domanda).trim(),
      consiglio_risposta: String(item.consiglio_risposta).trim(),
      priorita:          ([1, 2, 3] as const).includes(item.priorita as 1 | 2 | 3) ? item.priorita : 2,
    }))

  return NextResponse.json({ domande: validated })
}
