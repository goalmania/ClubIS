import { Resend } from 'resend'

/**
 * Avvisa l'amministratore della piattaforma quando un nuovo club avvia la prova gratuita.
 * Destinatario: CIS_ADMIN_NOTIFY_EMAIL (più indirizzi separati da virgola), altrimenti l'email di Paolo.
 * Non lancia mai errori: se l'invio fallisce la registrazione resta valida.
 */
export type DatiNuovaProva = {
  nome: string
  cognome: string
  email: string
  club_nome: string
  club_categoria?: string | null
  piano?: string | null
  origine: 'clubis.it/registrati' | 'dmfootballservices (api/trial/start)'
  trial_ends_at: string
  club_id?: string | null
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export async function notificaNuovaProva(d: DatiNuovaProva): Promise<void> {
  try {
    const key = process.env.RESEND_API_KEY
    if (!key) {
      console.warn('[nuova-prova] RESEND_API_KEY assente, notifica non inviata')
      return
    }
    const to = (process.env.CIS_ADMIN_NOTIFY_EMAIL ?? 'dimuropaolo77@gmail.com')
      .split(',').map((s) => s.trim()).filter(Boolean)

    const scade = new Date(d.trial_ends_at).toLocaleDateString('it-IT', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome',
    })
    const quando = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })

    const righe: [string, string][] = [
      ['Nome', `${d.nome} ${d.cognome}`],
      ['Email', d.email],
      ['Club', d.club_nome],
      ['Categoria', d.club_categoria ?? '—'],
      ['Piano scelto', d.piano ?? '—'],
      ['Provenienza', d.origine],
      ['Registrato il', quando],
      ['Prova fino al', scade],
    ]

    const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px">
        <h2 style="margin:0 0 12px">Nuova prova gratuita ClubIS</h2>
        <table style="border-collapse:collapse;width:100%">
          ${righe.map(([k, v]) => `<tr>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#666;white-space:nowrap">${esc(k)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee"><b>${esc(v)}</b></td>
          </tr>`).join('')}
        </table>
        <p style="margin-top:16px">
          <a href="mailto:${esc(d.email)}?subject=${encodeURIComponent('Benvenuto su ClubIS')}">Scrivi a ${esc(d.nome)}</a>
        </p>
        ${d.club_id ? `<p style="color:#999;font-size:12px">club_id: ${esc(d.club_id)}</p>` : ''}
      </div>`

    const text = righe.map(([k, v]) => `${k}: ${v}`).join('\n')

    const resend = new Resend(key)
    const { error } = await resend.emails.send({
      from: process.env.CIS_EMAIL_FROM ?? 'noreply@clubis.it',
      to,
      replyTo: d.email,
      subject: `🆕 Nuova prova ClubIS: ${d.club_nome} (${d.nome} ${d.cognome})`,
      html,
      text,
    })
    if (error) console.error('[nuova-prova] invio fallito', error)
  } catch (e) {
    console.error('[nuova-prova] errore', e)
  }
}
