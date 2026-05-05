import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { useRegistration } from './registrationStore'
import type { DayEntry } from './registrationStore'
import type { TournamentDetail } from '@/api/tournaments'

interface StepDaysProps {
  tournament: TournamentDetail
  initialDivisionId?: string
}

interface DaySelection {
  selected: boolean
  divisionId: string
}

export default function StepDays({ tournament, initialDivisionId }: StepDaysProps) {
  const { state, dispatch } = useRegistration()

  // Build initial selections — if we already have dayEntries (back navigation), restore them
  function buildInitialSelections(): Record<string, DaySelection> {
    const result: Record<string, DaySelection> = {}
    for (const day of tournament.tournament_days) {
      const existing = state.dayEntries.find((e) => e.tournamentDayId === day.id)
      if (existing) {
        result[day.id] = { selected: true, divisionId: existing.divisionId }
      } else {
        // Pre-select if this day has only the initialDivisionId
        const matchingDiv = day.divisions.find((d) => d.id === initialDivisionId)
        result[day.id] = {
          selected: !!matchingDiv,
          divisionId: matchingDiv?.id ?? day.divisions[0]?.id ?? '',
        }
      }
    }
    return result
  }

  const [selections, setSelections] = useState<Record<string, DaySelection>>(buildInitialSelections)

  function toggleDay(dayId: string) {
    setSelections((prev) => ({
      ...prev,
      [dayId]: { ...prev[dayId], selected: !prev[dayId].selected },
    }))
  }

  function setDivision(dayId: string, divisionId: string) {
    setSelections((prev) => ({
      ...prev,
      [dayId]: { ...prev[dayId], divisionId },
    }))
  }

  const selectedDays = tournament.tournament_days.filter((day) => selections[day.id]?.selected)

  const totalCents = selectedDays.reduce((sum, day) => {
    const divId = selections[day.id]?.divisionId
    const div = day.divisions.find((d) => d.id === divId)
    return sum + (div?.fee_cents ?? 0)
  }, 0)

  const canProceed =
    selectedDays.length > 0 &&
    selectedDays.every((day) => {
      const divId = selections[day.id]?.divisionId
      return !!divId && day.divisions.some((d) => d.id === divId)
    })

  function handleNext() {
    const entries: DayEntry[] = selectedDays.map((day) => {
      const divId = selections[day.id].divisionId
      const div = day.divisions.find((d) => d.id === divId)!
      // Keep existing entry if present (preserve roster already entered)
      const existing = state.dayEntries.find((e) => e.tournamentDayId === day.id)
      return {
        tournamentDayId: day.id,
        dayLabel: day.label,
        divisionId: divId,
        divisionDisplayName: div.display_name,
        skillLevel: div.skill_level,
        feeCents: div.fee_cents,
        teamSize: div.team_size,
        teamName: existing?.teamName ?? '',
        players:
          existing?.players ??
          Array.from({ length: div.team_size }, (_, i) => ({
            name: i === 0 ? state.captain.name || '' : '',
          })),
      }
    })
    dispatch({ type: 'SET_DAY_ENTRIES', dayEntries: entries })
    dispatch({ type: 'SET_STEP', step: 'captain' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Select Day(s) &amp; Division</h2>
        <p className="mt-1 text-sm text-gray-500">
          Choose which day(s) you&apos;d like to compete and select a division.
        </p>
      </div>

      <div className="space-y-4">
        {tournament.tournament_days.map((day) => {
          const sel = selections[day.id] ?? { selected: false, divisionId: '' }
          return (
            <div
              key={day.id}
              className={[
                'rounded-lg border-2 p-4 transition-colors',
                sel.selected ? 'border-teal-400 bg-teal-50' : 'border-gray-200 bg-white',
              ].join(' ')}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sel.selected}
                  onChange={() => toggleDay(day.id)}
                  className="mt-0.5 h-5 w-5 rounded border-gray-300 text-teal-500 focus:ring-teal-400"
                />
                <div className="flex-1 min-w-0">
                  <span className="block font-semibold text-gray-900">{day.label}</span>
                  <span className="text-sm text-gray-500">
                    {format(parseISO(day.day_date), 'MM-dd-yyyy')}
                  </span>
                </div>
              </label>

              {sel.selected && (
                <div className="mt-3 ml-8">
                  <label
                    htmlFor={`div-${day.id}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Division
                  </label>
                  <select
                    id={`div-${day.id}`}
                    value={sel.divisionId}
                    onChange={(e) => setDivision(day.id, e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    <option value="" disabled>
                      — Select a division —
                    </option>
                    {day.divisions.map((div) => (
                      <option key={div.id} value={div.id} disabled={div.status === 'closed'}>
                        {div.display_name} — ${(div.fee_cents / 100).toFixed(2)}
                        {div.status === 'waitlist' ? ' (Waitlist)' : ''}
                        {div.status === 'closed' ? ' (Closed)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Running total */}
      {selectedDays.length > 0 && (
        <div className="rounded-lg bg-gray-50 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            {selectedDays.length} day{selectedDays.length !== 1 ? 's' : ''} selected
          </span>
          <span className="text-lg font-bold text-gray-900">
            Total: ${(totalCents / 100).toFixed(2)}
          </span>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!canProceed}>
          Next →
        </Button>
      </div>
    </div>
  )
}
