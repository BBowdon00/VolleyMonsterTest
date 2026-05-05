export default function SeasonPassBanner() {
  return (
    <section className="bg-gray-900 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 px-8 py-12 text-white shadow-xl sm:px-12">
          {/* Background glow */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-teal-300/20 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <span className="mb-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]">
                2026 Season Pass
              </span>
              <h2 className="text-3xl font-black sm:text-4xl">
                Play all season for <span className="text-teal-200">$300</span>
              </h2>
              <p className="mt-3 text-base text-teal-100 leading-relaxed">
                One pass covers{' '}
                <strong className="text-white">your individual registration fee</strong> for every
                non-Open division tournament all summer. The more you play, the more you save.
              </p>

              <ul className="mt-4 space-y-1.5">
                {[
                  'Valid at every 2026 Volley Monster tournament',
                  'Covers AA, A, BB/B, Rec, and juniors divisions',
                  'Per-person — each teammate can use their own pass',
                  'Full team? Everyone with a pass pays $0 at registration',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-teal-100">
                    <span className="mt-0.5 text-teal-300 font-bold">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="shrink-0 text-center">
              <div className="mb-4 rounded-2xl bg-white/10 px-8 py-6 backdrop-blur-sm ring-1 ring-white/20">
                <p className="text-sm font-semibold text-teal-200 uppercase tracking-widest">
                  One-time price
                </p>
                <p className="mt-1 text-5xl font-black text-white">$300</p>
                <p className="mt-1 text-xs text-teal-300">for the entire 2026 season</p>
              </div>
              <a
                href="/season-pass"
                className="inline-block w-full rounded-xl bg-white px-8 py-3.5 text-base font-bold text-teal-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Get Your Pass →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
