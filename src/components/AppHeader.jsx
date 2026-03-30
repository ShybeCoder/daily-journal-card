import { CalendarDays, LogOut, NotebookPen, Settings2 } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import SettingsModal from './SettingsModal.jsx'
import { useTheme } from '../context/ThemeContext.jsx'

function navClass({ isActive }) {
  return [
    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-[var(--theme-nav-active)] text-white shadow-sm'
      : 'bg-white/70 text-[var(--color-ink)] hover:bg-white',
  ].join(' ')
}

export default function AppHeader({ title, subtitle }) {
  const { logout } = useAuth()
  const { openSettings } = useTheme()

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/50 bg-[color:var(--theme-header)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-display text-4xl leading-none text-[var(--color-ink)]">
              {title}
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <NavLink className={navClass} to="/today">
              <NotebookPen className="h-4 w-4" />
              Today
            </NavLink>
            <NavLink className={navClass} to="/calendar">
              <CalendarDays className="h-4 w-4" />
              Calendar
            </NavLink>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white"
              onClick={openSettings}
              type="button"
            >
              <Settings2 className="h-4 w-4" />
              Settings
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-rose-200)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-rose-300)]"
              onClick={logout}
              type="button"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
        </div>
      </header>
      <SettingsModal />
    </>
  )
}
