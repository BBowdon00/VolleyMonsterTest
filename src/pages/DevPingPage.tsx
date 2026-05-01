import { useEffect, useState } from 'react'

type PingResult =
  | { status: 'loading' }
  | { status: 'success'; data: unknown }
  | { status: 'error'; message: string }

export default function DevPingPage() {
  const [result, setResult] = useState<PingResult>({ status: 'loading' })

  useEffect(() => {
    fetch('/api/health')
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) {
          setResult({ status: 'success', data })
        } else {
          setResult({ status: 'error', message: `HTTP ${res.status}` })
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        setResult({ status: 'error', message })
      })
  }, [])

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="mb-6 text-2xl font-black text-gray-900">Dev Ping — Netlify Functions</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <p className="mb-2 font-semibold text-gray-700">
          Query: <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">GET /api/health</code>
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
