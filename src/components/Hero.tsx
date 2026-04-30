export default function Hero() {
  function handleScrollToTournaments(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    const el = document.getElementById('upcoming-tournaments')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative overflow-hidden bg-gray-900 text-white">
      {/* Background gradient accent */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% -20%, #7ebec5 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-24 text-center sm:py-32">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-400">
          Outdoor Beach Volleyball
        </p>

        <h1 className="text-5xl font-black sm:text-7xl">
          <span className="text-teal-400">Volley</span>
          <span className="text-flame-500">Monster</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-300 sm:text-2xl">
          We offer outdoor tournaments All Summer Long!
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="#upcoming-tournaments"
            onClick={handleScrollToTournaments}
            className="rounded-lg bg-teal-400 px-8 py-3 text-base font-semibold text-white shadow-lg transition-colors hover:bg-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            View Upcoming Tournaments
          </a>
          <a
            href="/tournaments"
            className="rounded-lg border border-gray-600 px-8 py-3 text-base font-semibold text-gray-300 transition-colors hover:border-gray-400 hover:text-white"
          >
            Browse All
          </a>
        </div>
      </div>
    </section>
  )
}
