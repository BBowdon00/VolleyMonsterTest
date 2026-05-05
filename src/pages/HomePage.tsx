import Hero from '@/components/Hero'
import UpcomingTournamentsGrid from '@/components/UpcomingTournamentsGrid'
import ValuePropsSection from '@/components/ValuePropsSection'
import SeasonPassBanner from '@/components/SeasonPassBanner'

export default function HomePage() {
  return (
    <>
      <Hero />

      <ValuePropsSection />

      <SeasonPassBanner />

      <section id="upcoming-tournaments" className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-8 text-2xl font-bold text-gray-900 sm:text-3xl">
            Upcoming Tournaments
          </h2>
          <UpcomingTournamentsGrid limit={3} />

          <div className="mt-10 text-center">
            <a
              href="/tournaments"
              className="inline-block rounded-lg border border-teal-400 px-6 py-2.5 text-sm font-semibold text-teal-600 transition-colors hover:bg-teal-50"
            >
              View All Tournaments
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
