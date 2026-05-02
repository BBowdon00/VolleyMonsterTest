import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { format, parseISO, isAfter } from 'date-fns'
import { useTournament } from '@/api/tournaments'
import type { TournamentDayWithDivisions } from '@/api/tournaments'
import TournamentHero from '@/components/TournamentHero'
import DivisionsTable from '@/components/DivisionsTable'
import MarkdownRenderer from '@/components/MarkdownRenderer'

function getDefaultDayIndex(days: TournamentDayWithDivisions[]): number {
  const now = new Date()
  // Find the first day that is today or in the future
  for (let i = 0; i < days.length; i++) {
    if (!isAfter(now, parseISO(days[i].day_date))) {
      return i
    }
  }
  // All days are in the past — default to last day
  return days.length - 1
}

function useOgMeta(title: string, description: string, imageUrl: string | null) {
  useEffect(() => {
    function setMeta(property: string, content: string) {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('property', property)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    setMeta('og:title', title)
    setMeta('og:description', description)
    setMeta('og:type', 'website')
    if (imageUrl) setMeta('og:image', imageUrl)

    return () => {
      // Clean up dynamic meta on unmount
      const props = ['og:title', 'og:description', 'og:type', 'og:image']
      props.forEach((p) => {
        const el = document.querySelector<HTMLMetaElement>(`meta[property="${p}"]`)
        el?.remove()
      })
    }
  }, [title, description, imageUrl])
}

export default function TournamentDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: tournament, isLoading, isError, error } = useTournament(slug ?? '')
  const defaultDayIndex = useMemo(
    () =>
      tournament && tournament.tournament_days.length > 0
        ? getDefaultDayIndex(tournament.tournament_days)
        : null,
    // Compute once when tournament first loads; tournament reference is stable after load
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tournament?.id],
  )
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null)
  const resolvedDayIndex = activeDayIndex ?? defaultDayIndex

  // Set page title
  useEffect(() => {
    if (tournament) {
      document.title = `${tournament.name} — Volley Monster`
    } else {
      document.title = 'Tournament — Volley Monster'
    }
    return () => {
      document.title = 'Volley Monster'
    }
  }, [tournament])

  // Set OG meta
  useOgMeta(
    tournament?.name ?? 'Volley Monster Tournament',
    tournament?.description_md?.slice(0, 160) ?? 'Outdoor volleyball tournaments all summer long.',
    tournament?.hero_image_url ?? null,
  )

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading tournament…</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-gray-900">Something went wrong</h1>
        <p className="mt-2 text-gray-500">
          {error instanceof Error ? error.message : 'Failed to load tournament.'}
        </p>
        <Link
          to="/tournaments"
          className="mt-6 inline-block text-teal-600 underline hover:text-teal-700"
        >
          ← Back to tournaments
        </Link>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-gray-900">Tournament not found</h1>
        <p className="mt-2 text-gray-500">We couldn&apos;t find a tournament at this address.</p>
        <Link
          to="/tournaments"
          className="mt-6 inline-block text-teal-600 underline hover:text-teal-700"
        >
          ← Back to tournaments
        </Link>
      </div>
    )
  }

  const days = tournament.tournament_days
  const currentDayIndex = resolvedDayIndex ?? 0
  const activeDay = days[currentDayIndex] as TournamentDayWithDivisions | undefined

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <TournamentHero tournament={tournament} />

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Description */}
        {tournament.description_md && (
          <section className="mb-8">
            <MarkdownRenderer
              content={tournament.description_md}
              className="prose prose-sm max-w-none text-gray-700 [&_a]:text-teal-600 [&_a]:underline [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-800"
            />
          </section>
        )}

        {/* Day tabs */}
        {days.length > 0 && (
          <>
            {days.length > 1 && (
              <div className="mb-6 flex gap-2 border-b border-gray-200">
                {days.map((day, index) => (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => setActiveDayIndex(index)}
                    className={[
                      'pb-3 pt-1 px-4 text-sm font-medium transition-colors border-b-2 -mb-px',
                      index === currentDayIndex
                        ? 'border-teal-400 text-teal-600'
                        : 'border-transparent text-gray-500 hover:text-gray-800',
                    ].join(' ')}
                  >
                    {day.label || format(parseISO(day.day_date), 'EEEE, MMM d')}
                  </button>
                ))}
              </div>
            )}

            {activeDay && (
              <div className="space-y-8">
                {/* Schedule */}
                {activeDay.description_md && (
                  <section>
                    <h2 className="mb-3 text-lg font-bold text-gray-900">Schedule</h2>
                    <MarkdownRenderer
                      content={activeDay.description_md}
                      className="prose prose-sm max-w-none text-gray-700"
                    />
                  </section>
                )}

                {/* Divisions */}
                <section>
                  <div className="mb-3 flex items-baseline justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Divisions</h2>
                    <span className="text-xs text-gray-500">
                      Expand a category to see registered teams
                    </span>
                  </div>
                  <DivisionsTable
                    divisions={activeDay.divisions}
                    tournamentSlug={tournament.slug}
                  />
                </section>
              </div>
            )}
          </>
        )}

        {days.length === 0 && (
          <p className="py-8 text-center text-gray-500">
            Tournament day details are not yet available. Check back soon!
          </p>
        )}
      </div>
    </div>
  )
}
