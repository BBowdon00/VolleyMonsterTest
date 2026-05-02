import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import type { TournamentSummary } from '@/api/tournaments'

interface TournamentCardProps {
  tournament: TournamentSummary
}

function formatDateRange(startDate: string, endDate: string | null): string {
  const start = parseISO(startDate)
  if (!endDate || endDate === startDate) return format(start, 'MMMM d, yyyy')
  const end = parseISO(endDate)
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${format(start, 'MMMM d')}–${format(end, 'd, yyyy')}`
  }
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
}

function countDivisions(tournament: TournamentSummary): number {
  return tournament.tournament_days.reduce((total, day) => total + day.divisions.length, 0)
}

export default function TournamentCard({ tournament }: TournamentCardProps) {
  const divisionCount = countDivisions(tournament)
  const dateLabel = formatDateRange(tournament.start_date, tournament.end_date)

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Hero image or placeholder */}
      {tournament.hero_image_url ? (
        <img
          src={tournament.hero_image_url}
          alt={tournament.name}
          className="aspect-[4/5] w-full bg-gray-50 object-contain"
        />
      ) : (
        <div
          className="aspect-[4/5] w-full bg-gradient-to-br from-teal-400 to-teal-600"
          aria-hidden="true"
        />
      )}

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-gray-900">{tournament.name}</h3>

        <div className="mt-2 space-y-1 text-sm text-gray-500">
          <p>{dateLabel}</p>
          {(tournament.location_city || tournament.location_state) && (
            <p>
              {[tournament.location_city, tournament.location_state].filter(Boolean).join(', ')}
            </p>
          )}
          {divisionCount > 0 && (
            <p>
              {divisionCount} {divisionCount === 1 ? 'division' : 'divisions'}
            </p>
          )}
        </div>

        <div className="mt-auto pt-5">
          <Link
            to={`/tournaments/${tournament.slug}`}
            className="block w-full rounded-lg bg-flame-500 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-flame-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-500"
          >
            Register
          </Link>
        </div>
      </div>
    </article>
  )
}
