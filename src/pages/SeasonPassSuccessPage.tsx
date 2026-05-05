import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'

type Status = 'polling' | 'active' | 'timeout' | 'not_found'

interface ConfirmResponse {
  status: string
  code: string | null
  holder_name: string | null
}

const MAX_ATTEMPTS = 15
const POLL_INTERVAL_MS = 2000

export default function SeasonPassSuccessPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [status, setStatus] = useState<Status>(sessionId ? 'polling' : 'not_found')
  const [passCode, setPassCode] = useState<string | null>(null)
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
          `/api/confirm-season-pass?session_id=${encodeURIComponent(sessionId!)}`,
        )
        if (res.status === 404) {
          if (!cancelled) setStatus('not_found')
          return
        }
        if (res.ok) {
          const data = (await res.json()) as ConfirmResponse
          if (data.status === 'active') {
            if (!cancelled) {
              setPassCode(data.code)
              setStatus('active')
            }
            return
          }
        }
      } catch {
        // keep polling
      }

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        if (!cancelled) setStatus('timeout')
        return
      }

      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
    }

    timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [sessionId])

  if (status === 'polling') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
        <h1 className="mt-6 text-2xl font-black text-gray-900">Activating your pass…</h1>
        <p className="mt-2 text-gray-500">This usually takes just a few seconds.</p>
      </div>
    )
  }

  if (status === 'active') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="mt-4 text-3xl font-black text-gray-900">Your pass is active!</h1>
        <p className="mt-3 text-gray-600">
          We've emailed your season pass code. You can also save it here:
        </p>

        {passCode && (
          <div className="mt-6 rounded-xl border-2 border-dashed border-teal-400 bg-teal-50 px-6 py-5 text-center">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-teal-600">
              Your Season Pass Code
            </p>
            <p className="font-mono text-2xl font-black tracking-[0.15em] text-teal-700">
              {passCode}
            </p>
          </div>
        )}

        <p className="mt-4 text-sm text-gray-500">
          Enter this code in the "Season Pass Code" field next to your name when registering for any
          non-Open division tournament.
        </p>

        <Link
          to="/tournaments"
          className="mt-8 inline-block rounded-lg bg-teal-400 px-6 py-3 font-semibold text-white hover:bg-teal-500 transition-colors"
        >
          Browse tournaments
        </Link>
      </div>
    )
  }

  if (status === 'timeout') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="text-5xl">⏳</div>
        <h1 className="mt-4 text-3xl font-black text-gray-900">Still activating…</h1>
        <p className="mt-3 text-gray-600">
          Payment received — your pass code will be emailed shortly. If you don't see it within 5
          minutes, contact us at{' '}
          <a href="mailto:info@volleymonster.com" className="text-teal-600 underline">
            info@volleymonster.com
          </a>
          .
        </p>
        <Link
          to="/tournaments"
          className="mt-8 inline-block rounded-lg bg-teal-400 px-6 py-3 font-semibold text-white hover:bg-teal-500 transition-colors"
        >
          Browse tournaments
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl font-black text-gray-900">Pass not found</h1>
      <p className="mt-3 text-gray-600">
        We couldn't find your season pass. If you believe this is an error, please contact us.
      </p>
      <Link
        to="/season-pass"
        className="mt-8 inline-block rounded-lg bg-teal-400 px-6 py-3 font-semibold text-white hover:bg-teal-500 transition-colors"
      >
        Back to season pass
      </Link>
    </div>
  )
}
