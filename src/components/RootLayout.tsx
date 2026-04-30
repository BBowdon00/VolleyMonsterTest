import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Menu, X, Instagram, Facebook } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/about', label: 'About' },
  { to: '/rules', label: 'Rules' },
]

export default function RootLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* Wordmark */}
          <Link to="/" className="flex flex-col leading-none" aria-label="Volley Monster home">
            <span className="text-xl font-black tracking-tight text-teal-600 md:text-2xl">Volley</span>
            <span className="text-xl font-black tracking-tight text-flame-600 md:text-2xl">Monster</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'text-sm font-medium transition-colors hover:text-teal-600',
                    isActive ? 'text-teal-600' : 'text-gray-700',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
            <Link
              to="/tournaments"
              className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-500"
            >
              Register Now
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <nav className="border-t border-gray-100 bg-white px-4 pb-4 md:hidden" aria-label="Mobile navigation">
            <ul className="space-y-1 pt-2">
              {navLinks.map(({ to, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-teal-50 text-teal-700'
                          : 'text-gray-700 hover:bg-gray-50',
                      )
                    }
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
              <li className="pt-2">
                <Link
                  to="/tournaments"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg bg-teal-400 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-teal-500"
                >
                  Register Now
                </Link>
              </li>
            </ul>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-gray-100 bg-gray-900 text-gray-300">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <div className="flex items-baseline gap-1 justify-center sm:justify-start">
                <span className="font-black text-teal-400">Volley</span>
                <span className="font-black text-flame-400">Monster</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Outdoor tournaments all summer long · Olney, MD
              </p>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Link to="/rules" className="hover:text-white transition-colors">Rules</Link>
              <span className="text-gray-600">·</span>
              <Link to="/about" className="hover:text-white transition-colors">About</Link>
              <span className="text-gray-600">·</span>
              <a href="mailto:info@volleymonster.com" className="hover:text-white transition-colors">
                info@volleymonster.com
              </a>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="https://www.instagram.com/the_volley_monster/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Volley Monster on Instagram"
                className="rounded-full p-2 transition-colors hover:bg-gray-700"
              >
                <Instagram size={18} />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=100088432883364"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Volley Monster on Facebook"
                className="rounded-full p-2 transition-colors hover:bg-gray-700"
              >
                <Facebook size={18} />
              </a>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-gray-600">
            © {new Date().getFullYear()} Volley Monster. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
