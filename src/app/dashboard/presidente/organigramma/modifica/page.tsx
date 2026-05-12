'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Toast, BackButton } from '@/components/ui'
import { useRouter } from 'next/navigation'

const RUOLO_LABEL: Record<string, string> = {
  presidente: 'Presidente', ds: 'Dir. Sportivo', segretario: 'Segretario',
  allenatore: 'Allenatore', medico: 'Medico', osservatore: 'Osservatore',
  team_manager: 'Team Manager', famiglia: 'Famiglia',
}

export default function OrganigrammaModificaPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [utenti,  setUtenti]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: utente } = await supabase
        .from('utenti').select('club_id').eq('id', user.id).single()
      if (!utente || !mounted) return

      const { data } = await supabase
        .from('utenti')
        .select('id, nome, cognome, ruolo, foto_url, titolo_organigramma, visibile_organigramma, ordine_organigramma')
        .eq('club_id', utente.club_id)
        .eq('attivo', true)
        .neq('ruolo', 'famiglia')
        .order('ordine_organigramma', { ascending: true, nullsFirst: false })

      if (mounted) {
        setUtenti(data ?? [])
        setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const aggiorna = (id: string, campo: string, valore: any) => {
    setUtenti(prev => prev.map(u => u.id === id ? { ...u, [campo]: valore } : u))
  }

  const salva = async () => {
    setSaving(true)
    const errors: string[] = []

    for (const u of utenti) {
      const { error } = await supabase.from('utenti').update({
        titolo_organigramma:    u.titolo_organigramma ?? null,
        visibile_organigramma:  u.visibile_organigramma ?? true,
        ordine_organigramma:    u.ordine_organigramma ?? null,
      }).eq('id', u.id)
      if (error) errors.push(u.cognome)
    }

    setSaving(false)
    if (errors.length) {
      setToast({ msg: `Errore su: ${errors.join(', ')}`, tipo: 'error' })
    } else {
      setToast({ msg: 'Organigramma aggiornato', tipo: 'success' })
      setTimeout(() => router.push('/dashboard/presidente/organigramma'), 1200)
    }
  }

  return (
    <div>
      <BackButton label="Torna all'organigramma" />

      <PageHeader
        title="Modifica Organigramma"
        subtitle="Configura titoli, visibilità e ordine di ogni membro dello staff"
        actions={
          <button className="btn btn-primary" onClick={salva} disabled={saving || loading}>
            {saving ? 'Salvataggio...' : 'Salva modifiche →'}
          </button>
        }
      />

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          Caricamento...
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr 120px 80px',
            gap: 16,
            padding: '10px 20px',
            background: '#0d0d0d',
            borderBottom: '2px solid var(--border)',
          }}>
            {['MEMBRO STAFF', 'TITOLO ORGANIGRAMMA', 'ORDINE', 'VISIBILE'].map(h => (
              <div key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--gray)' }}>
                {h}
              </div>
            ))}
          </div>

          {utenti.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray)', fontSize: 13 }}>
              Nessun membro dello staff trovato
            </div>
          ) : utenti.map((u, idx) => (
            <div
              key={u.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '200px 1fr 120px 80px',
                gap: 16,
                padding: '14px 20px',
                alignItems: 'center',
                borderBottom: idx < utenti.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
              }}
            >
              {/* Info membro */}
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: 13, textTransform: 'uppercase', color: 'var(--white)',
                }}>
                  {u.cognome} {u.nome}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  textTransform: 'uppercase', color: 'var(--gray)',
                  letterSpacing: '0.08em', marginTop: 2,
                }}>
                  {RUOLO_LABEL[u.ruolo] ?? u.ruolo}
                </div>
              </div>

              {/* Titolo personalizzato */}
              <div>
                <input
                  className="input"
                  value={u.titolo_organigramma ?? ''}
                  onChange={e => aggiorna(u.id, 'titolo_organigramma', e.target.value || null)}
                  placeholder={`es. "${RUOLO_LABEL[u.ruolo] ?? u.ruolo} Prima Squadra"`}
                  style={{ fontSize: 13, width: '100%' }}
                />
              </div>

              {/* Ordine */}
              <div>
                <input
                  className="input"
                  type="number"
                  min={1} max={99}
                  value={u.ordine_organigramma ?? idx + 1}
                  onChange={e => aggiorna(u.id, 'ordine_organigramma', parseInt(e.target.value) || null)}
                  style={{ fontSize: 13, width: '100%' }}
                />
              </div>

              {/* Visibile */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <input
                  type="checkbox"
                  checked={u.visibile_organigramma ?? true}
                  onChange={e => aggiorna(u.id, 'visibile_organigramma', e.target.checked)}
                  style={{ accentColor: 'var(--accent)', width: 18, height: 18, cursor: 'pointer' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note */}
      <div style={{
        marginTop: 20,
        padding: '12px 16px',
        background: '#0d0d0d',
        border: '1px solid var(--border)',
        borderRadius: 2,
        fontSize: 12,
        color: 'var(--gray)',
        lineHeight: 1.7,
      }}>
        <strong style={{ color: 'var(--white)' }}>Note:</strong>
        <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
          <li><strong style={{ color: 'var(--white)' }}>Titolo</strong> — sovrascrive il ruolo di sistema nell'organigramma pubblico</li>
          <li><strong style={{ color: 'var(--white)' }}>Ordine</strong> — numero più basso = più in alto nell'organigramma</li>
          <li><strong style={{ color: 'var(--white)' }}>Visibile</strong> — deseleziona per nascondere dall'organigramma pubblico</li>
        </ul>
      </div>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
