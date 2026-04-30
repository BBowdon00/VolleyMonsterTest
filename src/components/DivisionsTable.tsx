import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { DivisionWithTeams } from '@/api/tournaments'

interface DivisionsTableProps {
  divisions: DivisionWithTeams[]
  tournamentSlug: string
}

const GENDER_ORDER = ['mens', 'womens', 'coed', 'boys', 'girls'] as const
const GENDER_LABELS: Record<string, string> = {
  mens: "Men's",
  womens: "Women's",
  coed: 'Coed',
  boys: 'Boys',
  girls: 'Girls',
}

function DivisionRows({
  divisions,
  tournamentSlug,
}: {
  divisions: DivisionWithTeams[]
  tournamentSlug: string
}) {
  const navigate = useNavigate()

  return (
    <table className="min-w-full divide-y divide-gray-100 text-sm">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-2 text-left font-semibold text-gray-600">Level</th>
          <th className="px-4 py-2 text-left font-semibold text-gray-600">Fee</th>
          <th className="px-4 py-2 text-left font-semibold text-gray-600">Teams</th>
          <th className="px-4 py-2 text-right font-semibold text-gray-600" />
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {divisions.map((division) => {
          const feeDollars = (division.fee_cents / 100).toFixed(2)
          const capacityText =
            division.max_teams != null
              ? `${division.confirmedTeamCount} / ${division.max_teams}`
              : `${division.confirmedTeamCount}`
          const isClosed = division.status === 'closed'

          return (
            <tr key={division.id} className="transition-colors hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">
                {division.skill_level}
                {division.status === 'waitlist' && (
                  <span className="ml-2 text-xs font-normal text-amber-600">(Waitlist)</span>
                )}
                {isClosed && (
                  <span className="ml-2 text-xs font-normal text-gray-400">(Closed)</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600">${feeDollars}</td>
              <td className="px-4 py-3 text-gray-600">{capacityText}</td>
              <td className="px-4 py-3 text-right">
                <Button
                  size="sm"
                  variant={isClosed ? 'outline' : 'default'}
                  disabled={isClosed}
                  onClick={() =>
                    navigate(`/tournaments/${tournamentSlug}/register?division=${division.id}`)
                  }
                >
                  Register
                </Button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function GenderSection({
  label,
  divisions,
  tournamentSlug,
}: {
  label: string
  divisions: DivisionWithTeams[]
  tournamentSlug: string
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left"
      >
        <span className="font-semibold text-gray-800">{label}</span>
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <DivisionRows divisions={divisions} tournamentSlug={tournamentSlug} />}
    </div>
  )
}

export default function DivisionsTable({ divisions, tournamentSlug }: DivisionsTableProps) {
  if (divisions.length === 0) {
    return <p className="py-4 text-sm text-gray-500">No divisions listed for this day.</p>
  }

  const groups = GENDER_ORDER.map((gender) => ({
    gender,
    label: GENDER_LABELS[gender] ?? gender,
    divisions: divisions.filter((d) => d.gender === gender),
  })).filter((g) => g.divisions.length > 0)

  // Single gender — skip the collapsible wrapper, just show the table directly
  if (groups.length === 1) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <DivisionRows divisions={groups[0]!.divisions} tournamentSlug={tournamentSlug} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <GenderSection
          key={group.gender}
          label={group.label}
          divisions={group.divisions}
          tournamentSlug={tournamentSlug}
        />
      ))}
    </div>
  )
}
