import { useSearchParams } from 'react-router-dom'
import { useUpcomingTournaments } from '@/api/tournaments'
import type { TournamentSummary } from '@/api/tournaments'
import FilterBar from '@/components/FilterBar'
import TournamentCard from '@/components/TournamentCard'

function filterTournaments(
  tournaments: TournamentSummary[],
  month: string,
  gender: string,
): TournamentSummary[] {
  return tournaments.filter((t) => {
    if (month) {
      const tournamentMonth = String(new Date(t.start_date + 'T00:00:00').getMonth() + 1)
      if (tournamentMonth !== month) return false
    }

    if (gender) {
      const hasGender = t.tournament_days.some((day) =>
        day.divisions.some((div) => div.gender === gender),
      )
      if (!hasGender) return false
    }

    return true
  })
}

export default function TournamentsListPage() {
  const [searchParams] = useSearchParams()
  const month = searchParams.get('month') ?? ''
  const gender = searchParams.get('gender') ?? ''

  const { data: tournaments, isLoading, isError, error } = useUpcomingTournaments()

  const filtered = tournaments ? filterTournaments(tournaments, month, gender) : []

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 sm:text-4xl">Upcoming Tournaments</h1>
          <p className="mt-2 text-gray-500">Register now for beach volleyball this summer.</p>
        </div>
        <FilterBar />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-gray-100"
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-center text-red-600">
          {error instanceof Error ? error.message : 'Failed to load tournaments.'}
        </p>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <p className="text-center text-gray-500">
          No upcoming tournaments yet — follow{' '}
          <a
            href="https://www.instagram.com/the_volley_monster/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-teal-600 underline hover:text-teal-700"
          >
            @volleymonster
          </a>{' '}
          on Instagram to be the first to know.
        </p>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>
      )}
    </div>
  )
}
