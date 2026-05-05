import { NavLink } from 'react-router-dom'
import { clearAdminToken } from '@/lib/admin'

const links = [
  { to: '/admin', end: true, label: 'Dashboard' },
  { to: '/admin/teams', end: false, label: 'Teams' },
  { to: '/admin/season-passes', end: false, label: 'Season Passes' },
]

interface AdminNavProps {
  onSignOut: () => void
}

export default function AdminNav({ onSignOut }: AdminNavProps) {
  function handleSignOut() {
    clearAdminToken()
    onSignOut()
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm font-bold uppercase tracking-widest text-gray-500">Admin</span>
          <nav className="flex gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  [
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  ].join(' ')
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-sm font-medium text-gray-500 hover:text-gray-800"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
