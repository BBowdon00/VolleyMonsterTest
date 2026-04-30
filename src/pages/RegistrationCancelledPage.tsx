import { useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { clearRegistrationSession } from '@/features/registration/registrationStore'

export default function RegistrationCancelledPage() {
  const [searchParams] = useSearchParams()
  const slug = searchParams.get('slug')
  const backHref = slug ? `/tournaments/${slug}` : '/tournaments'

  // Clear saved registration state so the captain starts fresh if they retry
  useEffect(() => {
    clearRegistrationSession()
  }, [])

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <div className="text-5xl">😔</div>
      <h1 className="mt-4 text-3xl font-black text-gray-900">Payment cancelled</h1>
      <p className="mt-3 text-gray-600">
        No worries — your registration info is saved. Ready to try again?
      </p>
      <Link
        to={backHref}
        className="mt-8 inline-block rounded-lg bg-teal-400 px-6 py-3 font-semibold text-white hover:bg-teal-500 transition-colors"
      >
        {slug ? 'Back to tournament' : 'Back to tournaments'}
      </Link>
    </div>
  )
}
