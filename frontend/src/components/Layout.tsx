import { faAnglesLeft, faAnglesRight, faBars, faCalendarDays, faChartColumn, faRightFromBracket, faXmark, type IconDefinition } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { type ReactNode, useState } from 'react'

export type View = 'monthly' | 'quarterly'

type Props = { view: View; onNavigate: (v: View) => void; onLogout: () => void; children: ReactNode }

const ITEMS: { view: View; label: string; icon: IconDefinition }[] = [
  { view: 'monthly', label: 'Mês', icon: faCalendarDays },
  { view: 'quarterly', label: 'Trimestre', icon: faChartColumn },
]
const COLLAPSED_KEY = 'kahuy.sidebarCollapsed'

function Brand() {
  return (
    <span className="brand d-flex align-items-center gap-2 fs-5">
      <img src="/logo.png" alt="" />
      <span className="brand-name">kahuy</span>
    </span>
  )
}

/** Item da barra: ícone + texto; recolhida, só o ícone (o texto vira tooltip). */
function NavButton({ icon, label, active = false, collapsed = false, onClick }: { icon: IconDefinition; label: string; active?: boolean; collapsed?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`nav-link ${active ? 'active' : ''}`}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      onClick={onClick}
    >
      <FontAwesomeIcon icon={icon} className="nav-icon" />
      <span className="nav-label">{label}</span>
    </button>
  )
}

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export function Layout({ view, onNavigate, onLogout, children }: Props) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(loadCollapsed)
  const toggleCollapsed = () => {
    setCollapsed(!collapsed)
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '0' : '1')
    } catch {
      // sem storage: vale só nesta sessão
    }
  }
  const go = (v: View) => {
    onNavigate(v)
    setOpen(false)
  }

  return (
    <div className="d-md-flex">
      <aside className={`sidebar d-none d-md-flex flex-column flex-shrink-0 ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-head">
          <Brand />
        </div>
        <div className="sidebar-section">Painel</div>
        <nav className="nav flex-column gap-1" aria-label="Principal">
          {ITEMS.map((item) => (
            <NavButton key={item.view} icon={item.icon} label={item.label} active={view === item.view} collapsed={collapsed} onClick={() => go(item.view)} />
          ))}
        </nav>
        <div className="sidebar-foot mt-auto d-flex flex-column gap-1">
          <NavButton icon={collapsed ? faAnglesRight : faAnglesLeft} label={collapsed ? 'Expandir' : 'Recolher'} collapsed={collapsed} onClick={toggleCollapsed} />
          <NavButton icon={faRightFromBracket} label="Sair" collapsed={collapsed} onClick={onLogout} />
        </div>
      </aside>

      <header className="sidebar sidebar-mobile d-md-none">
        <div className="d-flex align-items-center justify-content-between px-3 py-2">
          <Brand />
          <button type="button" className="btn btn-link text-white fs-5 p-1" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Fechar menu' : 'Abrir menu'}>
            <FontAwesomeIcon icon={open ? faXmark : faBars} />
          </button>
        </div>
        {open && (
          <nav className="nav flex-column gap-1 px-2 pb-3" aria-label="Principal">
            {ITEMS.map((item) => (
              <NavButton key={item.view} icon={item.icon} label={item.label} active={view === item.view} onClick={() => go(item.view)} />
            ))}
            <div className="sidebar-foot mt-1">
              <NavButton icon={faRightFromBracket} label="Sair" onClick={onLogout} />
            </div>
          </nav>
        )}
      </header>

      <main className="flex-grow-1 p-3 p-md-4" style={{ minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
