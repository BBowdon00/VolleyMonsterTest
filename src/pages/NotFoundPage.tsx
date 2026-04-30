import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-black text-teal-400">404</p>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 text-gray-500">We couldn't find what you were looking for.</p>
      <Link
        to="/tournaments"
        className="mt-6 rounded-lg bg-teal-400 px-6 py-3 font-semibold text-white hover:bg-teal-500 transition-colors"
      >
        Browse tournaments
      </Link>
    </div>
  )
}
