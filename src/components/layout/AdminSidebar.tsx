'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import clsx from 'clsx'

const nav = [
  { label: 'Dashboard', breve: 'Home', href: '/admin', icon: 'Home' },
  { label: 'Club', breve: 'Club', href: '/admin/clubs', icon: 'Shield' },
  { label: 'Utenti', breve: 'Utenti', href: '/admin/utenti', icon: 'Users' },
  { label: 'Abbonamenti', breve: 'Piani', href: '/admin/abbonamenti', icon: 'Euro' },
  { label: 'Statistiche', breve: 'Numeri', href: '/admin/statistiche', icon: 'Chart' },
]

const icons: Record<string, () => JSX.Element> = {
  Home: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Shield: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Users: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Euro: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 20.1 8 8 0 0 0 19 18"/></svg>,
  Chart: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>,
  LogOut: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>,
  Back: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
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
  const corrente = nav.find(v => isActive(v.href))

  return (
    <>
      {/* Telefono: intestazione compatta in vetro */}
      <header className="admin-testa-mobile">
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent-red-lt)', color: '#ff8a7d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{iniziali}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 650 }}>Admin · {corrente?.label ?? 'Pannello'}</div>
          <div style={{ fontSize: 12, color: 'var(--gray)' }}>{utente.nome} {utente.cognome}</div>
        </div>
        <Link href="/dashboard/presidente" className="topbar-icon-btn" aria-label="Torna al club" title="Torna al club"><icons.Back /></Link>
        <button type="button" onClick={handleLogout} className="topbar-icon-btn" aria-label="Esci" title="Esci"><icons.LogOut /></button>
      </header>

      {/* Telefono: barra in basso con le 5 sezioni */}
      <nav className="mobile-tabbar" aria-label="Sezioni admin">
        {nav.map(v => {
          const IconComp = icons[v.icon]
          const attiva = isActive(v.href)
          return (
            <Link key={v.href} href={v.href} className={clsx('mobile-tab', { active: attiva })} aria-current={attiva ? 'page' : undefined}>
              <IconComp />
              <span className="lbl">{v.breve}</span>
            </Link>
          )
        })}
      </nav>

      {/* Computer: menu laterale in vetro */}
      <aside className="sidebar-shell admin-aside" aria-label="Menu admin" style={{ width: 240, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/clubis-logo.png" alt="ClubIS" style={{ height: 28, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 650, fontSize: 15 }}>Admin</div>
            <div style={{ fontSize: 12, color: 'var(--gray)' }}>Pannello di controllo</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map(v => {
            const IconComp = icons[v.icon]
            return (
              <Link key={v.href} href={v.href} className={clsx('sidebar-nav-link', { active: isActive(v.href) })}>
                <IconComp />
                <span>{v.label}</span>
              </Link>
            )
          })}
          <div style={{ height: 1, background: 'var(--separator)', margin: '10px 6px' }} />
          <Link href="/dashboard/presidente" className="sidebar-nav-link">
            <icons.Back />
            <span>Torna al club</span>
          </Link>
        </nav>

        <div style={{ margin: '0 10px 10px', padding: 10, borderRadius: 16, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-red-lt)', color: '#ff8a7d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{iniziali}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{utente.nome} {utente.cognome}</div>
            <div style={{ fontSize: 12, color: 'var(--gray)' }}>Super Admin</div>
          </div>
          <button onClick={handleLogout} title="Esci" aria-label="Esci" className="topbar-icon-btn" style={{ width: 34, height: 34 }}><icons.LogOut /></button>
        </div>
      </aside>
    </>
  )
}
