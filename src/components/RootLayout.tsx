import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

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
            <span className="text-xl font-black tracking-tight text-teal-600 md:text-2xl">
              Volley
            </span>
            <span className="text-xl font-black tracking-tight text-flame-600 md:text-2xl">
              Monster
            </span>
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
          <nav
            className="border-t border-gray-100 bg-white px-4 pb-4 md:hidden"
            aria-label="Mobile navigation"
          >
            <ul className="space-y-1 pt-2">
              {navLinks.map(({ to, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-50',
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
              <Link to="/rules" className="hover:text-white transition-colors">
                Rules
              </Link>
              <span className="text-gray-600">·</span>
              <Link to="/about" className="hover:text-white transition-colors">
                About
              </Link>
              <span className="text-gray-600">·</span>
              <a
                href="mailto:info@volleymonster.com"
                className="hover:text-white transition-colors"
              >
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
                <InstagramIcon size={18} />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=100088432883364"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Volley Monster on Facebook"
                className="rounded-full p-2 transition-colors hover:bg-gray-700"
              >
                <FacebookIcon size={18} />
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
