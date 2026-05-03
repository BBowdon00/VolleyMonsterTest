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
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% -20%, #7ebec5 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-24 bottom-24 h-72 w-72 rounded-full bg-flame-500 opacity-15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-24 text-center sm:py-32">
        <span className="mb-6 inline-block rounded-full bg-teal-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-teal-400 ring-1 ring-teal-400/30">
          Outdoor Beach Volleyball
        </span>

        <h1 className="text-6xl font-black tracking-tight sm:text-8xl">
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
            className="rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-500/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-500/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            View Upcoming Tournaments
          </a>
          <a
            href="/tournaments"
            className="rounded-lg border border-gray-600 px-8 py-3.5 text-base font-semibold text-gray-300 transition hover:border-gray-400 hover:text-white"
          >
            Browse All
          </a>
        </div>
      </div>

      <svg
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        className="relative block h-8 w-full sm:h-12"
        aria-hidden="true"
      >
        <path fill="#f9fafb" d="M0,30 C360,60 720,0 1440,40 L1440,60 L0,60 Z" />
      </svg>
    </section>
  )
}
