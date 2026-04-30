// Task 1.4 — full implementation pending Supabase (Task 0.2)
import { useParams } from 'react-router-dom'

export default function TournamentDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <p className="text-sm text-gray-400">Tournament: {slug}</p>
      <h1 className="mt-2 text-3xl font-black text-gray-900">Loading…</h1>
    </div>
  )
}
