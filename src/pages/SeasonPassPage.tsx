import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SeasonPassPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/create-season-pass-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase() }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? `Request failed (${res.status})`)
      }

      const { url } = (await res.json()) as { url: string }
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <span className="inline-block rounded-full bg-teal-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-teal-600 ring-1 ring-teal-400/30 mb-4">
          2026 Season
        </span>
        <h1 className="text-4xl font-black text-gray-900 sm:text-5xl">Season Pass</h1>
        <p className="mt-3 text-2xl font-bold text-teal-600">$300</p>
      </div>

      {/* Benefits */}
      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">What's included</h2>
        <ul className="space-y-3">
          {[
            'Covers your individual registration fee for every non-Open division tournament in the 2026 season',
            'Works for any team size — doubles, triples, quads, or sixes',
            'Per person: your share of the team fee is always free',
            'Valid at all Volley Monster tournaments through December 31, 2026',
            'Your unique code is emailed instantly after purchase',
          ].map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600 font-bold text-xs">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>

        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <strong>Note:</strong> The Open (top-tier) division is not covered. All other divisions —
          AA, A, BB/B, Rec, and juniors — are included.
        </div>
      </div>

      {/* How it works */}
      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 space-y-3">
        <h2 className="text-lg font-bold text-gray-900">How it works</h2>
        <ol className="space-y-2">
          {[
            "Purchase your pass below — you'll get a unique code by email.",
            'When registering for a tournament, enter your code in the "Season Pass Code" field next to your name.',
            'Your share of the team fee is automatically deducted. If all teammates have passes, registration is free.',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 font-bold text-xs">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Purchase form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Purchase your pass</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pass-name">Full name</Label>
            <Input
              id="pass-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="pass-email">Email address</Label>
            <Input
              id="pass-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="mt-1"
            />
            <p className="mt-1 text-xs text-gray-500">Your pass code will be sent here.</p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || !name.trim() || !email.trim()}
            className="w-full"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Redirecting to payment…
              </span>
            ) : (
              'Purchase Season Pass — $300'
            )}
          </Button>

          <p className="text-center text-xs text-gray-400">
            Secure checkout via Stripe. No refunds once issued.
          </p>
        </form>
      </div>
    </div>
  )
}
