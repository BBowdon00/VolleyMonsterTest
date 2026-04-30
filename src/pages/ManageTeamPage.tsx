// Task 3.1 — full implementation pending Supabase (Task 0.2)
import { useParams } from 'react-router-dom'

export default function ManageTeamPage() {
  const { token } = useParams<{ token: string }>()
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-black text-gray-900">Manage your team</h1>
      <p className="mt-4 text-sm text-gray-400">Token: {token}</p>
    </div>
  )
}
