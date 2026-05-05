import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { adminFetch, AdminUnauthorizedError } from '@/lib/admin'
import { Button } from '@/components/ui/button'

interface SeasonPass {
  id: string
  code: string
  holder_name: string | null
  holder_email: string | null
  year: number
  status: 'pending_payment' | 'active' | 'cancelled'
  stripe_checkout_session_id: string | null
  created_at: string
  use_count: number
}

async function fetchPasses(): Promise<SeasonPass[]> {
  const res = await adminFetch('/api/admin/season-passes')
  if (!res.ok) throw new Error(`Failed to fetch passes: ${res.status}`)
  return res.json()
}

async function issuePasses(payload: { name: string; email: string }): Promise<SeasonPass> {
  const res = await adminFetch('/api/admin/season-passes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Failed to issue pass: ${res.status}`)
  return res.json()
}

async function revokePass(id: string): Promise<void> {
  const res = await adminFetch(`/api/admin/season-passes?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
  })
  if (!res.ok) throw new Error(`Failed to revoke pass: ${res.status}`)
}

const STATUS_BADGE: Record<SeasonPass['status'], string> = {
  active: 'bg-teal-50 text-teal-700',
  pending_payment: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-red-50 text-red-600',
}

export default function AdminSeasonPasses() {
  const queryClient = useQueryClient()
  const passesQuery = useQuery({ queryKey: ['admin', 'season-passes'], queryFn: fetchPasses })

  const revokeMutation = useMutation({
    mutationFn: revokePass,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'season-passes'] }),
  })

  const [issueOpen, setIssueOpen] = useState(false)

  if (passesQuery.isError) {
    if (passesQuery.error instanceof AdminUnauthorizedError) {
      return <p className="text-red-600">Session expired. Please sign in again.</p>
    }
    return <p className="text-red-600">Failed to load passes.</p>
  }

  const passes = passesQuery.data ?? []
  const activeCount = passes.filter((p) => p.status === 'active').length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Season Passes</h1>
          <p className="mt-1 text-sm text-gray-500">
            {activeCount} active pass{activeCount !== 1 ? 'es' : ''} — covers non-Open division fees
            for the 2026 season.
          </p>
        </div>
        <Button type="button" onClick={() => setIssueOpen(true)}>
          + Issue pass
        </Button>
      </div>

      {issueOpen && (
        <IssuePassForm
          onIssued={() => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'season-passes'] })
            setIssueOpen(false)
          }}
          onCancel={() => setIssueOpen(false)}
        />
      )}

      {passesQuery.isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : passes.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No passes yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Holder
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Uses
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Created
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {passes.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">
                    {p.code}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.holder_name ?? '—'}</p>
                    {p.holder_email && <p className="text-xs text-gray-500">{p.holder_email}</p>}
                    {!p.stripe_checkout_session_id && (
                      <p className="text-xs text-gray-400 italic">admin-issued</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[p.status]}`}
                    >
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">{p.use_count}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {format(parseISO(p.created_at), 'MM/dd/yyyy')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Revoke pass ${p.code}? This cannot be undone.`)) {
                            revokeMutation.mutate(p.id)
                          }
                        }}
                        disabled={revokeMutation.isPending}
                        className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-40"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface IssuePassFormProps {
  onIssued: () => void
  onCancel: () => void
}

function IssuePassForm({ onIssued, onCancel }: IssuePassFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: issuePasses,
    onSuccess: onIssued,
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to issue pass'),
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    mutation.mutate({ name: name.trim(), email: email.trim() })
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-bold text-gray-900">Issue season pass</h2>
      <p className="text-sm text-gray-500">
        The pass will be active immediately (no payment required). Holder name and email are
        optional but recommended.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Holder name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Holder email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200"
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Issuing…' : 'Issue pass'}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
