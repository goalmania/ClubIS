'use client'
import Link from 'next/link'

export default function ErrorePage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column', gap: 16,
      background: '#0a0a0a', fontFamily: 'sans-serif', padding: 24,
    }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>Profilo non collegato</div>
      <div style={{ fontSize: 14, color: '#888', textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
        Il tuo account è autenticato ma non è ancora collegato a nessun club.
        Contatta l&apos;amministratore del sistema.
      </div>

      {/* Suggerimento per le famiglie */}
      <div style={{
        marginTop: 8,
        padding: '14px 20px',
        borderRadius: 10,
        border: '1px solid rgba(200,240,0,0.2)',
        background: 'rgba(200,240,0,0.04)',
        textAlign: 'center',
        maxWidth: 400,
      }}>
        <div style={{ fontSize: 13, color: '#c8f000', fontWeight: 600, marginBottom: 6 }}>
          Sei un genitore?
        </div>
        <div style={{ fontSize: 13, color: '#aaa', marginBottom: 12, lineHeight: 1.5 }}>
          Se hai ricevuto un codice invito dalla segreteria, puoi collegare
          il tuo account al profilo di tuo figlio/a.
        </div>
        <Link
          href="/auth/famiglia-setup"
          style={{
            display: 'inline-block',
            padding: '8px 20px',
            borderRadius: 8,
            background: 'rgba(200,240,0,0.1)',
            border: '1px solid rgba(200,240,0,0.3)',
            color: '#c8f000',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Inserisci codice invito →
        </Link>
      </div>

      <form action="/api/auth/logout" method="POST" style={{ marginTop: 8 }}>
        <button type="submit" style={{
          padding: '10px 24px', borderRadius: 8,
          border: '1px solid #2a2a2a', background: '#111',
          cursor: 'pointer', fontSize: 14, color: '#888',
        }}>
          Esci
        </button>
      </form>
    </div>
  )
}
