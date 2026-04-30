// Task 1.2 — full implementation pending Supabase (Task 0.2)
export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-center">
      <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-teal-500">
        Volley Ball Tournaments
      </div>
      <h1 className="text-5xl font-black text-gray-900 sm:text-6xl">
        <span className="text-teal-500">Volley</span>
        <span className="text-flame-500">Monster</span>
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-xl text-gray-600">
        We offer outdoor tournaments All Summer Long!
      </p>
      <a
        href="/tournaments"
        className="mt-8 inline-block rounded-lg bg-teal-400 px-8 py-3 font-semibold text-white shadow hover:bg-teal-500 transition-colors"
      >
        View Tournaments
      </a>
    </div>
  )
}
