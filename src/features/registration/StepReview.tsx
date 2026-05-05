import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRegistration, clearRegistrationSession } from './registrationStore'
import type { DayEntry } from './registrationStore'

interface CheckoutResponse {
  url?: string
  order_id: string
  free?: boolean
}

function computeDiscount(entry: DayEntry): number {
  // Open division is excluded from season pass discounts
  if (entry.skillLevel === 'Open') return 0
  const uniqueCodes = [
    ...new Set(
      entry.players
        .map((p) => p.passCode?.trim().toUpperCase())
        .filter((c): c is string => Boolean(c)),
    ),
  ]
  if (uniqueCodes.length === 0) return 0
  return Math.min(
    Math.floor((entry.feeCents * uniqueCodes.length) / entry.teamSize),
    entry.feeCents,
  )
}

export default function StepReview() {
  const { state, dispatch } = useRegistration()
  const { captain, dayEntries } = state
  const [agreedToRules, setAgreedToRules] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const discounts = dayEntries.map(computeDiscount)
  const totalCents = dayEntries.reduce((sum, e, i) => sum + e.feeCents - (discounts[i] ?? 0), 0)
  const hasAnyDiscount = discounts.some((d) => d > 0)

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
          players: entry.players.map((p) => ({ name: p.name, passCode: p.passCode || undefined })),
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
          const parsed = JSON.parse(body) as { error?: string; codes?: string[] }
          if (parsed.error === 'invalid_pass_codes' && parsed.codes?.length) {
            message = `Invalid season pass code(s): ${parsed.codes.join(', ')}. Go back and check the codes entered.`
          } else if (parsed.error) {
            message = parsed.error
          }
        } catch {
          // use default message
        }
        throw new Error(message)
      }

      const data = (await res.json()) as CheckoutResponse

      clearRegistrationSession()
      dispatch({ type: 'RESET' })

      if (data.free) {
        window.location.href = `/registration/success?order_id=${data.order_id}`
        return
      }

      if (!data.url) throw new Error('No checkout URL returned from server.')
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
        {dayEntries.map((entry, idx) => {
          const discount = discounts[idx] ?? 0
          const adjustedFee = entry.feeCents - discount
          const passCount = [
            ...new Set(
              entry.players
                .map((p) => p.passCode?.trim().toUpperCase())
                .filter((c): c is string => Boolean(c)),
            ),
          ].length

          return (
            <section
              key={entry.tournamentDayId}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{entry.dayLabel}</h3>
                  <p className="text-sm text-gray-500">{entry.divisionDisplayName}</p>
                </div>
                <div className="text-right">
                  {discount > 0 && (
                    <p className="text-xs text-gray-400 line-through">
                      ${(entry.feeCents / 100).toFixed(2)}
                    </p>
                  )}
                  <span className="text-sm font-semibold text-gray-800">
                    ${(adjustedFee / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              <p className="text-sm font-medium text-gray-700 mb-2">
                Team: <span className="text-gray-900">{entry.teamName}</span>
              </p>

              <ul className="space-y-1">
                {entry.players.map((player, pIdx) => (
                  <li key={pIdx} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-bold">
                      {pIdx + 1}
                    </span>
                    <span>{player.name}</span>
                    {player.passCode?.trim() && (
                      <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[0.65rem] font-mono font-semibold text-teal-700">
                        pass
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {discount > 0 && (
                <p className="mt-3 text-xs text-teal-600 font-medium">
                  Season pass discount ({passCount} of {entry.teamSize} players): −$
                  {(discount / 100).toFixed(2)}
                </p>
              )}
            </section>
          )
        })}
      </div>

      {/* Order total */}
      <div className="rounded-lg bg-gray-50 px-4 py-3 space-y-1">
        {hasAnyDiscount && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>List price</span>
            <span>${(dayEntries.reduce((s, e) => s + e.feeCents, 0) / 100).toFixed(2)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700">Order Total</span>
          <span className="text-xl font-black text-gray-900">${(totalCents / 100).toFixed(2)}</span>
        </div>
        {totalCents === 0 && (
          <p className="text-xs text-teal-600 font-medium">
            Fully covered by season passes — no payment required.
          </p>
        )}
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
          ) : totalCents === 0 ? (
            'Complete Registration →'
          ) : (
            'Continue to Payment →'
          )}
        </Button>
      </div>
    </div>
  )
}
