import { format, parseISO } from 'date-fns'
import { MapPin } from 'lucide-react'
import type { Tournament } from '@/api/tournaments'

interface TournamentHeroProps {
  tournament: Tournament
}

function formatDateRange(start: string, end: string | null): string {
  const s = parseISO(start)
  if (!end || end === start) return format(s, 'MMMM d, yyyy')
  const e = parseISO(end)
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${format(s, 'MMMM d')}–${format(e, 'd, yyyy')}`
  }
  return `${format(s, 'MMMM d')} – ${format(e, 'MMMM d, yyyy')}`
}

function LocationLink({
  city,
  state,
  mapsUrl,
  className,
}: {
  city: string | null
  state: string | null
  mapsUrl: string | null
  className: string
}) {
  const label = [city, state].filter(Boolean).join(', ')
  if (!label) return null
  if (!mapsUrl)
    return (
      <span className={className}>
        <MapPin size={14} />
        {label}
      </span>
    )
  return (
    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={className}>
      <MapPin size={14} />
      {label} — Open in Maps
    </a>
  )
}

export default function TournamentHero({ tournament }: TournamentHeroProps) {
  const {
    name,
    start_date,
    end_date,
    location_city,
    location_state,
    location_address,
    hero_image_url,
  } = tournament

  const locationParts = [location_address, location_city, location_state].filter(Boolean).join(', ')
  const mapsUrl = locationParts
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationParts)}`
    : null
  const dateRange = formatDateRange(start_date, end_date)

  return (
    <div className="relative w-full overflow-hidden">
      {hero_image_url ? (
        <div className="relative h-64 w-full sm:h-80 md:h-96">
          <img src={hero_image_url} alt={name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
            <h1 className="text-3xl font-black text-white drop-shadow sm:text-4xl md:text-5xl">
              {name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-white/90">
              <span className="text-sm font-medium">{dateRange}</span>
              {(location_city || location_state) && <span className="text-white/50">·</span>}
              <LocationLink
                city={location_city}
                state={location_state}
                mapsUrl={mapsUrl}
                className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-2 hover:text-teal-300 transition-colors"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-teal-500 to-teal-700 px-6 py-12 sm:px-8 sm:py-16">
          <h1 className="text-3xl font-black text-white sm:text-4xl md:text-5xl">{name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-white/90">
            <span className="text-sm font-medium">{dateRange}</span>
            {(location_city || location_state) && <span className="text-white/50">·</span>}
            <LocationLink
              city={location_city}
              state={location_state}
              mapsUrl={mapsUrl}
              className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-2 hover:text-teal-200 transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  )
}
