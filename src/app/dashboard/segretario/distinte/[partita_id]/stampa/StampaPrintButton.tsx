'use client'
export default function StampaPrintButton() {
  return (
    <button
      className="btn btn-primary"
      onClick={() => window.print()}
      style={{ fontSize: 14 }}
    >
      🖨 Stampa / Salva PDF
    </button>
  )
}
