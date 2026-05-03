import { Link } from 'react-router-dom'

const sections = [
  {
    to: '/admin/teams',
    title: 'Teams',
    description: 'Manually add or remove teams in any tournament division.',
  },
]

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="block rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:border-teal-300 hover:shadow-md"
          >
            <h2 className="text-lg font-bold text-gray-900">{s.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
