'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TabBar, PageHeader, EmptyState, Toast } from '@/components/ui'
import { formatData } from '@/lib/helpers'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface MessaggiViewProps {
  clubId: string
  ruolo: string
}

export default function MessaggiView({ clubId, ruolo }: MessaggiViewProps) {
  const searchParams = useSearchParams()
  const tabIniziale = searchParams.get('tab') === 'bacheca' ? 'bacheca' : 'messaggi'

  const supabase = createClient()
  const [tab, setTab]             = useState(tabIniziale)
  const [messaggi, setMessaggi]   = useState<any[]>([])
  const [bacheca, setBacheca]     = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [toast, setToast]         = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  const load = useCallback(async () => {
    const [msgRes, bachRes] = await Promise.allSettled([
      supabase
        .from('messaggi')
        .select('*, utenti!mittente_id(nome, cognome, ruolo)')
        .eq('club_id', clubId)
        .neq('tipo_comunicazione', 'bacheca_post')
        .order('inviato_at', { ascending: false })
        .limit(40),
      supabase
        .from('messaggi')
        .select('*, utenti!mittente_id(nome, cognome, ruolo)')
        .eq('club_id', clubId)
        .in('tipo_comunicazione', ['bacheca_post', 'annuncio'])
        .order('inviato_at', { ascending: false })
        .limit(20),
    ])

    if (msgRes.status === 'fulfilled') setMessaggi((msgRes.value as any).data ?? [])
    if (bachRes.status === 'fulfilled') setBacheca((bachRes.value as any).data ?? [])
    setLoading(false)
  }, [clubId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let mounted = true
    load().then(() => { if (!mounted) return })
    return () => { mounted = false }
  }, [load])

  const toggleFissato = async (id: string, fissatoAttuale: boolean) => {
    const { error } = await supabase
      .from('messaggi')
      .update({ fissato: !fissatoAttuale })
      .eq('id', id)
    if (error) {
      setToast({ msg: error.message, tipo: 'error' })
      return
    }
    setBacheca(prev => prev.map(p => p.id === id ? { ...p, fissato: !fissatoAttuale } : p)
      .sort((a, b) => (b.fissato ? 1 : 0) - (a.fissato ? 1 : 0)))
  }

  const badgeTipo: Record<string, string> = {
    avviso: 'badge-rosso', convocazione: 'badge-verde',
    comunicazione: 'badge-blu', alert_tecnico: 'badge-ambra',
  }

  const ruoloMsgLink = ruolo === 'team_manager' ? 'team-manager' : ruolo

  return (
    <div>
      <PageHeader
        title="Comunicazioni"
        subtitle="Bacheca e messaggi del club"
        actions={
          <Link href={`/dashboard/${ruoloMsgLink}/messaggi/nuovo`} className="btn btn-primary btn-sm">
            + Nuovo messaggio
          </Link>
        }
      />

      <TabBar
        tabs={[
          { key: 'bacheca',   label: '📌 Bacheca',  count: bacheca.filter(p => p.fissato).length },
          { key: 'messaggi',  label: '✉ Messaggi',  count: messaggi.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          Caricamento...
        </div>
      ) : tab === 'bacheca' ? (
        <div style={{ marginTop: 20 }}>
          {bacheca.length === 0 ? (
            <EmptyState
              icon="📌"
              title="Bacheca vuota"
              subtitle="Nessun post o annuncio pubblicato"
            />
          ) : bacheca.map(p => {
            const mitt = p.utenti as any
            return (
              <div key={p.id} className="card" style={{
                padding: 20, marginBottom: 12,
                borderLeft: p.fissato ? '3px solid var(--accent)' : '3px solid transparent',
              }}>
                {/* Header post */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div className="avatar" style={{ width: 32, height: 32, fontSize: 11, flexShrink: 0 }}>
                    {mitt?.nome?.[0]}{mitt?.cognome?.[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>
                      {mitt?.nome} {mitt?.cognome}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>
                      {formatData(p.inviato_at)}
                      {p.fissato && <span style={{ color: 'var(--accent)', marginLeft: 8 }}>📌 FISSATO</span>}
                      {p.tipo_comunicazione === 'annuncio' && (
                        <span style={{ color: 'var(--ambra)', marginLeft: 8 }}>📢 ANNUNCIO</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFissato(p.id, !!p.fissato)}
                    title={p.fissato ? 'Rimuovi pin' : 'Fissa in bacheca'}
                    style={{
                      padding: '4px 8px', background: 'transparent',
                      border: '1px solid var(--border)', borderRadius: 2,
                      color: p.fissato ? 'var(--accent)' : 'var(--gray)',
                      fontSize: 12, cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    📌
                  </button>
                </div>

                {/* Titolo */}
                {p.titolo && (
                  <div style={{
                    fontFamily: 'var(--font-display)', fontWeight: 900,
                    fontSize: 16, textTransform: 'uppercase', letterSpacing: '-0.01em',
                    marginBottom: 10, color: 'var(--white)',
                  }}>
                    {p.titolo}
                  </div>
                )}

                {/* Corpo */}
                <div style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.7 }}>
                  {p.corpo ?? p.messaggio}
                </div>

                {/* Allegati */}
                {Array.isArray(p.allegati) && p.allegati.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                    {p.allegati.map((a: any, i: number) => (
                      <a
                        key={i}
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px',
                          background: 'var(--gray-light)',
                          border: '1px solid var(--border)',
                          borderRadius: 2,
                          fontFamily: 'var(--font-mono)', fontSize: 10,
                          color: 'var(--accent)', textDecoration: 'none',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}
                      >
                        📎 {a.nome}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* ── Tab Messaggi ── */
        <div style={{ marginTop: 20 }}>
          {messaggi.length === 0 ? (
            <EmptyState
              icon="✉"
              title="Nessun messaggio"
              subtitle="Non ci sono messaggi in questa sezione"
            />
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {messaggi.map(m => {
                const mitt = m.utenti as any
                return (
                  <div key={m.id} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div className="avatar" style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}>
                        {mitt?.nome?.[0]}{mitt?.cognome?.[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{
                            fontFamily: 'var(--font-display)', fontWeight: 700,
                            fontSize: 13, textTransform: 'uppercase',
                          }}>
                            {m.titolo}
                          </span>
                          {m.tipo && (
                            <span className={`badge ${badgeTipo[m.tipo] ?? 'badge-grigio'}`} style={{ fontSize: 10 }}>
                              {m.tipo}
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: 12, color: 'var(--gray)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {m.corpo ?? m.messaggio}
                        </div>
                        <div style={{ fontSize: 10, color: '#333', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                          {mitt?.nome} {mitt?.cognome} · {formatData(m.inviato_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
