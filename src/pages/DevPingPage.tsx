import { useEffect, useState } from 'react'

const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined

type PingResult =
  | { status: 'loading' }
  | { status: 'success'; data: unknown }
  | { status: 'error'; message: string }

function getInitialResult(): PingResult {
  if (!supabaseUrl || !anonKey) {
    return {
      status: 'error',
      message: 'Missing env vars: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY are not set.',
    }
  }
  return { status: 'loading' }
}

export default function DevPingPage() {
  const [result, setResult] = useState<PingResult>(getInitialResult)

  useEffect(() => {
    if (!supabaseUrl || !anonKey) return

    // Lazy-import so the throw in supabase.ts doesn't crash the whole app when env vars are missing
    import('@/lib/supabase')
      .then(({ supabase }) => supabase.from('tournaments').select('id').limit(1))
      .then(({ data, error }) => {
        if (error) {
          setResult({ status: 'error', message: error.message })
        } else {
          setResult({ status: 'success', data })
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        setResult({ status: 'error', message })
      })
  }, [])

  const keyPreview = anonKey ? anonKey.slice(0, 8) + '…' : '(not set)'

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="mb-6 text-2xl font-black text-gray-900">
        Dev Ping — Supabase + TanStack Query
      </h1>

      <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
        <p className="font-semibold text-gray-700">Environment</p>
        <ul className="mt-2 space-y-1 text-gray-600">
          <li>
            <span className="font-mono text-xs text-gray-500">VITE_SUPABASE_URL</span>:{' '}
            {supabaseUrl ? (
              <span className="text-green-700">{supabaseUrl}</span>
            ) : (
              <span className="text-red-600">(not set)</span>
            )}
          </li>
          <li>
            <span className="font-mono text-xs text-gray-500">VITE_SUPABASE_ANON_KEY</span> (first 8
            chars): <span className="font-mono text-teal-700">{keyPreview}</span>
          </li>
        </ul>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <p className="mb-2 font-semibold text-gray-700">
          Query:{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
            tournaments.select('id').limit(1)
          </code>
        </p>

        {result.status === 'loading' && <p className="text-teal-500">Loading…</p>}

        {result.status === 'success' && (
          <div>
            <p className="mb-1 font-medium text-green-700">Success</p>
            <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs text-gray-800">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}

        {result.status === 'error' && (
          <div>
            <p className="mb-1 font-medium text-red-600">Error</p>
            <pre className="overflow-x-auto rounded bg-red-50 p-3 text-xs text-red-800">
              {result.message}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
