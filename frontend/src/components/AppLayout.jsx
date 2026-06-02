import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Activity,
  BellRing,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Star,
  X,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/watchlist', label: 'Watchlist', icon: Star },
  { to: '/alerts', label: 'Alerts', icon: BellRing },
  { to: '/history', label: 'History', icon: History },
]

function AppLayout() {
  const navigate = useNavigate()
  const [isNavOpen, setIsNavOpen] = useState(false)

  const closeNav = () => setIsNavOpen(false)

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = isNavOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isNavOpen])

  function handleSignOut() {
    closeNav()
    localStorage.removeItem('crypto_alert_token')
    navigate('/login', { replace: true })
  }

  return (
    <div className={`app-shell ${isNavOpen ? 'is-nav-open' : ''}`}>
      <button
        type="button"
        className="nav-scrim"
        aria-label="Close navigation"
        tabIndex={isNavOpen ? 0 : -1}
        onClick={closeNav}
      />

      <aside className="sidebar" aria-label="Primary">
        <div className="sidebar-brand">
          <Link to="/dashboard" className="brand" onClick={closeNav}>
            <span className="brand-mark" aria-hidden="true">
              <Activity size={18} strokeWidth={2.4} />
            </span>
            <span className="brand-name">CryptoAlert</span>
          </Link>
          <button
            type="button"
            className="icon-btn sidebar-close"
            aria-label="Close navigation"
            onClick={closeNav}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-section">Workspace</span>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeNav}
              className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
            >
              <Icon size={17} strokeWidth={2} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <button type="button" className="nav-item nav-signout" onClick={handleSignOut}>
            <LogOut size={17} strokeWidth={2} aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="mobile-topbar">
          <button
            type="button"
            className="icon-btn"
            aria-label="Open navigation"
            aria-expanded={isNavOpen}
            onClick={() => setIsNavOpen(true)}
          >
            <Menu size={20} strokeWidth={2} />
          </button>
          <Link to="/dashboard" className="brand brand--compact" onClick={closeNav}>
            <span className="brand-mark" aria-hidden="true">
              <Activity size={16} strokeWidth={2.4} />
            </span>
            <span className="brand-name">CryptoAlert</span>
          </Link>
          <span className="mobile-topbar-spacer" aria-hidden="true" />
        </header>

        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AppLayout
