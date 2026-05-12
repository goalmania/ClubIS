'use client'

export default function PrintToolbar() {
  return (
    <div
      className="no-print"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: '#1a1a1a', color: '#fff', padding: '10px 20px',
        display: 'flex', alignItems: 'center', gap: 12, fontSize: 13,
      }}
    >
      <button
        onClick={() => window.print()}
        style={{
          background: '#2563eb', color: '#fff', border: 'none',
          padding: '7px 18px', borderRadius: 6, fontWeight: 600,
          cursor: 'pointer', fontSize: 13,
        }}
      >
        🖨 Stampa / Salva PDF
      </button>
      <button
        onClick={() => window.close()}
        style={{
          background: 'transparent', color: '#aaa', border: '1px solid #444',
          padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
        }}
      >
        ✕ Chiudi
      </button>
      <span style={{ color: '#666', marginLeft: 8, fontSize: 12 }}>
        Nel dialogo di stampa scegli "Salva come PDF" e deseleziona "Intestazioni e piè di pagina"
      </span>
    </div>
  )
}
