// Task 2.6 — full implementation pending Stripe (Task 2.3)
import { Link } from 'react-router-dom'

export default function RegistrationCancelledPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl font-black text-gray-900">Payment cancelled</h1>
      <p className="mt-2 text-gray-600">No worries — your form data is saved. Ready to try again?</p>
      <Link
        to="/tournaments"
        className="mt-6 inline-block rounded-lg bg-teal-400 px-6 py-3 font-semibold text-white hover:bg-teal-500 transition-colors"
      >
        Back to tournaments
      </Link>
    </div>
  )
}
