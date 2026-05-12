type SupabaseLike = {
  from: (table: string) => any
}

type AuthUserLike = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}

export type FamigliaCollegamento = {
  id: string
  giocatore_id: string
  nome: string
  cognome: string
  relazione: string
  consenso_dati: boolean | null
  consenso_immagini: boolean | null
  giocatori: {
    id: string
    nome: string
    cognome: string
    ruolo_principale: string | null
    data_nascita: string | null
    consenso_gdpr: boolean | null
  } | null
}

function normalizeInviteCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const code = value.trim()
  if (!code) return null
  return code
}

export async function getFamigliaCollegamenti(
  supabase: SupabaseLike,
  user: AuthUserLike
): Promise<FamigliaCollegamento[]> {
  const baseSelect =
    'id, giocatore_id, nome, cognome, relazione, consenso_dati, consenso_immagini, giocatori(id, nome, cognome, ruolo_principale, data_nascita, consenso_gdpr)'

  const loadByAuthUser = async () => {
    const { data } = await supabase
      .from('famiglie')
      .select(baseSelect)
      .eq('auth_user_id', user.id)
      .order('created_at', { ascending: true })
    return (data ?? []) as FamigliaCollegamento[]
  }

  let collegamenti = await loadByAuthUser()
  if (collegamenti.length > 0) return collegamenti

  const email = user.email?.trim().toLowerCase()
  const inviteCode = normalizeInviteCode(
    user.user_metadata?.family_invite_code ?? user.user_metadata?.invite_code
  )

  const candidatiByEmailPromise = email
    ? supabase
        .from('famiglie')
        .select('id')
        .ilike('email', email)
    : Promise.resolve({ data: [] as { id: string }[] })

  const candidatiByCodePromise = inviteCode
    ? supabase
        .from('famiglie')
        .select('id')
        .eq('id', inviteCode)
    : Promise.resolve({ data: [] as { id: string }[] })

  const [candidatiByEmail, candidatiByCode] = await Promise.all([
    candidatiByEmailPromise,
    candidatiByCodePromise,
  ])

  const ids = new Set<string>()
  for (const row of candidatiByEmail.data ?? []) ids.add(row.id)
  for (const row of candidatiByCode.data ?? []) ids.add(row.id)
  const famigliaIds = Array.from(ids)

  if (famigliaIds.length === 0) return collegamenti

  await supabase
    .from('famiglie')
    .update({ auth_user_id: user.id })
    .in('id', famigliaIds)
    .is('auth_user_id', null)

  await supabase
    .from('famiglie')
    .update({ auth_user_id: user.id })
    .in('id', famigliaIds)
    .eq('auth_user_id', user.id)

  collegamenti = await loadByAuthUser()
  return collegamenti
}
