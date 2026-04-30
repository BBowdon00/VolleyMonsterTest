import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRegistration } from './registrationStore'
import { clearRegistrationSession } from './registrationStore'

interface CheckoutResponse {
  url: string
}

export default function StepReview() {
  const { state, dispatch } = useRegistration()
  const { captain, dayEntries } = state
  const [agreedToRules, setAgreedToRules] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const totalCents = dayEntries.reduce((sum, e) => sum + e.feeCents, 0)

  async function handleSubmit() {
    if (!agreedToRules) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const payload = {
        captain,
        dayEntries: dayEntries.map((entry) => ({
          tournamentDayId: entry.tournamentDayId,
          divisionId: entry.divisionId,
          teamName: entry.teamName,
          players: entry.players,
        })),
        agreedToRules: true as const,
      }

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.text()
        let message = `Request failed (${res.status})`
        try {
          const parsed = JSON.parse(body) as { error?: string }
          if (parsed.error) message = parsed.error
        } catch {
          // use default message
        }
        throw new Error(message)
      }

      const data = (await res.json()) as CheckoutResponse
      if (!data.url) throw new Error('No checkout URL returned from server.')

      clearRegistrationSession()
      dispatch({ type: 'RESET' })

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  function handleBack() {
    dispatch({ type: 'SET_STEP', step: 'roster' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Review Your Order</h2>
        <p className="mt-1 text-sm text-gray-500">
          Double-check everything before continuing to payment.
        </p>
      </div>

      {/* Contact info */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-1">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Contact
        </h3>
        <p className="font-medium text-gray-900">{captain.name}</p>
        <p className="text-sm text-gray-600">{captain.email}</p>
        <p className="text-sm text-gray-600">{captain.phone}</p>
        <p className="text-sm text-gray-600">{captain.city}</p>
      </section>

      {/* Day entries */}
      <div className="space-y-4">
        {dayEntries.map((entry) => (
          <section
            key={entry.tournamentDayId}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{entry.dayLabel}</h3>
                <p className="text-sm text-gray-500">{entry.divisionDisplayName}</p>
              </div>
              <span className="text-sm font-semibold text-gray-800">
                ${(entry.feeCents / 100).toFixed(2)}
              </span>
            </div>

            <p className="text-sm font-medium text-gray-700 mb-2">
              Team: <span className="text-gray-900">{entry.teamName}</span>
            </p>

            <ul className="space-y-1">
              {entry.players.map((player, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span>{player.name}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Order total */}
      <div className="rounded-lg bg-gray-50 px-4 py-3 flex items-center justify-between">
        <span className="font-medium text-gray-700">Order Total</span>
        <span className="text-xl font-black text-gray-900">${(totalCents / 100).toFixed(2)}</span>
      </div>

      {/* Rules agreement */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreedToRules}
          onChange={(e) => setAgreedToRules(e.target.checked)}
          className="mt-0.5 h-5 w-5 rounded border-gray-300 text-teal-500 focus:ring-teal-400"
        />
        <span className="text-sm text-gray-700">
          I have read and agree to the{' '}
          <a
            href="/rules"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 underline hover:text-teal-700"
          >
            tournament rules
          </a>
          . I understand that fees are non-refundable except as specified in the rules.
        </span>
      </label>

      {/* Error message */}
      {submitError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={handleBack} disabled={isSubmitting}>
          ← Back
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!agreedToRules || isSubmitting}
          className="min-w-40"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Processing…
            </span>
          ) : (
            'Continue to Payment →'
          )}
        </Button>
      </div>
    </div>
  )
}
