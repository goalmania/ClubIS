'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatData, formatOra, formatEuro } from '@/lib/helpers'
import Link from 'next/link'

export default function GiocatoreDashboard() {
  // Stable client ref — never recreated on re-render
  const supabase = useRef(createClient()).current

  const [stato, setStato]       = useState<'loading' | 'ok' | 'demo' | 'errore'>('loading')
  const [giocatore, setGiocatore] = useState<any>(null)
  const [presenze, setPresenze]  = useState<{ tot: number; presenti: number }>({ tot: 0, presenti: 0 })
  const [prossimi, setProssimi]  = useState<any[]>([])
  const [quote, setQuote]        = useState<any[]>([])
  const [convocazioni, setConv]  = useState<any[]>([])

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStato('errore'); return }

      // Trova il giocatore collegato all'auth user (può essere null in impersonation)
      const { data: g } = await supabase
        .from('giocatori')
        .select('id, nome, cognome, data_nascita, ruolo_principale, codice_tessera_figc, club_id, citta, foto_url')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (!mounted) return

      if (!g) {
        // Super admin in impersonation: nessun giocatore collegato → modalità demo
        setStato('demo')
        return
      }

      setGiocatore(g)

      // Carica dati in parallelo con le colonne/tabelle corrette
      const [presRes, partRes, quoteRes, convRes] = await Promise.allSettled([
        // Presenze: conta le sessioni dove il giocatore risulta presente
        supabase
          .from('presenze')
          .select('presente')
          .eq('giocatore_id', g.id)
          .limit(40),

        // Prossime partite: la colonna si chiama data_ora, non data_partita
        supabase
          .from('partite')
          .select('id, avversario, data_ora, tipo, casa_trasferta, stato')
          .eq('club_id', g.club_id)
          .gte('data_ora', new Date().toISOString())
          .order('data_ora')
          .limit(5),

        // Quote iscrizione
        supabase
          .from('quote_iscrizione')
          .select('stagione, importo_totale, importo_pagato, stato')
          .eq('giocatore_id', g.id)
          .order('stagione', { ascending: false })
          .limit(3),

        // Convocazioni con join partite (colonna stato_risposta, non stato)
        supabase
          .from('convocazioni')
          .select('stato_risposta, partite(avversario, data_ora, tipo)')
          .eq('giocatore_id', g.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      if (!mounted) return

      if (presRes.status === 'fulfilled' && presRes.value.data) {
        const d = presRes.value.data
        setPresenze({ tot: d.length, presenti: d.filter((p: any) => p.presente).length })
      }
      if (partRes.status === 'fulfilled') setProssimi((partRes.value as any).data ?? [])
      if (quoteRes.status === 'fulfilled') setQuote((quoteRes.value as any).data ?? [])
      if (convRes.status === 'fulfilled') setConv((convRes.value as any).data ?? [])

      setStato('ok')
    }

    load()
    return () => { mounted = false }
  }, [supabase])

  /* ── Loading ───────────────────────────────────────────────────── */
  if (stato === 'loading') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--gray)' }}>
      Caricamento...
    </div>
  )

  /* ── Modalità demo (admin in impersonation senza giocatore reale) ─ */
  if (stato === 'demo') return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🎽</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, textTransform: 'uppercase', color: 'var(--white)', marginBottom: 8 }}>
        Anteprima area giocatore
      </div>
      <div style={{ fontSize: 13, color: 'var(--gray)', maxWidth: 360, margin: '0 auto' }}>
        Stai visualizzando la dashboard come ruolo <strong style={{ color: 'var(--white)' }}>Giocatore</strong>.
        Per vedere dati reali occorre selezionare un account giocatore con profilo atleta collegato.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginTop: 32, maxWidth: 520, margin: '32px auto 0' }}>
        {[
          { href: '/dashboard/giocatore/allenamenti', label: 'Allenamenti', icon: '🏋️' },
          { href: '/dashboard/giocatore/convocazioni', label: 'Convocazioni', icon: '📋' },
          { href: '/dashboard/giocatore/partite', label: 'Partite', icon: '🏟️' },
          { href: '/dashboard/giocatore/statistiche', label: 'Statistiche', icon: '📊' },
          { href: '/dashboard/giocatore/valutazioni', label: 'Valutazioni', icon: '⭐' },
          { href: '/dashboard/giocatore/pagamenti', label: 'Pagamenti', icon: '💰' },
          { href: '/dashboard/giocatore/comunicazioni', label: 'Comunicazioni', icon: '💬' },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            padding: '16px 12px', background: '#111', border: '1px solid var(--border-solid)',
            borderRadius: 2, color: 'var(--white)', textDecoration: 'none', fontSize: 12, fontWeight: 600,
          }}>
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  )

  /* ── Errore generico ───────────────────────────────────────────── */
  if (stato === 'errore') return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, textTransform: 'uppercase', color: 'var(--white)', marginBottom: 8 }}>
        Sessione scaduta
      </div>
      <div style={{ fontSize: 13, color: 'var(--gray)' }}>
        Effettua di nuovo il login per continuare.
      </div>
    </div>
  )

  /* ── Dashboard normale ─────────────────────────────────────────── */
  const percPresenze = presenze.tot > 0 ? Math.round((presenze.presenti / presenze.tot) * 100) : 0
  const quotaAttiva  = quote[0]

  return (
    <div>
      {/* Header atleta */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32,
        padding: '20px 24px', background: '#111',
        border: '1px solid var(--border-solid)', borderRadius: 2,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 2, background: 'var(--gray-mid)',
          border: '1px solid var(--border-solid)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, overflow: 'hidden',
        }}>
          {giocatore.foto_url
            ? <img src={giocatore.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '⚽'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22,
            textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)', marginBottom: 4,
          }}>
            {giocatore.cognome} {giocatore.nome}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {giocatore.ruolo_principale && (
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {giocatore.ruolo_principale.replace(/_/g, ' ')}
              </span>
            )}
            {giocatore.codice_tessera_figc && (
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--gray)', letterSpacing: '0.08em' }}>
                Tessera: {giocatore.codice_tessera_figc}
              </span>
            )}
            {giocatore.data_nascita && (
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--gray)' }}>
                Nato il {formatData(giocatore.data_nascita)}
              </span>
            )}
          </div>
        </div>

        {/* Link rapidi */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Link href="/dashboard/giocatore/allenamenti" style={linkBtn}>📋 Allenamenti</Link>
          <Link href="/dashboard/giocatore/partite"     style={linkBtn}>🏟️ Partite</Link>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard icona="📅" label="Presenze allenamenti" value={`${presenze.presenti} / ${presenze.tot}`} sub={`${percPresenze}% di partecipazione`} />
        <StatCard icona="🏟️" label="Prossime gare"        value={String(prossimi.length)}                  sub="in programma" />
        <StatCard icona="💰" label="Quota stagionale"      value={quotaAttiva ? formatEuro(Number(quotaAttiva.importo_pagato)) : '—'} sub={quotaAttiva ? `su ${formatEuro(Number(quotaAttiva.importo_totale))}` : 'Nessuna quota'} />
        <StatCard icona="📋" label="Convocazioni"          value={String(convocazioni.length)}              sub="ultime registrate" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Prossime gare */}
        <div style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={cardHeader}>Prossime gare</div>
          {prossimi.length === 0
            ? <div style={emptyRow}>Nessuna gara programmata</div>
            : prossimi.map((p: any) => (
                <div key={p.id} style={{ padding: '10px 18px', borderBottom: '1px solid var(--border-solid)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--white)', fontWeight: 600 }}>{p.avversario}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      {formatData(p.data_ora)} {formatOra(p.data_ora)} · {p.casa_trasferta === 'casa' ? 'Casa' : 'Trasferta'}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(200,240,0,0.1)', color: 'var(--accent)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                    {p.tipo}
                  </span>
                </div>
              ))}
        </div>

        {/* Quote */}
        <div style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={cardHeader}>Situazione pagamenti</div>
          {quote.length === 0
            ? <div style={emptyRow}>Nessuna quota registrata</div>
            : quote.map((q: any, i: number) => {
                const perc   = q.importo_totale > 0 ? Math.round((q.importo_pagato / q.importo_totale) * 100) : 0
                const colore = q.stato === 'pagato' ? '#00c8a0' : q.stato === 'parziale' ? 'var(--ambra)' : '#ff6060'
                return (
                  <div key={i} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-solid)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--white)', fontWeight: 600 }}>Stagione {q.stagione}</span>
                      <span style={{ fontSize: 11, color: colore, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{q.stato}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--gray-mid)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${perc}%`, background: colore, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--gray)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      {formatEuro(Number(q.importo_pagato))} / {formatEuro(Number(q.importo_totale))}
                    </div>
                  </div>
                )
              })}
        </div>
      </div>

      {/* Ultime convocazioni */}
      {convocazioni.length > 0 && (
        <div style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={cardHeader}>Ultime convocazioni</div>
          {convocazioni.map((c: any, i: number) => {
            const p       = c.partite
            const colore  = c.stato_risposta === 'confermato' ? '#00c8a0' : c.stato_risposta === 'in_attesa' ? 'var(--ambra)' : '#ff6060'
            return (
              <div key={i} style={{ padding: '10px 18px', borderBottom: '1px solid var(--border-solid)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--white)', fontWeight: 600 }}>{p?.avversario ?? '—'}</div>
                  {p?.data_ora && (
                    <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      {formatData(p.data_ora)}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 10, padding: '2px 8px', color: colore, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', border: `1px solid ${colore}`, borderRadius: 2 }}>
                  {c.stato_risposta ?? 'in_attesa'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Styles ─────────────────────────────────────────────────────── */
const cardHeader: React.CSSProperties = {
  padding: '14px 18px', borderBottom: '1px solid var(--border-solid)',
  fontFamily: 'var(--font-display)', fontWeight: 700,
  textTransform: 'uppercase', fontSize: 13, color: 'var(--white)',
}
const emptyRow: React.CSSProperties = {
  padding: '24px 18px', fontSize: 12, color: 'var(--gray)',
}
const linkBtn: React.CSSProperties = {
  padding: '6px 12px', background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--border-solid)', borderRadius: 2,
  color: 'var(--white)', textDecoration: 'none', fontSize: 11,
  fontWeight: 600, whiteSpace: 'nowrap',
}

function StatCard({ icona, label, value, sub }: { icona: string; label: string; value: string; sub: string }) {
  return (
    <div style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, padding: '16px 18px' }}>
      <div style={{ fontSize: 20, marginBottom: 8 }}>{icona}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: 'var(--white)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>{sub}</div>
    </div>
  )
}
