'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

const RUOLO_LABEL: Record<string, string> = {
  segretario:   'Segretario',
  allenatore:   'Allenatore',
  medico:       'Medico',
  ds:           'Direttore Sportivo',
  team_manager: 'Team Manager',
  osservatore:  'Osservatore',
  famiglia:     'Familiare / Genitore',
  giocatore:    'Giocatore',
  presidente:   'Presidente',
  custode:      'Custode',
  ufficio_stampa: 'Ufficio Stampa',
}

type InvitoInfo = {
  ruolo: string; club_nome: string; club_citta: string
  club_logo_url: string | null; giocatore_nome: string | null; giocatore_id: string | null
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--black)', padding:'20px' }}>
      <div style={{ width:'100%', maxWidth:440 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <img src="/clubis-logo.png" alt="ClubIS" style={{ height: 44, display: 'inline-block', marginBottom: 10 }} />
        </div>
        {children}
      </div>
    </div>
  )
}

function UniscitiContent() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()

  // ?accetta=1 indica che l'utente è tornato dal login e vuole accettare l'invito
  const modoAccetta = searchParams.get('accetta') === '1'

  const [stato, setStato]       = useState<'loading'|'ok'|'usato'|'scaduto'|'errore'>('loading')
  const [info, setInfo]         = useState<InvitoInfo | null>(null)

  // Stato form nuovo account
  const [nome, setNome]         = useState('')
  const [cognome, setCognome]   = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore]     = useState('')
  const [invio, setInvio]       = useState(false)
  const [successo, setSuccesso] = useState(false)

  useEffect(() => {
    if (!token) return

    const supabase = createClient()

    Promise.all([
      fetch(`/api/inviti/info/${token}`).then(r => r.json()),
      supabase.auth.getUser(),
    ]).then(([data, { data: { user } }]) => {
      if (data.error) {
        if (data.error.includes('stato utilizzato')) setStato('usato')
        else if (data.error.includes('scadut'))      setStato('scaduto')
        else setStato('errore')
        return
      }
      setInfo(data)
      setStato('ok')

      // Se tornato dal login con ?accetta=1, auto-accetta l'invito
      if (modoAccetta && user) {
        accettaEsistente()
      }
    }).catch(() => setStato('errore'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, modoAccetta])

  const accettaEsistente = async () => {
    setErrore(''); setInvio(true)
    const res = await fetch('/api/inviti/accetta-esistente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      setErrore(data.error ?? 'Errore.')
      setInvio(false)
      return
    }
    setSuccesso(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  const creaAccount = async (e: React.FormEvent) => {
    e.preventDefault(); setErrore(''); setInvio(true)
    const res = await fetch('/api/inviti/accetta', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, nome, cognome, email, password }),
    })
    const data = await res.json()
    if (!res.ok || data.error) { setErrore(data.error ?? 'Errore.'); setInvio(false); return }
    setSuccesso(true)
    setTimeout(() => router.push('/auth/login'), 3000)
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  if (stato === 'loading') {
    return <Wrapper><p style={{ textAlign:'center', color:'var(--gray)', fontFamily:'var(--font-mono)', fontSize:13 }}>Verifica invito...</p></Wrapper>
  }

  // Se in modalità accetta + utente loggato: mostra spinner di accettazione
  if (modoAccetta && stato === 'ok') {
    return (
      <Wrapper>
        <p style={{ textAlign:'center', color:'var(--gray)', fontFamily:'var(--font-mono)', fontSize:13 }}>
          {invio ? 'Accettazione in corso...' : successo ? 'Club aggiunto! Redirect...' : 'Aggiunta club al tuo account...'}
        </p>
        {errore && (
          <div style={{ marginTop:16, padding:'10px 14px', background:'rgba(255,60,60,0.08)', border:'1px solid rgba(255,60,60,0.3)', borderRadius:2, fontSize:12, color:'#ff6060', textAlign:'center' }}>
            {errore}
            <br />
            <Link href="/auth/login" style={{ color:'var(--accent)', marginTop:8, display:'inline-block' }}>Torna al login</Link>
          </div>
        )}
      </Wrapper>
    )
  }

  if (stato !== 'ok') {
    const M: Record<string,{icona:string;titolo:string;testo:string}> = {
      usato:   { icona:'🔒', titolo:'Link già utilizzato', testo:'Questo invito è già stato usato.' },
      scaduto: { icona:'⏰', titolo:'Link scaduto',        testo:"L'invito è scaduto. Chiedi al presidente un nuovo link." },
      errore:  { icona:'❌', titolo:'Link non valido',     testo:"Il link non è valido. Controlla l'URL." },
    }
    const m = M[stato]
    return (
      <Wrapper>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>{m.icona}</div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:20, textTransform:'uppercase', color:'var(--white)', marginBottom:10 }}>{m.titolo}</div>
          <div style={{ fontSize:13, color:'var(--gray)', marginBottom:28 }}>{m.testo}</div>
          <Link href="/auth/login" style={{ color:'var(--accent)', fontSize:13, fontFamily:'var(--font-mono)' }}>Vai al login →</Link>
        </div>
      </Wrapper>
    )
  }

  if (successo) return (
    <Wrapper>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:20, textTransform:'uppercase', color:'var(--accent)', marginBottom:10 }}>
          Benvenuto in {info?.club_nome}!
        </div>
        <div style={{ fontSize:13, color:'var(--gray)' }}>Account creato! Redirect al login...</div>
      </div>
    </Wrapper>
  )

  // Header comune con info club + ruolo
  const Header = (
    <div style={{ textAlign:'center', marginBottom:24 }}>
      {info?.club_logo_url && <img src={info.club_logo_url} alt="" style={{ height:52, margin:'0 auto 10px', display:'block', objectFit:'contain' }} />}
      <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:22, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--white)' }}>{info?.club_nome}</div>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--gray)', letterSpacing:'0.1em', marginTop:4 }}>{info?.club_citta}</div>
    </div>
  )

  // ── Form creazione account (default per tutti) ────────────────────────────
  return (
    <Wrapper>
      {Header}
      <div style={{ background:'#111', border:'1px solid var(--border-solid)', borderRadius:2, padding:'28px' }}>
        <div style={{ marginBottom:22 }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17, textTransform:'uppercase', color:'var(--white)', marginBottom:6 }}>Crea il tuo account</div>
          <div style={{ fontSize:12, color:'var(--gray)', lineHeight:1.6 }}>
            Sei stato invitato come <span style={{ color:'var(--accent)', fontWeight:600 }}>{RUOLO_LABEL[info?.ruolo ?? ''] ?? info?.ruolo}</span>
            {info?.giocatore_nome && <> — atleta <strong style={{ color:'var(--white)' }}>{info.giocatore_nome}</strong></>}
          </div>
        </div>

        <form onSubmit={creaAccount}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <div><label className="label">Nome</label><input className="input" value={nome} onChange={e => setNome(e.target.value)} required autoFocus /></div>
            <div><label className="label">Cognome</label><input className="input" value={cognome} onChange={e => setCognome(e.target.value)} required /></div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div style={{ marginBottom:22 }}>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
            <div style={{ fontSize:10, color:'var(--gray)', marginTop:4, fontFamily:'var(--font-mono)' }}>Minimo 8 caratteri</div>
          </div>
          {errore && (
            <div style={{ marginBottom:16, padding:'10px 14px', background:'rgba(255,60,60,0.08)', border:'1px solid rgba(255,60,60,0.3)', borderRadius:2, fontSize:12, color:'#ff6060' }}>
              {errore}
            </div>
          )}
          <button type="submit" disabled={invio} style={{ width:'100%', padding:'12px 0', background: invio ? '#333' : 'var(--accent)', color:'#000', border:'none', borderRadius:2, fontFamily:'var(--font-mono)', fontSize:12, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', cursor: invio ? 'not-allowed' : 'pointer' }}>
            {invio ? 'Creazione in corso...' : 'Crea account →'}
          </button>
        </form>

        <div style={{ borderTop:'1px solid var(--border-solid)', marginTop:20, paddingTop:16, textAlign:'center' }}>
          <div style={{ fontSize:12, color:'var(--gray)', marginBottom:8 }}>Hai già un account ClubIS?</div>
          <Link
            href={`/auth/login?redirect_to=/unisciti/${token}?accetta=1`}
            style={{ display:'inline-block', padding:'9px 20px', border:'1px solid var(--border-solid)', borderRadius:2, fontSize:12, fontFamily:'var(--font-mono)', color:'var(--white)', textDecoration:'none', letterSpacing:'0.05em' }}
          >
            Accedi con account esistente →
          </Link>
        </div>
      </div>
    </Wrapper>
  )
}

export default function UniscitiPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--black)' }}>
        <p style={{ color:'var(--gray)', fontFamily:'var(--font-mono)', fontSize:13 }}>Caricamento...</p>
      </div>
    }>
      <UniscitiContent />
    </Suspense>
  )
}
