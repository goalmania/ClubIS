'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const nav = [
  { label: 'Dashboard', href: '/admin', icon: 'Home' },
  { label: 'Club', href: '/admin/clubs', icon: 'Shield' },
  { label: 'Utenti', href: '/admin/utenti', icon: 'Users' },
  { label: 'Abbonamenti', href: '/admin/abbonamenti', icon: 'Euro' },
  { label: 'Statistiche', href: '/admin/statistiche', icon: 'Chart' },
]

const icons: Record<string, () => JSX.Element> = {
  Home: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Shield: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Users: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Euro: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 20.1 8 8 0 0 0 19 18"/></svg>,
  Chart: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>,
  LogOut: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>,
}

export default function AdminSidebar({ utente }: { utente: { nome: string; cognome: string } }) {
  const pathname = usePathname()
  const router = useRouter()
  const iniziali = `${utente.nome[0] ?? '?'}${utente.cognome[0] ?? ''}`.toUpperCase()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside style={{
      width: 240,
      minHeight: '100vh',
      background: '#0d0d0d',
      borderRight: '1px solid var(--border-solid)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border-solid)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/clubis-logo.png" alt="ClubIS" style={{ height: 28, flexShrink: 0 }} />
          <div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14,
              letterSpacing: '0.15em', textTransform: 'uppercase',
            }}>
              <span style={{ color: 'var(--gray)' }}> / </span>
              <span style={{ color: 'var(--white)' }}>ADMIN</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Pannello di controllo</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px' }}>
        {nav.map(v => {
          const IconComp = icons[v.icon]
          const attiva = isActive(v.href)
          return (
            <Link
              key={v.href}
              href={v.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px',
                borderRadius: 2,
                fontFamily: 'var(--font-display)',
                fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                textDecoration: 'none',
                marginBottom: 1,
                background: attiva ? 'rgba(200,240,0,0.06)' : 'transparent',
                color: attiva ? 'var(--accent)' : 'var(--gray)',
                fontWeight: attiva ? 600 : 500,
                borderLeft: attiva ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <IconComp />
              <span>{v.label}</span>
            </Link>
          )
        })}

        <div style={{ height: 1, background: 'var(--border-solid)', margin: '12px 8px' }} />

        <Link
          href="/dashboard/presidente"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 2,
            fontFamily: 'var(--font-display)', fontSize: '0.78rem',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            textDecoration: 'none',
            color: 'var(--gray)',
            transition: 'all 0.15s',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          <span>Torna al club</span>
        </Link>
      </nav>

      {/* Utente */}
      <div style={{
        padding: '12px 12px',
        borderTop: '1px solid var(--border-solid)',
        display: 'flex', alignItems: 'center', gap: 9,
        background: '#0d0d0d',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 2,
          background: 'var(--accent-red-lt)', color: 'var(--accent-red)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          flexShrink: 0, border: '1px solid rgba(255,68,68,0.2)',
        }}>
          {iniziali}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600,
            letterSpacing: '0.05em', textTransform: 'uppercase',
            color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {utente.nome} {utente.cognome}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', letterSpacing: '0.08em' }}>Super Admin</div>
        </div>
        <button
          onClick={handleLogout}
          title="Esci"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--gray)', padding: 4, borderRadius: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <icons.LogOut />
        </button>
      </div>
    </aside>
  )
}
