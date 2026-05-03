import { useState } from 'react'
import { setAdminToken } from '@/lib/admin'

interface AdminLoginProps {
  onAuthed: () => void
}

export default function AdminLogin({ onAuthed }: AdminLoginProps) {
  const [token, setToken] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!token.trim()) return
    setAdminToken(token.trim())
    onAuthed()
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4">
      <h1 className="mb-2 text-2xl font-black text-gray-900">Admin</h1>
      <p className="mb-6 text-sm text-gray-500">
        Enter your admin token to continue. Stored in this tab only.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <input
          type="password"
          autoFocus
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Admin token"
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200"
        />
        <button
          type="submit"
          className="block w-full rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
        >
          Sign in
        </button>
      </form>
    </div>
  )
}
