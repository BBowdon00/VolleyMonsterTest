import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { listUpcomingTournaments } from '@/api/tournaments'
import type { TournamentSummary, DivisionWithTeams } from '@/api/tournaments'
import { autoTeamName } from '@/lib/teamName'
import { adminFetch, AdminUnauthorizedError } from '@/lib/admin'
import { Button } from '@/components/ui/button'

interface AdminTeam {
  id: string
  name: string
  city: string | null
  captain_name: string
  captain_email: string
  captain_phone: string
  status: string
  notes: string | null
  created_at: string
  division_id: string
  division_name: string
  day_id: string
  day_label: string | null
  day_date: string
  players: Array<{ id: string; name: string; sort_order: number }>
}

async function fetchAdminTeams(slug: string): Promise<AdminTeam[]> {
  const res = await adminFetch(`/api/admin/teams?tournament_slug=${encodeURIComponent(slug)}`)
  if (!res.ok) throw new Error(`Failed to fetch teams: ${res.status}`)
  return res.json()
}

interface CreateTeamPayload {
  division_id: string
  name: string
  city: string
  captain_name: string
  captain_email: string
  captain_phone: string
  players: Array<{ name: string }>
}

async function createTeam(payload: CreateTeamPayload): Promise<{ id: string }> {
  const res = await adminFetch('/api/admin/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (res.status === 409) throw new Error('A team with that name already exists in this division.')
  if (!res.ok) throw new Error(`Create failed: ${res.status}`)
  return res.json()
}

async function deleteTeam(id: string): Promise<void> {
  const res = await adminFetch(`/api/admin/teams?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
}

export default function AdminTeams() {
  const tournamentsQuery = useQuery({
    queryKey: ['admin', 'tournament-options'],
    queryFn: () => listUpcomingTournaments(),
  })

  const [selectedSlug, setSelectedSlug] = useState<string>('')

  const effectiveSlug = selectedSlug || tournamentsQuery.data?.[0]?.slug || ''
  const selectedTournament: TournamentSummary | undefined = tournamentsQuery.data?.find(
    (t) => t.slug === effectiveSlug,
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Teams</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manually add or remove teams in any tournament. Manually-added teams are confirmed
          immediately (no Stripe).
        </p>
      </div>

      <div>
        <label htmlFor="admin-tournament" className="mb-1 block text-sm font-medium text-gray-700">
          Tournament
        </label>
        <select
          id="admin-tournament"
          value={effectiveSlug}
          onChange={(e) => setSelectedSlug(e.target.value)}
          className="block w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200"
        >
          {tournamentsQuery.data?.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name} — {format(parseISO(t.start_date), 'MM-dd-yyyy')}
            </option>
          ))}
        </select>
      </div>

      {selectedTournament && <TournamentTeamsPanel tournament={selectedTournament} />}
    </div>
  )
}

function TournamentTeamsPanel({ tournament }: { tournament: TournamentSummary }) {
  const queryClient = useQueryClient()
  const teamsQuery = useQuery({
    queryKey: ['admin', 'teams', tournament.slug],
    queryFn: () => fetchAdminTeams(tournament.slug),
  })

  const allDivisions: DivisionWithTeams[] = useMemo(
    () => tournament.tournament_days.flatMap((d) => d.divisions),
    [tournament],
  )

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin', 'teams', tournament.slug] }),
  })

  const teamsByDivision = useMemo(() => {
    const map = new Map<string, AdminTeam[]>()
    if (teamsQuery.data) {
      for (const t of teamsQuery.data) {
        const arr = map.get(t.division_id) ?? []
        arr.push(t)
        map.set(t.division_id, arr)
      }
    }
    return map
  }, [teamsQuery.data])

  if (teamsQuery.isError) {
    if (teamsQuery.error instanceof AdminUnauthorizedError) {
      return <p className="text-red-600">Session expired. Please sign in again.</p>
    }
    return <p className="text-red-600">Failed to load teams.</p>
  }

  return (
    <div className="space-y-6">
      <AddTeamForm
        tournamentSlug={tournament.slug}
        divisions={allDivisions}
        onAdded={() =>
          queryClient.invalidateQueries({ queryKey: ['admin', 'teams', tournament.slug] })
        }
      />

      {teamsQuery.isLoading ? (
        <p className="text-sm text-gray-500">Loading teams…</p>
      ) : (
        <div className="space-y-4">
          {tournament.tournament_days.map((day) => (
            <div key={day.id} className="rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="font-bold text-gray-900">
                  {day.label || format(parseISO(day.day_date), 'MM-dd-yyyy')}
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {day.divisions.map((div) => {
                  const teams = teamsByDivision.get(div.id) ?? []
                  return (
                    <div key={div.id} className="px-4 py-3">
                      <div className="mb-2 flex items-baseline justify-between">
                        <h3 className="text-sm font-bold text-gray-700">{div.display_name}</h3>
                        <span className="text-xs text-gray-400">
                          {teams.length} {teams.length === 1 ? 'team' : 'teams'}
                        </span>
                      </div>
                      {teams.length === 0 ? (
                        <p className="text-xs italic text-gray-400">No teams yet.</p>
                      ) : (
                        <ul className="space-y-1">
                          {teams.map((t) => (
                            <li
                              key={t.id}
                              className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-gray-50"
                            >
                              <div className="min-w-0">
                                <span className="text-sm font-medium text-gray-900">{t.name}</span>
                                <span className="ml-2 text-xs text-gray-500">
                                  {t.players.map((p) => p.name).join(', ') || '—'}
                                </span>
                                {t.status !== 'confirmed' && (
                                  <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase text-amber-700">
                                    {t.status.replace('_', ' ')}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Remove team "${t.name}"? This cannot be undone.`)) {
                                    deleteMutation.mutate(t.id)
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                                className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-40"
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface AddTeamFormProps {
  tournamentSlug: string
  divisions: DivisionWithTeams[]
  onAdded: () => void
}

function AddTeamForm({ tournamentSlug: _tournamentSlug, divisions, onAdded }: AddTeamFormProps) {
  const initialDivision = divisions[0]
  const initialSize = initialDivision?.team_size ?? 2

  const [open, setOpen] = useState(false)
  const [divisionId, setDivisionId] = useState(initialDivision?.id ?? '')
  const [city, setCity] = useState('')
  const [captainName, setCaptainName] = useState('')
  const [captainEmail, setCaptainEmail] = useState('')
  const [captainPhone, setCaptainPhone] = useState('')
  const [players, setPlayers] = useState<string[]>(() => Array(initialSize).fill(''))
  const [error, setError] = useState<string | null>(null)

  const selectedDivision = divisions.find((d) => d.id === divisionId)
  const teamSize = selectedDivision?.team_size ?? 2
  const computedName = autoTeamName(players.map((p) => ({ name: p })))

  function handleDivisionChange(newId: string) {
    setDivisionId(newId)
    const newSize = divisions.find((d) => d.id === newId)?.team_size ?? 2
    if (newSize !== players.length) setPlayers(Array(newSize).fill(''))
  }

  const mutation = useMutation({
    mutationFn: createTeam,
    onSuccess: () => {
      setCity('')
      setCaptainName('')
      setCaptainEmail('')
      setCaptainPhone('')
      setPlayers(Array(teamSize).fill(''))
      setError(null)
      setOpen(false)
      onAdded()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Create failed'),
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!divisionId || !captainName.trim() || !captainEmail.trim()) {
      setError('Division, captain name and captain email are required.')
      return
    }
    if (players.some((p) => !p.trim())) {
      setError(`All ${teamSize} player names are required (the team name is derived from them).`)
      return
    }
    if (!computedName) {
      setError('Team name could not be derived from the players entered.')
      return
    }
    mutation.mutate({
      division_id: divisionId,
      name: computedName,
      city: city.trim(),
      captain_name: captainName.trim(),
      captain_email: captainEmail.trim(),
      captain_phone: captainPhone.trim(),
      players: players.map((p) => ({ name: p.trim() })),
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-teal-400 px-4 py-2 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50"
      >
        + Add team
      </button>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-bold text-gray-900">Add team</h2>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="add-division">
          Division
        </label>
        <select
          id="add-division"
          value={divisionId}
          onChange={(e) => handleDivisionChange(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200"
        >
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.display_name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="City" value={city} onChange={setCity} />
        <Field label="Captain name" value={captainName} onChange={setCaptainName} required />
        <Field
          label="Captain email"
          type="email"
          value={captainEmail}
          onChange={setCaptainEmail}
          required
        />
        <Field label="Captain phone" value={captainPhone} onChange={setCaptainPhone} />
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-gray-700">
          Players ({teamSize} required by division)
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {players.map((p, i) => (
            <input
              key={i}
              type="text"
              placeholder={`Player ${i + 1} (full name)`}
              value={p}
              onChange={(e) => {
                const next = [...players]
                next[i] = e.target.value
                setPlayers(next)
              }}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200"
            />
          ))}
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Team name
        </span>
        <span className="truncate text-sm font-medium text-gray-900">
          {computedName || <span className="italic text-gray-400">(derived from players)</span>}
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Adding…' : 'Add team'}
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
}

function Field({ label, value, onChange, required, type = 'text' }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200"
      />
    </label>
  )
}
