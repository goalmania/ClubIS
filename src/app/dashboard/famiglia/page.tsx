'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatData, formatEuro } from '@/lib/helpers'
import Link from 'next/link'
import AzioniRapide from '@/components/ui/AzioniRapide'

export default function FamigliaDashboard() {
  // Stable client ref — never recreated on re-render
  const supabase = useRef(createClient()).current
  const [stato, setStato] = useState<'loading' | 'ok' | 'no_giocatore' | 'errore'>('loading')
  const [giocatore, setGiocatore] = useState<any>(null)
  const [familiaNome, setFamiliaNome] = useState<string>('')
  const [quota, setQuota] = useState<any>(null)
  const [presenze, setPresenze] = useState<{ tot: number; presenti: number }>({ tot: 0, presenti: 0 })
  const [valutazioni, setValutazioni] = useState<any[]>([])
  const [prossimi, setProssimi] = useState<any[]>([])
  const [messaggi, setMessaggi] = useState<any[]>([])

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !mounted) return

        // Cerca l'utente in tabella utenti
        const { data: utente } = await supabase
          .from('utenti')
          .select('club_id, ruolo')
          .eq('id', user.id)
          .maybeSingle()

        // Cerca il collegamento famiglia→giocatore
        const { data: fam } = await supabase
          .from('famiglie')
          .select('giocatore_id, nome, cognome, email')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        let giocatoreId: string | null = fam?.giocatore_id ?? null
        let clubId: string | null = utente?.club_id ?? null

        if (fam?.nome) setFamiliaNome(fam.nome)

        // Se abbiamo giocatoreId ma non clubId, trovalo dal tesseramento
        if (giocatoreId && !clubId) {
          const { data: tess } = await supabase
            .from('tesseramenti')
            .select('club_id')
            .eq('giocatore_id', giocatoreId)
            .eq('stato', 'attivo')
            .maybeSingle()
          clubId = tess?.club_id ?? null
        }

        // Se nessun collegamento trovato, mostra stato no_giocatore
        if (!giocatoreId) {
          // Ultimo tentativo: cerca in famiglie via email
          const { data: famByEmail } = await supabase
            .from('famiglie')
            .select('giocatore_id, nome, cognome')
            .eq('email', user.email ?? '')
            .maybeSingle()

          if (famByEmail?.giocatore_id) {
            giocatoreId = famByEmail.giocatore_id
            if (famByEmail.nome) setFamiliaNome(famByEmail.nome)
          } else {
            if (mounted) setStato('no_giocatore')
            return
          }
        }

        // Carica dati giocatore
        const { data: g } = await supabase
          .from('giocatori')
          .select('id, nome, cognome, data_nascita, ruolo_principale, foto_url')
          .eq('id', giocatoreId)
          .maybeSingle()

        if (!g || !mounted) {
          setStato('no_giocatore')
          return
        }
        setGiocatore(g)

        // Carica tutto in parallelo con gestione errori individuale
        const [quotaRes, presenzeRes, valRes, prossimiRes, msgRes] = await Promise.allSettled([
          // Quota più recente
          supabase.from('quote_iscrizione')
            .select('importo_totale, importo_pagato, stato, scadenza')
            .eq('giocatore_id', giocatoreId)
            .order('created_at', { ascending: false })
            .limit(1),

          // Presenze ultimi 30 giorni
          supabase.from('presenze')
            .select('presente')
            .eq('giocatore_id', giocatoreId)
            .gte('registrato_at', new Date(Date.now() - 30 * 86400000).toISOString()),

          // Valutazioni visibili alla famiglia
          supabase.from('valutazioni_tecniche')
            .select('data, tecnica, tattica, fisico, mentale, note')
            .eq('giocatore_id', giocatoreId)
            .eq('visibile_famiglia', true)
            .order('data', { ascending: false })
            .limit(3),

          // Prossime partite del club
          clubId
            ? supabase.from('partite')
                .select('id, avversario, data_ora, casa_trasferta')
                .eq('club_id', clubId)
                .gte('data_ora', new Date().toISOString())
                .eq('stato', 'programmata')
                .order('data_ora')
                .limit(3)
            : Promise.resolve({ data: [] }),

          // Messaggi recenti del club
          clubId
            ? supabase.from('messaggi')
                .select('id, titolo, tipo, inviato_at')
                .eq('club_id', clubId)
                .order('inviato_at', { ascending: false })
                .limit(4)
            : Promise.resolve({ data: [] }),
        ])

        if (!mounted) return

        if (quotaRes.status === 'fulfilled') {
          const data = (quotaRes.value as any).data
          setQuota(data?.[0] ?? null)
        }
        if (presenzeRes.status === 'fulfilled') {
          const pres = (presenzeRes.value as any).data ?? []
          setPresenze({ tot: pres.length, presenti: pres.filter((p: any) => p.presente).length })
        }
        if (valRes.status === 'fulfilled') setValutazioni((valRes.value as any).data ?? [])
        if (prossimiRes.status === 'fulfilled') setProssimi((prossimiRes.value as any).data ?? [])
        if (msgRes.status === 'fulfilled') setMessaggi((msgRes.value as any).data ?? [])

        setStato('ok')

      } catch (e) {
        console.error('Errore dashboard famiglia:', e)
        if (mounted) setStato('errore')
      }
    }

    load()
    return () => { mounted = false }
  }, [supabase])

  /* ─── Loading ─────────────────────────────────────────────── */
  if (stato === 'loading') return (
    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--gray)' }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
        letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12,
      }}>
        Caricamento...
      </div>
    </div>
  )

  /* ─── No giocatore (o admin in modalità anteprima) ───────── */
  if (stato === 'no_giocatore') return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>👨‍👩‍👧</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: 16, textTransform: 'uppercase', color: 'var(--white)', marginBottom: 8,
      }}>
        Anteprima area famiglia
      </div>
      <div style={{ fontSize: 13, color: 'var(--gray)', maxWidth: 380, margin: '0 auto 28px' }}>
        Stai visualizzando la dashboard come ruolo <strong style={{ color: 'var(--white)' }}>Famiglia</strong>.
        Nessun giocatore è collegato a questo account — i dati reali si vedono solo con un account famiglia registrato.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, maxWidth: 480, margin: '0 auto' }}>
        {[
          { href: '/dashboard/famiglia/calendario',   label: 'Calendario',  icon: '📅' },
          { href: '/dashboard/famiglia/sviluppo',     label: 'Progressi',   icon: '⭐' },
          { href: '/dashboard/famiglia/pagamenti',    label: 'Pagamenti',   icon: '💶' },
          { href: '/dashboard/famiglia/messaggi',     label: 'Bacheca',     icon: '✉️' },
          { href: '/dashboard/famiglia/comunicazioni',label: 'Comunicazioni',icon: '💬' },
          { href: '/dashboard/famiglia/profilo',      label: 'Profilo',     icon: '👤' },
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

  /* ─── Errore ──────────────────────────────────────────────── */
  if (stato === 'errore') return (
    <div style={{ maxWidth: 500, margin: '60px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 900,
        fontSize: 22, textTransform: 'uppercase', color: 'var(--rosso)',
        marginBottom: 8,
      }}>
        Errore di caricamento
      </div>
      <p style={{ fontSize: 14, color: 'var(--gray)', marginBottom: 20 }}>
        Si è verificato un errore. Riprova tra qualche momento.
      </p>
      <button className="btn btn-secondary" onClick={() => window.location.reload()}>
        Riprova
      </button>
    </div>
  )

  /* ─── Dashboard ───────────────────────────────────────────── */
  const percPresenze = presenze.tot > 0
    ? Math.round(presenze.presenti / presenze.tot * 100) : null

  const quotaPendente = quota && quota.stato !== 'pagato'
  const totDaPagare = quotaPendente
    ? Number(quota.importo_totale) - Number(quota.importo_pagato) : 0

  const statoQuotaColore: Record<string, string> = {
    pagato: 'var(--accent)', parziale: 'var(--ambra)',
    non_pagato: 'var(--rosso)', esonerato: 'var(--gray)',
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)',
        }}>
          {familiaNome ? `Ciao, ${familiaNome}` : 'Area Famiglia'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--gray)', marginTop: 4 }}>
          {giocatore?.nome} {giocatore?.cognome} —{' '}
          {giocatore?.ruolo_principale?.replace(/_/g, ' ') ?? 'Giocatore'}
          {giocatore?.data_nascita && ` · ${new Date().getFullYear() - new Date(giocatore.data_nascita).getFullYear()} anni`}
        </p>
      </div>

      <AzioniRapide ruolo="famiglia" />

      {/* Alert pagamenti */}
      {totDaPagare > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>
            💳 Quota in sospeso: <strong>{formatEuro(totDaPagare)}</strong>
            {quota?.scadenza && ` — scade il ${formatData(quota.scadenza)}`}
          </span>
          <Link href="/dashboard/famiglia/pagamenti" style={{
            marginLeft: 'auto', fontFamily: 'var(--font-mono)',
            fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'inherit', textDecoration: 'none', fontWeight: 700, whiteSpace: 'nowrap',
          }}>
            PAGA ORA →
          </Link>
        </div>
      )}

      {/* KPI */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 1, background: 'var(--border)', marginBottom: 24,
      }}>
        {[
          {
            label: 'PRESENZE 30GG',
            value: percPresenze !== null ? `${percPresenze}%` : '—',
            sub: `${presenze.presenti}/${presenze.tot} allenamenti`,
            color: percPresenze !== null && percPresenze < 60 ? 'var(--rosso)' : 'var(--accent)',
          },
          {
            label: 'QUOTA STAGIONALE',
            value: quota ? (quota.stato === 'pagato' ? '✓' : formatEuro(totDaPagare)) : '—',
            sub: quota ? quota.stato.replace('_', ' ') : 'Non assegnata',
            color: quota ? statoQuotaColore[quota.stato] : 'var(--gray)',
          },
          {
            label: 'ULTIME VALUTAZIONI',
            value: valutazioni.length > 0 ? `${valutazioni.length}` : '—',
            sub: valutazioni.length > 0 ? `Ultima: ${formatData(valutazioni[0]?.data)}` : 'Nessuna',
            color: 'var(--accent)',
          },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--gray-light)', padding: '16px 20px' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 900,
              fontSize: 26, color: k.color, lineHeight: 1,
            }}>{k.value}</div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
              letterSpacing: '0.15em', textTransform: 'uppercase',
              color: '#444', marginTop: 4,
            }}>{k.label}</div>
            <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Grid 2 colonne */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Prossimi eventi */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 18px', borderBottom: '1px solid var(--border)',
            fontFamily: 'var(--font-display)', fontWeight: 700,
            textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.08em',
          }}>
            📅 Prossimi eventi
          </div>
          {prossimi.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray)', fontSize: 12 }}>
              Nessun evento
            </div>
          ) : prossimi.map(p => (
            <div key={p.id} style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>
                {p.casa_trasferta === 'trasferta' ? '@ ' : 'vs '}{p.avversario}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>
                {new Date(p.data_ora).toLocaleDateString('it-IT', {
                  weekday: 'short', day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Ultime valutazioni */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 18px', borderBottom: '1px solid var(--border)',
            fontFamily: 'var(--font-display)', fontWeight: 700,
            textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.08em',
          }}>
            ⭐ Valutazioni
          </div>
          {valutazioni.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray)', fontSize: 12 }}>
              Nessuna valutazione
            </div>
          ) : valutazioni.map((v, i) => (
            <div key={i} style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>
                  {formatData(v.data)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { l: 'TEC', v: v.tecnica }, { l: 'TAT', v: v.tattica },
                  { l: 'FIS', v: v.fisico }, { l: 'MEN', v: v.mentale },
                ].filter(x => x.v != null).map(x => (
                  <div key={x.l} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>{x.l}</span>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
                      color: x.v >= 7 ? 'var(--accent)' : x.v >= 5 ? 'var(--ambra)' : 'var(--rosso)',
                    }}>{x.v}</span>
                  </div>
                ))}
              </div>
              {v.note && (
                <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4, lineHeight: 1.5 }}>
                  {v.note.slice(0, 80)}{v.note.length > 80 ? '…' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Messaggi recenti */}
      {messaggi.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ✉ Comunicazioni recenti
            </span>
            <Link href="/dashboard/famiglia/comunicazioni" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>
              Vedi tutte →
            </Link>
          </div>
          {messaggi.map(m => (
            <div key={m.id} style={{ padding: '11px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>
                {m.titolo}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>
                {formatData(m.inviato_at)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link rapidi */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {[
          { href: '/dashboard/famiglia/calendario',   label: 'Calendario',  icon: '📅' },
          { href: '/dashboard/famiglia/sviluppo',     label: 'Progressi',   icon: '⭐' },
          { href: '/dashboard/famiglia/pagamenti',    label: 'Pagamenti',   icon: '💶' },
          { href: '/dashboard/famiglia/messaggi',     label: 'Bacheca',     icon: '✉️' },
        ].map(l => (
          <Link key={l.href} href={l.href} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 16px',
            background: 'var(--gray-light)',
            border: '1px solid var(--border)',
            borderRadius: 2,
            textDecoration: 'none',
            color: 'var(--gray)',
            fontSize: 14,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <span style={{ fontSize: 20 }}>{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
