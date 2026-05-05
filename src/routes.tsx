/* eslint-disable react-refresh/only-export-components */
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
const SeasonPassPage = lazy(() => import('./pages/SeasonPassPage'))
const SeasonPassSuccessPage = lazy(() => import('./pages/SeasonPassSuccessPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const DevPingPage = lazy(() => import('./pages/DevPingPage'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminTeams = lazy(() => import('./pages/admin/AdminTeams'))
const AdminSeasonPasses = lazy(() => import('./pages/admin/AdminSeasonPasses'))

const withSuspense = (element: React.ReactNode) => (
  <Suspense
    fallback={
      <div className="flex min-h-screen items-center justify-center text-teal-400">Loading…</div>
    }
  >
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
      { path: 'season-pass', element: withSuspense(<SeasonPassPage />) },
      { path: 'season-pass/success', element: withSuspense(<SeasonPassSuccessPage />) },
      { path: 'dev/ping', element: withSuspense(<DevPingPage />) },
      { path: '*', element: withSuspense(<NotFoundPage />) },
    ],
  },
  {
    path: '/admin',
    element: withSuspense(<AdminLayout />),
    children: [
      { index: true, element: withSuspense(<AdminDashboard />) },
      { path: 'teams', element: withSuspense(<AdminTeams />) },
      { path: 'season-passes', element: withSuspense(<AdminSeasonPasses />) },
    ],
  },
])
