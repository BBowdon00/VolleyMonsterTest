import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import EditableRoster from '@/features/manage/EditableRoster'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TeamStatus = 'pending_payment' | 'confirmed' | 'waitlisted' | 'cancelled'

interface Player {
  id: string
  name: string
  jersey_number: string | null
  shirt_size: string | null
  sort_order: number
}

interface TeamData {
  team_id: string
  team_name: string
  city: string | null
  captain_name: string
  captain_email: string
  captain_phone: string
  status: TeamStatus
  division_name: string
  tournament_name: string
  tournament_date: string
  players: Player[]
}

type PageState = { phase: 'loading' } | { phase: 'invalid' } | { phase: 'ready'; team: TeamData }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000

function isEditsLocked(tournamentDate: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [year, month, day] = tournamentDate.split('-').map(Number)
  const tDate = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
  return tDate.getTime() - today.getTime() < FORTY_EIGHT_HOURS_MS
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function statusBadgeVariant(
  status: TeamStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' | 'open' | 'waitlist' | 'closed' {
  switch (status) {
    case 'confirmed':
      return 'open'
    case 'waitlisted':
      return 'waitlist'
    case 'cancelled':
      return 'closed'
    default:
      return 'secondary'
  }
}

function statusLabel(status: TeamStatus): string {
  switch (status) {
    case 'confirmed':
      return 'Confirmed'
    case 'waitlisted':
      return 'Waitlisted'
    case 'cancelled':
      return 'Cancelled'
    case 'pending_payment':
      return 'Pending payment'
    default:
      return status
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ManageTeamPage() {
  const { token } = useParams<{ token: string }>()

  // If there's no token, skip loading entirely
  const [pageState, setPageState] = useState<PageState>(
    token ? { phase: 'loading' } : { phase: 'invalid' },
  )

  useEffect(() => {
    if (!token) return

    let cancelled = false

    async function load() {
      const res = await fetch(`/api/manage-team?token=${encodeURIComponent(token!)}`)

      if (cancelled) return

      if (!res.ok) {
        setPageState({ phase: 'invalid' })
        return
      }

      const row = (await res.json()) as Record<string, unknown>

      const rawPlayers = Array.isArray(row['players']) ? (row['players'] as unknown[]) : []

      const players: Player[] = (rawPlayers as Array<Record<string, unknown>>).map((p) => ({
        id: String(p['id'] ?? ''),
        name: String(p['name'] ?? ''),
        jersey_number: p['jersey_number'] != null ? String(p['jersey_number']) : null,
        shirt_size: p['shirt_size'] != null ? String(p['shirt_size']) : null,
        sort_order: Number(p['sort_order'] ?? 0),
      }))

      setPageState({
        phase: 'ready',
        team: {
          team_id: row['team_id'] as string,
          team_name: row['team_name'] as string,
          city: row['city'] as string | null,
          captain_name: row['captain_name'] as string,
          captain_email: row['captain_email'] as string,
          captain_phone: row['captain_phone'] as string,
          status: row['status'] as TeamStatus,
          division_name: row['division_name'] as string,
          tournament_name: row['tournament_name'] as string,
          tournament_date: row['tournament_date'] as string,
          players,
        },
      })
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [token])

  // ---------- Loading ----------
  if (pageState.phase === 'loading') {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  // ---------- Not found / invalid ----------
  if (pageState.phase === 'invalid') {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center space-y-4">
        <h1 className="text-2xl font-black text-gray-900">Link not found</h1>
        <p className="text-gray-500">This link is invalid or has expired.</p>
        <Link
          to="/tournaments"
          className="inline-block mt-2 text-teal-600 underline hover:text-teal-700"
        >
          Browse upcoming tournaments
        </Link>
      </div>
    )
  }

  // ---------- Ready ----------
  const { team } = pageState
  const locked = isEditsLocked(team.tournament_date)

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">
          {team.tournament_name}
        </p>
        <h1 className="text-3xl font-black text-gray-900">{team.team_name}</h1>
      </div>

      {/* Team info card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={statusBadgeVariant(team.status)}>{statusLabel(team.status)}</Badge>
          <span className="text-sm text-gray-600">{team.division_name}</span>
          <span className="text-gray-300">·</span>
          <span className="text-sm text-gray-600">{formatDate(team.tournament_date)}</span>
        </div>

        <div className="border-t border-gray-100 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
          <div>
            <span className="font-medium text-gray-700">Captain: </span>
            {team.captain_name}
          </div>
          <div>
            <span className="font-medium text-gray-700">Email: </span>
            {team.captain_email}
          </div>
          {team.city && (
            <div>
              <span className="font-medium text-gray-700">City: </span>
              {team.city}
            </div>
          )}
        </div>
      </div>

      {/* Roster section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Roster</h2>

        {locked ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm font-semibold text-amber-800">Edits are locked</p>
            <p className="mt-1 text-sm text-amber-700">
              Roster changes are disabled within 48 hours of the tournament. Contact{' '}
              <a href="mailto:info@volleymonster.com" className="underline hover:text-amber-900">
                info@volleymonster.com
              </a>{' '}
              if you need assistance.
            </p>
          </div>
        ) : (
          <>
            {team.players.length === 0 ? (
              <p className="text-sm text-gray-500">No players on the roster yet.</p>
            ) : (
              <EditableRoster token={team.team_id} players={team.players} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
