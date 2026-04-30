import type { TournamentDayWithDivisions } from '@/api/tournaments'

interface RegisteredTeamsListProps {
  day: TournamentDayWithDivisions
}

export default function RegisteredTeamsList({ day }: RegisteredTeamsListProps) {
  const divisionsWithTeams = day.divisions.filter((d) => d.confirmedTeamCount > 0)

  if (divisionsWithTeams.length === 0) {
    return (
      <p className="py-4 text-sm text-gray-500 italic">
        No confirmed teams yet — be the first to register!
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {divisionsWithTeams.map((division) => (
        <details key={division.id} className="group rounded-lg border border-gray-200 bg-white">
          <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 font-medium text-gray-800 hover:bg-gray-50 transition-colors list-none">
            <span>{division.display_name}</span>
            <span className="flex items-center gap-2 text-sm text-gray-500">
              <span>
                {division.confirmedTeamCount} team{division.confirmedTeamCount !== 1 ? 's' : ''}
              </span>
              <svg
                className="h-4 w-4 transition-transform group-open:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </summary>
          <div className="border-t border-gray-100 px-4 py-3">
            <p className="text-sm text-gray-500 italic">
              Team roster details will be available once registration is confirmed.
            </p>
          </div>
        </details>
      ))}
    </div>
  )
}
