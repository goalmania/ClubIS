'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Toast } from '@/components/ui'

type Messaggio = {
  id: string
  titolo: string
  corpo: string
  tipo: string
  destinatari_ruolo: string[] | null
  inviato_at: string
  thread_id?: string | null
}

export default function TMComunicazioniPage() {
  const supabase = useMemo(() => createClient(), [])
  const [clubId, setClubId] = useState('')
  const [userId, setUserId] = useState('')
  const [messaggi, setMessaggi] = useState<Messaggio[]>([])
  const [utenti, setUtenti] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [threadFilter, setThreadFilter] = useState<string>('all')

  const [form, setForm] = useState({
    titolo: '',
    corpo: '',
    destinatariRuolo: [] as string[],
    destinatariUtenteIds: [] as string[],
    tipo: 'comunicazione',
  })

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) {
        window.location.href = '/auth/login'
        return
      }
      setUserId(user.id)

      const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
      if (!utente) {
        window.location.href = '/auth/errore'
        return
      }

      setClubId(utente.club_id)
      const [{ data: mm }, { data: uu }] = await Promise.all([
        supabase
          .from('messaggi')
          .select('id, titolo, corpo, tipo, destinatari_ruolo, inviato_at, thread_id')
          .eq('club_id', utente.club_id)
          .order('inviato_at', { ascending: false })
          .limit(60),
        supabase.from('utenti').select('id, nome, cognome, ruolo').eq('club_id', utente.club_id).eq('attivo', true),
      ])
      setMessaggi((mm ?? []) as Messaggio[])
      setUtenti(uu ?? [])
      setLoading(false)
    }
    load()
  }, [supabase])

  const tipoBadge: Record<string, string> = {
    comunicazione: 'badge-blu',
    convocazione: 'badge-verde',
    avviso: 'badge-rosso',
    alert_tecnico: 'badge-grigio',
  }

  const toggleArrayValue = (v: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(v) ? list.filter(x => x !== v) : [...list, v])
  }

  const inviaMessaggio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titolo.trim() || !form.corpo.trim()) {
      setToast({ msg: 'Compila oggetto e corpo', tipo: 'error' })
      return
    }
    setSaving(true)
    const threadId = crypto.randomUUID()
    const destinatariRuolo = form.destinatariRuolo.length > 0 ? form.destinatariRuolo : null

    const payload: any = {
      club_id: clubId,
      mittente_id: userId,
      titolo: form.titolo.trim(),
      corpo: form.corpo.trim(),
      tipo: form.tipo,
      destinatari_ruolo: destinatariRuolo,
      destinatari_utente_ids: form.destinatariUtenteIds,
      destinatari: {
        ruoli: form.destinatariRuolo,
        utenti: form.destinatariUtenteIds,
      },
      thread_id: threadId,
      inviato_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from('messaggi').insert(payload).select('*').single()
    if (error || !data) {
      setSaving(false)
      setToast({ msg: error?.message ?? 'Errore invio messaggio', tipo: 'error' })
      return
    }

    const recipientIds = utenti
      .filter(u =>
        form.destinatariUtenteIds.includes(u.id) ||
        (form.destinatariRuolo.length === 0 ? true : form.destinatariRuolo.includes(u.ruolo)),
      )
      .map(u => u.id)

    if (recipientIds.length > 0) {
      await supabase.from('notifiche_sistema').insert(
        recipientIds.map(id => {
          const dest = utenti.find(u => u.id === id)
          return {
            club_id:            clubId,
            destinatario_id:    id,
            ruolo_destinatario: dest?.ruolo ?? null,
            tipo:               'messaggio',
            titolo:             `Nuovo messaggio: ${form.titolo.trim()}`,
            messaggio:          form.corpo.trim().slice(0, 220),
            azione_url:         '/dashboard/team-manager/comunicazioni',
            letta:              false,
          }
        }),
      )
    }

    setMessaggi(prev => [data as Messaggio, ...prev])
    setForm({ titolo: '', corpo: '', destinatariRuolo: [], destinatariUtenteIds: [], tipo: 'comunicazione' })
    setShowForm(false)
    setSaving(false)
    setToast({ msg: 'Messaggio inviato e notifiche interne create', tipo: 'success' })
  }

  const groupedByThread = messaggi.reduce((acc, m) => {
    const key = m.thread_id ?? m.id
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {} as Record<string, Messaggio[]>)

  const threadKeys = Object.keys(groupedByThread).sort((a, b) => {
    const da = groupedByThread[a][0]?.inviato_at ?? ''
    const db = groupedByThread[b][0]?.inviato_at ?? ''
    return da > db ? -1 : 1
  })

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Comunicazioni</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Messaggi a squadra, famiglie e staff</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>+ Nuovo messaggio</button>
      </div>

      {showForm && (
        <form className="card" style={{ marginBottom: 16, padding: 16 }} onSubmit={inviaMessaggio}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>Oggetto</label>
              <input className="input" value={form.titolo} onChange={e => setForm(v => ({ ...v, titolo: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select className="input" value={form.tipo} onChange={e => setForm(v => ({ ...v, tipo: e.target.value }))}>
                <option value="comunicazione">comunicazione</option>
                <option value="avviso">avviso</option>
                <option value="convocazione">convocazione</option>
                <option value="alert_tecnico">alert tecnico</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Corpo messaggio (rich text base)</label>
            <textarea className="input" rows={5} value={form.corpo} onChange={e => setForm(v => ({ ...v, corpo: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Destinatari per ruolo</label>
              <div className="card" style={{ padding: 10, maxHeight: 140, overflow: 'auto' }}>
                {['presidente', 'segretario', 'team_manager', 'allenatore', 'medico', 'famiglia'].map(r => (
                  <label key={r} style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={form.destinatariRuolo.includes(r)}
                      onChange={() => toggleArrayValue(r, form.destinatariRuolo, next => setForm(v => ({ ...v, destinatariRuolo: next })))}
                    />{' '}
                    {r}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Destinatari singoli</label>
              <div className="card" style={{ padding: 10, maxHeight: 140, overflow: 'auto' }}>
                {utenti.map(u => (
                  <label key={u.id} style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={form.destinatariUtenteIds.includes(u.id)}
                      onChange={() => toggleArrayValue(u.id, form.destinatariUtenteIds, next => setForm(v => ({ ...v, destinatariUtenteIds: next })))}
                    />{' '}
                    {u.cognome} {u.nome} ({u.ruolo})
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
              {saving ? 'Invio...' : 'Invia'}
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className={`btn btn-sm ${threadFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setThreadFilter('all')}>Tutti i thread</button>
        {threadKeys.slice(0, 5).map(k => (
          <button key={k} className={`btn btn-sm ${threadFilter === k ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setThreadFilter(k)}>
            Thread {k.slice(0, 4)}
          </button>
        ))}
      </div>

      {(loading || !messaggi || messaggi.length === 0) ? (
        <div className="card" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          {loading ? 'Caricamento...' : 'Nessun messaggio inviato'}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {threadKeys
            .filter(k => threadFilter === 'all' || threadFilter === k)
            .map(k => (
              <div key={k} style={{ borderBottom: '1px solid var(--border)' }}>
                <div style={{ padding: '10px 16px', background: 'var(--bg-input)', fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
                  Thread {k}
                </div>
                {groupedByThread[k].map(m => (
                  <div key={m.id} style={{ padding: '14px 18px', borderTop: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className={`badge ${tipoBadge[m.tipo] ?? 'badge-grigio'}`}>{m.tipo}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{m.titolo}</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(m.inviato_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {m.corpo && <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 4 }}>{m.corpo.slice(0, 180)}{m.corpo.length > 180 ? '…' : ''}</div>}
                    {m.destinatari_ruolo && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Destinatari: {Array.isArray(m.destinatari_ruolo) ? m.destinatari_ruolo.join(', ') : m.destinatari_ruolo}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <Link href="/dashboard/team-manager" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 4,
  textTransform: 'uppercase',
}
