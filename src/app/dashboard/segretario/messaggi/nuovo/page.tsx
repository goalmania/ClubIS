'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { FormField, SectionCard, BackButton, Toast } from '@/components/ui'

export default function NuovoMessaggioPage() {
  const router = useRouter()
  const supabase = createClient()
  const [squadre, setSquadre] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [titolo, setTitolo] = useState('')
  const [corpo, setCorpo] = useState('')
  const [tipo, setTipo] = useState('comunicazione')
  const [destinatariSel, setDestinatariSel] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user!.id).single()
      const { data: sq } = await supabase.from('squadre').select('id, nome').eq('club_id', utente!.club_id).eq('attiva', true)
      setSquadre(sq ?? [])
    }
    load()
  }, [])

  const toggleSquadra = (id: string) => setDestinatariSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const salva = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titolo.trim() || !corpo.trim()) { setToast({ msg: 'Titolo e testo obbligatori', tipo: 'error' }); return }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user!.id).single()
      const dest = destinatariSel.length > 0
        ? destinatariSel.map(id => ({ tipo: 'squadra', id }))
        : [{ tipo: 'club', id: utente!.club_id }]
      const { error } = await supabase.from('messaggi').insert({
        club_id: utente!.club_id,
        mittente_id: user!.id,
        titolo: titolo.trim(),
        corpo: corpo.trim(),
        tipo,
        destinatari: dest,
      })
      if (error) throw error
      setToast({ msg: 'Messaggio inviato', tipo: 'success' })
      setTimeout(() => router.push('/dashboard/segretario/messaggi'), 900)
    } catch (err: any) {
      setToast({ msg: err.message ?? 'Errore', tipo: 'error' }); setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 660, margin: '0 auto' }}>
      <BackButton label="Torna ai messaggi" />
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Nuova comunicazione</h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>Invia un messaggio a tutta la società o a squadre specifiche.</p>
      </div>
      <form onSubmit={salva}>
        <SectionCard>
          <FormField label="Tipo comunicazione">
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ v: 'comunicazione', l: 'Comunicazione' }, { v: 'avviso', l: 'Avviso urgente' }, { v: 'alert_tecnico', l: 'Info tecnica' }].map(t => (
                <button key={t.v} type="button" onClick={() => setTipo(t.v)}
                  className={`badge ${tipo === t.v ? 'badge-verde' : 'badge-grigio'}`}
                  style={{ padding: '6px 14px', fontSize: 13, cursor: 'pointer', border: tipo === t.v ? '2px solid var(--verde)' : '2px solid transparent', fontWeight: tipo === t.v ? 600 : 400 }}>
                  {t.l}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Titolo" required>
            <input className="input" value={titolo} onChange={e => setTitolo(e.target.value)} placeholder="Variazione allenamento domani..." />
          </FormField>
          <FormField label="Messaggio" required>
            <textarea className="input" value={corpo} onChange={e => setCorpo(e.target.value)}
              placeholder="Scrivere qui il testo del messaggio..." rows={5} style={{ resize: 'vertical' }} />
          </FormField>
          <FormField label="Destinatari" hint="Lascia vuoto per inviare a tutta la società">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {squadre.map(s => (
                <button key={s.id} type="button" onClick={() => toggleSquadra(s.id)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                    border: destinatariSel.includes(s.id) ? '1px solid var(--verde)' : '1px solid var(--grigio-5)',
                    background: destinatariSel.includes(s.id) ? 'var(--verde-lt)' : 'white',
                    color: destinatariSel.includes(s.id) ? 'var(--verde)' : 'var(--grigio-3)',
                    fontWeight: destinatariSel.includes(s.id) ? 500 : 400,
                  }}>
                  {s.nome}
                </button>
              ))}
              {destinatariSel.length === 0 && <span style={{ fontSize: 12, color: 'var(--verde)', paddingTop: 6 }}>✓ Tutta la società</span>}
            </div>
          </FormField>
        </SectionCard>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingBottom: 32 }}>
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Annulla</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Invio...' : 'Invia messaggio'}</button>
        </div>
      </form>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
