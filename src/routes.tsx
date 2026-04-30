import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './components/RootLayout'

const HomePage = lazy(() => import('./pages/HomePage'))
const TournamentsListPage = lazy(() => import('./pages/TournamentsListPage'))
const TournamentDetailPage = lazy(() => import('./pages/TournamentDetailPage'))
const RegistrationFlow = lazy(() => import('./pages/RegistrationFlow'))
const RegistrationSuccessPage = lazy(() => import('./pages/RegistrationSuccessPage'))
const RegistrationCancelledPage = lazy(() => import('./pages/RegistrationCancelledPage'))
const ManageTeamPage = lazy(() => import('./pages/ManageTeamPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const RulesPage = lazy(() => import('./pages/RulesPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-teal-400">Loading…</div>}>
    {element}
  </Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: withSuspense(<HomePage />) },
      { path: 'tournaments', element: withSuspense(<TournamentsListPage />) },
      { path: 'tournaments/:slug', element: withSuspense(<TournamentDetailPage />) },
      { path: 'tournaments/:slug/register', element: withSuspense(<RegistrationFlow />) },
      { path: 'registration/success', element: withSuspense(<RegistrationSuccessPage />) },
      { path: 'registration/cancelled', element: withSuspense(<RegistrationCancelledPage />) },
      { path: 'manage/:token', element: withSuspense(<ManageTeamPage />) },
      { path: 'about', element: withSuspense(<AboutPage />) },
      { path: 'rules', element: withSuspense(<RulesPage />) },
      { path: '*', element: withSuspense(<NotFoundPage />) },
    ],
  },
])
