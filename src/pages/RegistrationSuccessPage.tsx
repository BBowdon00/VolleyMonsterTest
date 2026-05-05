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
  const orderId = searchParams.get('order_id')

  const hasParam = Boolean(sessionId || orderId)
  const [pollStatus, setPollStatus] = useState<PollStatus>(hasParam ? 'polling' : 'not_found')
  const [captainEmail, setCaptainEmail] = useState<string | null>(null)
  const attemptsRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Free order: single fetch, already confirmed
    if (orderId && !sessionId) {
      fetch(`/api/confirm-registration?order_id=${encodeURIComponent(orderId)}`)
        .then((res) => (res.ok ? (res.json() as Promise<ConfirmResponse>) : null))
        .then((data) => {
          if (data?.status === 'paid') {
            setCaptainEmail(data.captain_email)
            setPollStatus('paid')
          } else {
            setPollStatus('not_found')
          }
        })
        .catch(() => setPollStatus('not_found'))
      return
    }

    // Stripe order: poll until confirmed
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

      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
    }

    timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [sessionId, orderId])

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
        <div className="text-5xl">⏳</div>
        <h1 className="mt-4 text-3xl font-black text-gray-900">Payment is processing</h1>
        <p className="mt-3 text-gray-600">
          Your charge has been received, but we're still finalizing your registration. You'll get a
          confirmation email once it's complete. If you don't see it within 5 minutes, please
          contact us.
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
