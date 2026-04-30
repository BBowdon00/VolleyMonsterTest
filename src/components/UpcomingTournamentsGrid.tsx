import { useUpcomingTournaments } from '@/api/tournaments'
import TournamentCard from './TournamentCard'

interface UpcomingTournamentsGridProps {
  limit?: number
}

export default function UpcomingTournamentsGrid({ limit }: UpcomingTournamentsGridProps) {
  const { data: tournaments, isLoading, isError, error } = useUpcomingTournaments(limit)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: limit ?? 3 }).map((_, i) => (
          <div
            key={i}
            className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-gray-100"
            aria-hidden="true"
          />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-center text-red-600">
        {error instanceof Error ? error.message : 'Failed to load tournaments.'}
      </p>
    )
  }

  if (!tournaments || tournaments.length === 0) {
    return (
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
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {tournaments.map((tournament) => (
        <TournamentCard key={tournament.id} tournament={tournament} />
      ))}
    </div>
  )
}
