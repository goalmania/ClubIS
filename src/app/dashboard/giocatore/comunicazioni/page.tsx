'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const TIPO_BADGE: Record<string, string> = {
  comunicazione: 'badge-blu',
  convocazione:  'badge-verde',
  avviso:        'badge-rosso',
  alert_tecnico: 'badge-grigio',
}

export default function ComunicazioniGiocatorePage() {
  const supabase = useMemo(() => createClient(), [])
  const [messaggi, setMessaggi] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) { window.location.href = '/auth/login'; return }

      const { data: utente } = await supabase
        .from('utenti').select('club_id').eq('id', user.id).single()
      if (!utente) { window.location.href = '/auth/errore'; return }

      const { data: mm } = await supabase
        .from('messaggi')
        .select('id, titolo, corpo, tipo, inviato_at, destinatari_ruolo, mittente_id, utenti(nome, cognome)')
        .eq('club_id', utente.club_id)
        .order('inviato_at', { ascending: false })
        .limit(60)

      // Mostra: messaggi per tutti, per ruolo giocatore, o destinati esplicitamente all'utente
      const visibili = (mm ?? []).filter((m: any) => {
        const ruoli: string[] = Array.isArray(m.destinatari_ruolo)
          ? m.destinatari_ruolo
          : m.destinatari_ruolo
            ? JSON.parse(m.destinatari_ruolo)
            : []
        // "tutti" = nessun ruolo specificato
        if (ruoli.length === 0) return true
        if (ruoli.includes('giocatore')) return true
        return false
      })

      setMessaggi(visibili)
      setLoading(false)

      // Marca come letti
      if (visibili.length > 0) {
        await supabase.from('messaggi_letture').upsert(
          visibili.map((m: any) => ({ messaggio_id: m.id, utente_id: user.id })),
          { onConflict: 'messaggio_id,utente_id' },
        )
      }
    }
    load()
  }, [supabase])

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
          Comunicazioni
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Messaggi dal club
        </p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Caricamento...</div>
        ) : messaggi.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nessuna comunicazione</div>
        ) : messaggi.map((m: any) => {
          const mitt = m.utenti as any
          return (
            <div key={m.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>
                  {mitt?.nome?.[0]}{mitt?.cognome?.[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{m.titolo}</span>
                    <span className={`badge ${TIPO_BADGE[m.tipo] ?? 'badge-grigio'}`} style={{ fontSize: 10 }}>{m.tipo}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 4 }}>
                    {m.corpo?.slice(0, 200)}{m.corpo?.length > 200 ? '…' : ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {mitt?.nome} {mitt?.cognome} ·{' '}
                    {new Date(m.inviato_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 20 }}>
        <Link href="/dashboard/giocatore" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>
    </div>
  )
}
