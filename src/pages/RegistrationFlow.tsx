// Task 2.2 — full implementation pending Supabase + Stripe (Tasks 0.2, 2.3)
import { useParams } from 'react-router-dom'

export default function RegistrationFlow() {
  const { slug } = useParams<{ slug: string }>()
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-black text-gray-900">Register for {slug}</h1>
      <p className="mt-4 text-gray-500">Registration form coming soon.</p>
    </div>
  )
}
