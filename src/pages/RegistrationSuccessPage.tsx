import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'

type PollStatus = 'polling' | 'paid' | 'timeout' | 'not_found'

interface ConfirmResponse {
  status: string
  order_id: string
  captain_email: string
}

const MAX_ATTEMPTS = 15
const POLL_INTERVAL_MS = 2000

export default function RegistrationSuccessPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')

  // If there's no session_id, immediately show not_found; no polling needed.
  const [pollStatus, setPollStatus] = useState<PollStatus>(sessionId ? 'polling' : 'not_found')
  const [captainEmail, setCaptainEmail] = useState<string | null>(null)
  const attemptsRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!sessionId) return

    let cancelled = false

    async function poll() {
      if (cancelled) return

      attemptsRef.current += 1

      try {
        const res = await fetch(
          `/api/confirm-registration?session_id=${encodeURIComponent(sessionId!)}`,
        )

        if (res.status === 404) {
          if (!cancelled) setPollStatus('not_found')
          return
        }

        if (res.ok) {
          const data = (await res.json()) as ConfirmResponse
          if (data.status === 'paid') {
            if (!cancelled) {
              setCaptainEmail(data.captain_email)
              setPollStatus('paid')
            }
            return
          }
        }
      } catch {
        // Network error — keep polling
      }

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        if (!cancelled) setPollStatus('timeout')
        return
      }

      // Schedule next poll
      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
    }

    // Start first poll after initial delay
    timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [sessionId])

  if (pollStatus === 'polling') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
        <h1 className="mt-4 text-2xl font-black text-gray-900">Confirming your payment…</h1>
        <p className="mt-2 text-gray-500">This usually takes just a few seconds.</p>
      </div>
    )
  }

  if (pollStatus === 'paid') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="mt-4 text-3xl font-black text-gray-900">You're in!</h1>
        <p className="mt-3 text-gray-600">
          Check your email{captainEmail ? ` at ${captainEmail}` : ''} for confirmation details and
          your team management link.
        </p>
        <Link
          to="/tournaments"
          className="mt-8 inline-block rounded-lg bg-teal-400 px-6 py-3 font-semibold text-white hover:bg-teal-500 transition-colors"
        >
          Back to tournaments
        </Link>
      </div>
    )
  }

  if (pollStatus === 'timeout') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="text-5xl">✅</div>
        <h1 className="mt-4 text-3xl font-black text-gray-900">Payment received</h1>
        <p className="mt-3 text-gray-600">
          Your confirmation email is on its way. If you don't see it within a few minutes, check
          your spam folder.
        </p>
        <Link
          to="/tournaments"
          className="mt-8 inline-block rounded-lg bg-teal-400 px-6 py-3 font-semibold text-white hover:bg-teal-500 transition-colors"
        >
          Back to tournaments
        </Link>
      </div>
    )
  }

  // not_found
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl font-black text-gray-900">Registration not found</h1>
      <p className="mt-3 text-gray-600">
        We couldn't find your registration. If you believe this is an error, please contact us.
      </p>
      <Link
        to="/tournaments"
        className="mt-8 inline-block rounded-lg bg-teal-400 px-6 py-3 font-semibold text-white hover:bg-teal-500 transition-colors"
      >
        Back to tournaments
      </Link>
    </div>
  )
}
