import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import webPush from 'web-push'

export type TipologiaEvento =
  | 'allenamento'
  | 'partita'
  | 'riunione'
  | 'visita_medica'
  | 'trasferta'

export type PrioritaEvento = 'bassa' | 'media' | 'alta' | 'urgente'

export type CISContestoRuolo = 'presidente' | 'segretario' | 'team_manager' | 'allenatore' | 'medico' | 'giocatore' | 'famiglia' | 'ufficio_stampa'
export type CISCanale = 'push' | 'email' | 'notifica_interna'
export type CISFrequenza = 'immediata' | 'giornaliera' | 'disattivata'

const TIPOL_LABEL: Record<TipologiaEvento, string> = {
  allenamento: 'Allenamento',
  partita: 'Partita',
  riunione: 'Riunione',
  visita_medica: 'Visita medica',
  trasferta: 'Trasferta',
}

const NOT_IMPLEMENTED = 'CIS_SENDER_NOT_IMPLEMENTED'

type OutboxRow = {
  id: string
  club_id: string
  utente_id: string
  evento_id: string | null
  contesto_ruolo: CISContestoRuolo
  canale: CISCanale
  priorita: PrioritaEvento
  anticipo_min: number | null
  send_at: string
  titolo: string
  messaggio: string
  azione_url: string | null
  payload?: any
}

type PreferencesRow = {
  contesto_ruolo: CISContestoRuolo
  canale_push_enabled: boolean
  canale_email_enabled: boolean
  canale_interna_enabled: boolean
  frequenza_interna: CISFrequenza
  frequenza_email: CISFrequenza
}

type EventRow = {
  id: string
  club_id: string
  tipologia: TipologiaEvento
  priorita: PrioritaEvento
  data: string
  data_ora_inizio: string
  luogo_testo: string | null
}

function parseIds(rows: any[] | null | undefined) {
  return (rows ?? []).map(r => r.id).filter(Boolean)
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr))
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function channelsForRole(contesto: CISContestoRuolo, tipologia: TipologiaEvento, priorita: PrioritaEvento): CISCanale[] {
  if (contesto === 'presidente') return ['notifica_interna']
  if (contesto === 'segretario') return ['notifica_interna', 'email']
  if (contesto === 'ufficio_stampa') return ['notifica_interna', 'push', 'email']
  if (contesto === 'team_manager') {
    const out: CISCanale[] = ['notifica_interna']
    if (priorita !== 'bassa') out.push('push')
    if (priorita === 'urgente' || priorita === 'alta') out.push('email')
    return out
  }
  if (contesto === 'allenatore') return ['notifica_interna', 'push']
  if (contesto === 'medico') return tipologia === 'visita_medica' ? ['notifica_interna', 'email'] : ['notifica_interna']
  if (contesto === 'giocatore') return priorita === 'urgente' || priorita === 'alta' ? ['push', 'email'] : ['push']
  // famiglia
  return priorita === 'urgente' ? ['email', 'push'] : ['email']
}

function anticipoSlots(priorita: PrioritaEvento): number[] {
  // minuti prima
  if (priorita === 'alta' || priorita === 'urgente') return [24 * 60, 60]
  return [24 * 60]
}

async function getUserClubId(supabase: SupabaseClient, userId: string) {
  const { data: utente, error } = await supabase.from('utenti').select('club_id').eq('id', userId).single()
  if (error || !utente) throw new Error('Utente non trovato')
  return utente.club_id as string
}

async function listUtentiByRole(supabase: SupabaseClient, clubId: string, ruolo: string) {
  const { data, error } = await supabase.from('utenti').select('id').eq('club_id', clubId).eq('ruolo', ruolo)
  if (error) return []
  return (data ?? []).map(r => r.id).filter(Boolean)
}

async function listStaffRolesByIds(supabase: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return []
  const { data, error } = await supabase.from('utenti').select('id, ruolo').in('id', ids)
  if (error) return []
  return (data ?? []) as { id: string; ruolo: string }[]
}

async function getAllenatoriForSquadre(supabase: SupabaseClient, squadreIds: string[]) {
  if (squadreIds.length === 0) return []
  const { data, error } = await supabase
    .from('squadre')
    .select('id, allenatore_id')
    .in('id', squadreIds)
  if (error) return []
  return (data ?? []).map(s => s.allenatore_id).filter(Boolean) as string[]
}

async function getPlayerIdsForSquadre(supabase: SupabaseClient, clubId: string, squadreIds: string[]) {
  if (squadreIds.length === 0) return []
  const { data, error } = await supabase
    .from('tesseramenti')
    .select('giocatore_id')
    .eq('club_id', clubId)
    .in('squadra_id', squadreIds)
    .eq('stato', 'attivo')

  if (error) return []
  return (data ?? []).map(r => r.giocatore_id).filter(Boolean) as string[]
}

async function getFamilyUserIdsForPlayers(supabase: SupabaseClient, playerIds: string[]) {
  if (playerIds.length === 0) return []
  const { data, error } = await supabase
    .from('famiglie')
    .select('auth_user_id')
    .in('giocatore_id', playerIds)

  if (error) return []
  const authIds = (data ?? []).map(r => r.auth_user_id).filter(Boolean) as string[]
  if (authIds.length === 0) return []
  // Filtra anche che siano utenti esistenti (e quindi notificabili via RLS)
  const { data: utentiIds, error: uErr } = await supabase
    .from('utenti')
    .select('id')
    .in('id', authIds)
  if (uErr) return []
  return (utentiIds ?? []).map((u: any) => u.id).filter(Boolean) as string[]
}

async function buildRecipients(supabase: SupabaseClient, event: EventRow, participants: any[]) {
  const squadreIds = uniq(participants.filter(p => p.tipo_partecipante === 'squadra').map(p => p.squadra_id).filter(Boolean))
  const staffIds = uniq(participants.filter(p => p.tipo_partecipante === 'staff').map(p => p.staff_id).filter(Boolean))
  const directPlayerIds = uniq(participants.filter(p => p.tipo_partecipante === 'giocatore').map(p => p.giocatore_id).filter(Boolean))

  const playersFromSquadre = await getPlayerIdsForSquadre(supabase, event.club_id, squadreIds)
  const allPlayers = uniq([...directPlayerIds, ...playersFromSquadre])

  const familyUserIds = await getFamilyUserIdsForPlayers(supabase, allPlayers)

  const allenatoriBySquadre = await getAllenatoriForSquadre(supabase, squadreIds)
  const staffRoles = await listStaffRolesByIds(supabase, staffIds)
  const allenatoriByStaff = staffRoles.filter(s => s.ruolo === 'allenatore').map(s => s.id)
  const mediciByStaff = staffRoles.filter(s => s.ruolo === 'medico').map(s => s.id)

  // Contesti con mapping diretto via `utenti.ruolo`
  const [pres, seg, tm] = await Promise.all([
    listUtentiByRole(supabase, event.club_id, 'presidente'),
    listUtentiByRole(supabase, event.club_id, 'segretario'),
    listUtentiByRole(supabase, event.club_id, 'team_manager'),
  ])

  const allenatori = uniq([...allenatoriBySquadre, ...allenatoriByStaff])
  const medici = event.tipologia === 'visita_medica'
    ? await listUtentiByRole(supabase, event.club_id, 'medico')
    : uniq(mediciByStaff)

  const ufficio = await listUtentiByRole(supabase, event.club_id, 'ufficio_stampa')

  return {
    presidente: pres,
    segretario: seg,
    team_manager: tm,
    allenatore: allenatori,
    medico: medici,
    giocatore: familyUserIds,
    famiglia: familyUserIds,
    ufficio_stampa: ufficio,
  } satisfies Record<CISContestoRuolo, string[]>
}

export async function generateScheduledNotificationsForEvent(
  supabase: SupabaseClient,
  eventId: string,
): Promise<{ inserted: number }> {
  const { data: event, error } = await supabase
    .from('eventi_calendario')
    .select('id, club_id, tipologia, priorita, data, data_ora_inizio, luogo_testo')
    .eq('id', eventId)
    .single()
  if (error || !event) throw new Error('Evento non trovato')

  const { data: parts } = await supabase
    .from('eventi_partecipanti')
    .select('tipo_partecipante, squadra_id, staff_id, giocatore_id')
    .eq('evento_id', eventId)

  await supabase.from('cis_notification_outbox').delete().eq('evento_id', eventId)

  const recipientsByContesto = await buildRecipients(supabase, event as any, parts ?? [])

  const tipologia = (event as any).tipologia as TipologiaEvento
  const priorita = (event as any).priorita as PrioritaEvento
  const startTime = (event as any).data_ora_inizio as string

  const anticipo = anticipoSlots(priorita)
  const luogo = (event as any).luogo_testo ? String((event as any).luogo_testo) : ''

  const titoloBase = `${TIPOL_LABEL[tipologia]}${luogo ? ` · ${luogo}` : ''}`

  const expandedRows: any[] = []
  for (const contesto of Object.keys(recipientsByContesto) as CISContestoRuolo[]) {
    const recipientIds = recipientsByContesto[contesto] ?? []
    if (recipientIds.length === 0) continue
    const canali = channelsForRole(contesto, tipologia, priorita)
    for (const recipientId of recipientIds) {
      for (const canale of canali) {
        for (const mins of anticipo) {
          const sendAt = new Date(new Date(startTime).getTime() - mins * 60_000).toISOString()

          expandedRows.push({
            club_id: (event as any).club_id,
            utente_id: recipientId,
            evento_id: eventId,
            contesto_ruolo: contesto,
            canale,
            priorita,
            anticipo_min: mins,
            send_at: sendAt,
            titolo: titoloBase,
            messaggio: `${titoloBase}. Priorità: ${priorita}.`,
            payload: {
              evento_id: eventId,
              tipologia,
              priorita,
              luogo_testo: luogo || null,
              data_ora_inizio: startTime,
              anticipo_min: mins,
            },
            azione_url: `/dashboard/team-manager/calendario`,
          })
        }
      }
    }
  }

  if (expandedRows.length > 0) {
    const { error: insErr } = await supabase.from('cis_notification_outbox').insert(expandedRows)
    if (insErr) throw insErr
  }

  return { inserted: expandedRows.length }
}

function escapeHtml(str: string) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function absoluteUrl(pathOrUrl: string) {
  if (!pathOrUrl) return ''
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  if (!base) return pathOrUrl
  return base.replace(/\/+$/, '') + '/' + pathOrUrl.replace(/^\/+/, '')
}

function renderCisEmailHtml({
  title,
  message,
  anticipoMin,
  startIso,
  actionUrl,
}: {
  title: string
  message: string
  anticipoMin: number | null
  startIso?: string | null
  actionUrl?: string | null
}) {
  const safeTitle = escapeHtml(title)
  const safeMsg = escapeHtml(message)
  const safeAction = escapeHtml(absoluteUrl(actionUrl ?? ''))
  const startText = startIso ? new Date(startIso).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' }) : null

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:22px;">
      <div style="background:#1d4ed8;color:#ffffff;padding:12px 16px;border-radius:12px;font-weight:800;">
        ClubIS — The Intelligence System
      </div>
      <div style="margin-top:18px;padding:18px;border:1px solid #e5e7eb;background:#ffffff;border-radius:14px;">
        <div style="font-size:18px;font-weight:800;color:#111827;line-height:1.3;">${safeTitle}</div>
        <div style="margin-top:10px;color:#374151;font-size:14px;line-height:1.6;">${safeMsg}</div>
        ${startText ? `<div style="margin-top:12px;color:#6b7280;font-size:12px;">Data e ora evento: ${escapeHtml(startText)}</div>` : ''}
        ${anticipoMin != null ? `<div style="margin-top:8px;color:#6b7280;font-size:12px;">Notifica inviata ${escapeHtml(String(anticipoMin))} minuti prima</div>` : ''}
        ${safeAction ? `<a href="${safeAction}" style="display:inline-block;margin-top:16px;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:700;">Apri in ClubIS</a>` : ''}
      </div>
      <div style="margin-top:14px;color:#9ca3af;font-size:11px;line-height:1.4;">
        Questa è una notifica automatica inviata dal sistema ClubIS.
      </div>
    </div>
  </body>
</html>`
}

async function sendEmailCis(supabase: SupabaseClient, entry: OutboxRow) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.CIS_EMAIL_FROM || process.env.RESEND_FROM
  if (!apiKey || !from) throw new Error(NOT_IMPLEMENTED)

  const { data: utente, error: utenteErr } = await supabase
    .from('utenti')
    .select('email')
    .eq('id', entry.utente_id)
    .single()
  if (utenteErr || !utente?.email) throw new Error('Email utente non trovata')

  const recipientEmail = utente.email as string

  const payload = entry.payload as any
  const startIso = payload?.data_ora_inizio ?? null

  const html = renderCisEmailHtml({
    title: entry.titolo,
    message: entry.messaggio,
    anticipoMin: entry.anticipo_min,
    startIso,
    actionUrl: entry.azione_url,
  })

  const subject = `ClubIS: ${entry.titolo}`

  const resend = new Resend(apiKey)
  await resend.emails.send({
    from,
    to: recipientEmail,
    subject,
    html,
  })
}

async function sendPushCis(supabase: SupabaseClient, entry: OutboxRow) {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:cis@localhost'

  if (!vapidPublicKey || !vapidPrivateKey) throw new Error(NOT_IMPLEMENTED)

  const { data: subs, error } = await supabase
    .from('cis_push_subscriptions')
    .select('endpoint,p256dh,auth')
    .eq('utente_id', entry.utente_id)

  if (error) throw new Error(error.message)
  const subscriptions = (subs ?? []).map(s => ({
    endpoint: s.endpoint,
    keys: {
      p256dh: s.p256dh,
      auth: s.auth,
    },
  }))

  if (subscriptions.length === 0) return

  webPush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey)

  const payload = {
    title: entry.titolo,
    body: entry.messaggio,
    url: entry.azione_url ?? '/dashboard/notifiche',
    data: entry.payload ?? null,
  }

  for (const sub of subscriptions) {
    await webPush.sendNotification(sub as any, JSON.stringify(payload))
  }
}

export async function dispatchDueNotificationsForUser(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<{ internalInserted: number }> {
  const nowIso = now.toISOString()
  const dayStart = startOfDay(now)
  const dayEnd = endOfDay(now)

  const { data: outboxRows, error } = await supabase
    .from('cis_notification_outbox')
    .select('*')
    .eq('utente_id', userId)
    .eq('stato', 'queued')
    .lte('send_at', nowIso)
    .order('send_at', { ascending: true })

  if (error) throw new Error(error.message)
  const due = (outboxRows ?? []) as OutboxRow[]

  if (due.length === 0) return { internalInserted: 0 }

  const { data: prefsRows } = await supabase
    .from('cis_notification_preferences')
    .select('*')
    .eq('utente_id', userId)

  const prefsByContesto = new Map<CISContestoRuolo, PreferencesRow>()
  for (const p of (prefsRows ?? []) as any[]) {
    prefsByContesto.set(p.contesto_ruolo as CISContestoRuolo, p as any)
  }

  const { data: sentTodayRows } = await supabase
    .from('cis_notification_outbox')
    .select('contesto_ruolo,canale,send_at')
    .eq('utente_id', userId)
    .eq('stato', 'sent')
    .gte('send_at', dayStart.toISOString())
    .lte('send_at', dayEnd.toISOString())

  const sentDailyKeys = new Set<string>()
  for (const r of (sentTodayRows ?? []) as any[]) {
    sentDailyKeys.add(`${r.contesto_ruolo}:${r.canale}`)
  }

  let internalInserted = 0

  for (const entry of due) {
    const pref = prefsByContesto.get(entry.contesto_ruolo) ?? {
      canale_push_enabled: true,
      canale_email_enabled: true,
      canale_interna_enabled: true,
      frequenza_interna: 'immediata' as CISFrequenza,
      frequenza_email: 'immediata' as CISFrequenza,
    }

    const nowPrefOk =
      entry.canale === 'push' ? pref.canale_push_enabled :
      entry.canale === 'email' ? pref.canale_email_enabled :
      pref.canale_interna_enabled

    if (!nowPrefOk) {
      await supabase.from('cis_notification_outbox').update({ stato: 'sent', sent_at: nowIso }).eq('id', entry.id)
      continue
    }

    const isDaily =
      entry.canale === 'notifica_interna'
        ? pref.frequenza_interna === 'giornaliera'
        : entry.canale === 'email'
          ? pref.frequenza_email === 'giornaliera'
          : false
    const dailyKey = `${entry.contesto_ruolo}:${entry.canale}`

    if (isDaily && sentDailyKeys.has(dailyKey)) {
      await supabase.from('cis_notification_outbox').update({ stato: 'sent', sent_at: nowIso }).eq('id', entry.id)
      continue
    }

    if (entry.canale === 'notifica_interna') {
      const { error: insErr } = await supabase.from('notifiche_sistema').insert({
        club_id:            entry.club_id,
        destinatario_id:    userId,
        ruolo_destinatario: entry.contesto_ruolo,
        tipo:               'alert_sistema',
        riferimento_id:     entry.evento_id,
        titolo:             entry.titolo,
        messaggio:          entry.messaggio,
        azione_url:         entry.azione_url ?? null,
        letta:              false,
      })
      if (insErr) {
        await supabase.from('cis_notification_outbox').update({ stato: 'failed' }).eq('id', entry.id)
        continue
      }

      await supabase.from('cis_notification_outbox').update({ stato: 'sent', sent_at: nowIso }).eq('id', entry.id)
      internalInserted++
      sentDailyKeys.add(dailyKey)
      continue
    }

    // Email / Push
    try {
      if (entry.canale === 'email') {
        await sendEmailCis(supabase, entry)
      } else if (entry.canale === 'push') {
        await sendPushCis(supabase, entry)
      }

      await supabase.from('cis_notification_outbox').update({ stato: 'sent', sent_at: nowIso }).eq('id', entry.id)
      sentDailyKeys.add(dailyKey)
    } catch (e: any) {
      if (e?.message === NOT_IMPLEMENTED) {
        // Lasciamo l'outbox in `queued` finché email/push non saranno implementati.
        continue
      }
      await supabase.from('cis_notification_outbox').update({ stato: 'failed' }).eq('id', entry.id)
    }
  }

  return { internalInserted }
}

export async function getInternalNotificationCountForUser(
  supabase: SupabaseClient,
  userId: string,
  clubId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('notifiche_sistema')
    .select('*', { count: 'exact', head: true })
    .eq('destinatario_id', userId)
    .eq('club_id', clubId)
    .eq('letta', false)

  if (error) throw new Error(error.message)
  return count ?? 0
}

