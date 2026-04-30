import { useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useTournament } from '@/api/tournaments'
import { RegistrationProvider, useRegistration } from '@/features/registration/registrationStore'
import StepDays from '@/features/registration/StepDays'
import StepCaptain from '@/features/registration/StepCaptain'
import StepRoster from '@/features/registration/StepRoster'
import StepReview from '@/features/registration/StepReview'
import type { RegistrationStep } from '@/features/registration/registrationStore'

const STEPS: RegistrationStep[] = ['days', 'captain', 'roster', 'review']
const STEP_LABELS: Record<RegistrationStep, string> = {
  days: 'Day & Division',
  captain: 'Captain Info',
  roster: 'Roster',
  review: 'Review',
}

function ProgressBar({ currentStep }: { currentStep: RegistrationStep }) {
  const currentIndex = STEPS.indexOf(currentStep)

  return (
    <nav aria-label="Registration progress" className="mb-8">
      <ol className="flex items-center gap-0">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex
          const isActive = index === currentIndex

          return (
            <li key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={[
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors',
                    isCompleted
                      ? 'bg-teal-400 text-white'
                      : isActive
                        ? 'bg-teal-400 text-white ring-4 ring-teal-100'
                        : 'bg-gray-200 text-gray-500',
                  ].join(' ')}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={[
                    'mt-1 hidden text-xs font-medium sm:block',
                    isActive ? 'text-teal-600' : 'text-gray-500',
                  ].join(' ')}
                >
                  {STEP_LABELS[step]}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={[
                    'h-0.5 w-full mx-1 mb-5 transition-colors',
                    isCompleted ? 'bg-teal-400' : 'bg-gray-200',
                  ].join(' ')}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-center text-xs text-gray-400 sm:hidden">
        Step {currentIndex + 1} of {STEPS.length}: {STEP_LABELS[currentStep]}
      </p>
    </nav>
  )
}

function RegistrationFlowInner({
  slug,
  initialDivisionId,
}: {
  slug: string
  initialDivisionId: string
}) {
  const { state } = useRegistration()
  const { data: tournament, isLoading, isError, error } = useTournament(slug)

  // Set page title
  useEffect(() => {
    document.title = tournament
      ? `Register — ${tournament.name} — Volley Monster`
      : 'Register — Volley Monster'
    return () => {
      document.title = 'Volley Monster'
    }
  }, [tournament])

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
        <Link
          to="/tournaments"
          className="mt-6 inline-block text-teal-600 underline hover:text-teal-700"
        >
          ← Back to tournaments
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Back link */}
      <Link
        to={`/tournaments/${slug}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
      >
        ← {tournament.name}
      </Link>

      <h1 className="mb-6 text-2xl font-black text-gray-900">Register</h1>

      <ProgressBar currentStep={state.step} />

      {state.step === 'days' && (
        <StepDays tournament={tournament} initialDivisionId={initialDivisionId} />
      )}
      {state.step === 'captain' && <StepCaptain />}
      {state.step === 'roster' && <StepRoster />}
      {state.step === 'review' && <StepReview />}
    </div>
  )
}

export default function RegistrationFlow() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const initialDivisionId = searchParams.get('division') ?? ''

  if (!slug) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-gray-900">Invalid URL</h1>
        <Link
          to="/tournaments"
          className="mt-6 inline-block text-teal-600 underline hover:text-teal-700"
        >
          ← Back to tournaments
        </Link>
      </div>
    )
  }

  return (
    <RegistrationProvider>
      <RegistrationFlowInner slug={slug} initialDivisionId={initialDivisionId} />
    </RegistrationProvider>
  )
}
