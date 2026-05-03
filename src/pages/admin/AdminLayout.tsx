import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { getAdminToken } from '@/lib/admin'
import AdminLogin from '@/components/admin/AdminLogin'
import AdminNav from '@/components/admin/AdminNav'

export default function AdminLayout() {
  const [authed, setAuthed] = useState<boolean>(() => Boolean(getAdminToken()))

  useEffect(() => {
    document.title = 'Admin — Volley Monster'
    return () => {
      document.title = 'Volley Monster'
    }
  }, [])

  if (!authed) {
    return <AdminLogin onAuthed={() => setAuthed(true)} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav onSignOut={() => setAuthed(false)} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
