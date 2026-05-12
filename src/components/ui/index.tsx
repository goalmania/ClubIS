'use client'
import { useState } from 'react'

// ---- PageHeader ----
export function PageHeader({
  title, subtitle, actions
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: 26,
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
          color: 'var(--white)',
        }}>{title}</h1>
        {subtitle && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--gray)', marginTop: 4, fontWeight: 300 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{actions}</div>}
    </div>
  )
}

// ---- FormField ----
export function FormField({
  label, required, hint, error, children
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label className="label">
        {label}
        {required && <span style={{ color: 'var(--accent-red)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && !error && <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 5 }}>{hint}</div>}
      {error && <div style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: 5 }}>{error}</div>}
    </div>
  )
}

// ---- FormGrid ----
export function FormGrid({ cols = 2, children }: { cols?: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '0 20px' }}>
      {children}
    </div>
  )
}

// ---- FormSection ----
export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.2em', color: 'var(--accent)',
        paddingBottom: 10, borderBottom: '1px solid var(--border-solid)', marginBottom: 20,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

// ---- SectionCard ----
export function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="card" style={{ padding: '24px 28px', marginBottom: 20, ...style }}>
      {children}
    </div>
  )
}

// ---- Select ----
export function Select({
  value, onChange, options, placeholder
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  return (
    <select className="input" value={value} onChange={e => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ---- RatingInput ----
export function RatingInput({
  value, onChange, label
}: {
  value: number | null
  onChange: (v: number) => void
  label?: string
}) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div style={{ display: 'flex', gap: 6 }}>
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            style={{
              width: 34, height: 34, borderRadius: 8, border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
              background: value !== null && n <= value
                ? (value >= 7 ? 'var(--accent)' : value >= 5 ? 'var(--accent-orange)' : 'var(--accent-red)')
                : 'var(--gray-mid)',
              color: value !== null && n <= value
                ? (value >= 7 ? 'var(--black)' : 'white')
                : 'var(--gray)',
              transition: 'all 0.1s',
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---- Toast ----
export function Toast({ msg, tipo = 'success', onClose }: {
  msg: string
  tipo?: 'success' | 'error' | 'info'
  onClose: () => void
}) {
  const bg = tipo === 'success' ? 'var(--accent)' : tipo === 'error' ? 'var(--accent-red)' : 'var(--accent2)'
  const color = tipo === 'success' ? 'var(--black)' : tipo === 'info' ? 'var(--black)' : 'white'
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
      background: bg, color,
      borderRadius: 10,
      padding: '12px 18px',
      fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: 'var(--shadow)',
      animation: 'slideIn 0.2s ease',
    }}>
      <span>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color, cursor: 'pointer', fontSize: 16, padding: 0 }}>×</button>
    </div>
  )
}

// ---- EmptyState ----
export function EmptyState({ icon, title, subtitle, action }: {
  icon: string
  title: string
  subtitle?: string
  action?: { label: string; href: string }
}) {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.08em',
        color: 'var(--white)', marginBottom: 6,
      }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 16 }}>{subtitle}</div>}
      {action && (
        <a href={action.href} className="btn btn-primary btn-sm">{action.label}</a>
      )}
    </div>
  )
}

// ---- BackButton ----
export function BackButton({ label = 'Indietro' }: { label?: string }) {
  return (
    <button
      onClick={() => window.history.back()}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--gray)', fontSize: 13,
        fontFamily: 'var(--font-display)', fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: 0,
        transition: 'color 0.2s',
      }}
    >
      ← {label}
    </button>
  )
}

// ---- TableHeader ----
export function TableHeader({ title, count, href, actions }: {
  title: string; count?: number | null; href?: string; actions?: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 18px', borderBottom: '1px solid var(--border-solid)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em',
          color: 'var(--white)',
        }}>{title}</span>
        {count != null && count > 0 && (
          <span className="badge badge-grigio">{count}</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {actions}
        {href && (
          <a href={href} style={{
            fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--accent)', textDecoration: 'none',
          }}>
            Vedi tutti →
          </a>
        )}
      </div>
    </div>
  )
}

// ---- StatCard ----
export function StatCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={color ? { color } : undefined}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

// ---- TabBar ----
export function TabBar({ tabs, active, onChange }: {
  tabs: { key: string; label: string; count?: number }[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div style={{
      display: 'flex', gap: 0, borderBottom: '1px solid var(--border-solid)',
      marginBottom: 20,
    }}>
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            padding: '10px 16px',
            fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            background: 'none', border: 'none', cursor: 'pointer',
            color: active === t.key ? 'var(--accent)' : 'var(--gray)',
            borderBottom: active === t.key ? '2px solid var(--accent)' : '2px solid transparent',
            transition: 'all 0.15s',
          }}
        >
          {t.label}
          {t.count != null && (
            <span style={{
              marginLeft: 6, fontSize: 11, padding: '1px 6px',
              borderRadius: 999, background: 'var(--gray-mid)', color: 'var(--gray)',
              fontFamily: 'var(--font-mono)',
            }}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ---- ProgressBar ----
export function ProgressBar({ value, max = 100, color = 'var(--accent)', label }: {
  value: number; max?: number; color?: string; label?: string
}) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div>
      {label && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', marginBottom: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>}
      <div className="progress">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ---- Modal ----
export function Modal({ open, onClose, title, children, width = 520 }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number
}) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width, maxWidth: '90vw', maxHeight: '85vh',
          background: '#111', borderRadius: 16,
          border: '1px solid var(--border-solid)',
          boxShadow: 'var(--shadow)',
          overflow: 'auto',
          animation: 'slideIn 0.2s ease',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border-solid)',
        }}>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--white)',
          }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid var(--border-solid)', cursor: 'pointer',
              color: 'var(--gray)', fontSize: 16, padding: '2px 8px', borderRadius: 8,
              transition: 'all 0.2s',
            }}
          >×</button>
        </div>
        <div style={{ padding: 20 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ---- Drawer ----
export function Drawer({ open, onClose, title, children, width = 720 }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number
}) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)',
        display: 'flex', justifyContent: 'flex-end',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width, maxWidth: '95vw', height: '100%',
          background: '#111', borderLeft: '1px solid var(--border-solid)',
          boxShadow: 'var(--shadow)',
          overflow: 'auto',
          animation: 'slideIn 0.2s ease',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border-solid)',
        }}>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--white)',
          }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid var(--border-solid)', cursor: 'pointer',
              color: 'var(--gray)', fontSize: 16, padding: '2px 8px', borderRadius: 8,
              transition: 'all 0.2s',
            }}
          >×</button>
        </div>
        <div style={{ padding: 20 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
