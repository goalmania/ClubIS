'use client'
import { useState, useEffect } from 'react'
import { useCategoriaPro } from '@/hooks/useCategoriaPro'

type Livello = 'verde' | 'giallo' | 'rosso'

function giorniA(data: string): number {
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  const d = new Date(data); d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - oggi.getTime()) / 86400000)
}

export default function RischioCovisocWidget() {
  const { isPro } = useCategoriaPro()
  const [livello, setLivello] = useState<Livello | null>(null)
  const [scaduteCount, setScaduteCount] = useState(0)
  const [urgentiCount, setUrgentiCount] = useState(0)
  const [prossima, setProssima] = useState<{ descrizione: string; data_scadenza: string } | null>(null)

  useEffect(() => {
    if (!isPro) return
    fetch('/api/scadenze-pro')
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
        const attive = data.filter(s => s.stato !== 'completata')
        const scadute = attive.filter(s => new Date(s.data_scadenza) < oggi)
        const urgenti = attive.filter(s => giorniA(s.data_scadenza) >= 0 && giorniA(s.data_scadenza) <= 30)
        const pross = attive
          .filter(s => giorniA(s.data_scadenza) >= 0)
          .sort((a, b) => new Date(a.data_scadenza).getTime() - new Date(b.data_scadenza).getTime())[0] ?? null

        setScaduteCount(scadute.length)
        setUrgentiCount(urgenti.length)
        setProssima(pross)
        setLivello(scadute.length > 0 ? 'rosso' : urgenti.length > 0 ? 'giallo' : 'verde')
      })
      .catch(() => {})
  }, [isPro])

  if (!isPro || livello === null) return null

  const cfg = {
    verde:  { color: '#4cff88', bg: 'rgba(76,255,136,0.06)',  border: 'rgba(76,255,136,0.2)',  label: 'Compliance OK' },
    giallo: { color: '#ffd600', bg: 'rgba(255,214,0,0.06)',   border: 'rgba(255,214,0,0.2)',   label: 'Attenzione scadenze' },
    rosso:  { color: '#ff4444', bg: 'rgba(255,68,68,0.06)',   border: 'rgba(255,68,68,0.2)',   label: 'Rischio penalizzazione' },
  }[livello]

  return (
    <a href="/dashboard/segretario/compliance-pro" style={{ textDecoration: 'none' }}>
      <div style={{ padding: '16px 20px', background: cfg.bg, border: `1px solid ${cfg.border}`, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', cursor: 'pointer', transition: 'opacity 0.2s' }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: cfg.color, flexShrink: 0, boxShadow: `0 0 8px ${cfg.color}` }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: cfg.color }}>{cfg.label}</div>
          <div style={{ fontSize: 11, color: 'var(--grigio-3)', marginTop: 3 }}>
            {livello === 'verde' && prossima
              ? `Prossima: ${prossima.descrizione.substring(0, 50)}…`
              : livello === 'giallo'
              ? `${urgentiCount} scadenza${urgentiCount !== 1 ? 'e' : ''} entro 30 giorni`
              : `${scaduteCount} scadenza${scaduteCount !== 1 ? 'e' : ''} scaduta${scaduteCount !== 1 ? 'e' : ''} senza attestazione`}
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--grigio-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>COVISOC →</div>
      </div>
    </a>
  )
}
