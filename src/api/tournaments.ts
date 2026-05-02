import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

// ─── Zod schemas ────────────────────────────────────────────────────────────

export const TournamentSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  start_date: z.string(),
  end_date: z.string().nullable(),
  location_name: z.string().nullable(),
  location_address: z.string().nullable(),
  location_city: z.string().nullable(),
  location_state: z.string().nullable(),
  hero_image_url: z.string().nullable(),
  description_md: z.string().nullable(),
  status: z.enum(['draft', 'published', 'closed', 'completed', 'cancelled']),
  registration_opens_at: z.string().nullable(),
  registration_closes_at: z.string().nullable(),
})

export const TournamentDaySchema = z.object({
  id: z.string(),
  tournament_id: z.string(),
  day_date: z.string(),
  label: z.string().nullable(),
  description_md: z.string().nullable(),
  check_in_time: z.string().nullable(),
})

export const DivisionSchema = z.object({
  id: z.string(),
  tournament_day_id: z.string(),
  skill_level: z.string(),
  gender: z.string(),
  display_name: z.string(),
  format: z.string(),
  fee_cents: z.number(),
  team_size: z.number(),
  max_teams: z.number().nullable(),
})

export const DivisionWithTeamsSchema = DivisionSchema.extend({
  confirmedTeamCount: z.number(),
  status: z.enum(['open', 'waitlist', 'closed']),
})

export const TournamentDayWithDivisionsSchema = TournamentDaySchema.extend({
  divisions: z.array(DivisionWithTeamsSchema),
})

export const TournamentSummarySchema = TournamentSchema.extend({
  tournament_days: z.array(TournamentDayWithDivisionsSchema),
})

export const TournamentDetailSchema = TournamentSchema.extend({
  tournament_days: z.array(TournamentDayWithDivisionsSchema),
})

export const PublicTeamSchema = z.object({
  id: z.string(),
  players: z.array(z.object({ name: z.string() })),
})

export type Tournament = z.infer<typeof TournamentSchema>
export type TournamentDay = z.infer<typeof TournamentDaySchema>
export type Division = z.infer<typeof DivisionSchema>
export type DivisionWithTeams = z.infer<typeof DivisionWithTeamsSchema>
export type TournamentDayWithDivisions = z.infer<typeof TournamentDayWithDivisionsSchema>
export type TournamentSummary = z.infer<typeof TournamentSummarySchema>
export type TournamentDetail = z.infer<typeof TournamentDetailSchema>
export type PublicTeam = z.infer<typeof PublicTeamSchema>

// ─── API helpers ─────────────────────────────────────────────────────────────

export async function listUpcomingTournaments(limit?: number): Promise<TournamentSummary[]> {
  const res = await fetch(`/api/tournaments${limit !== undefined ? `?limit=${limit}` : ''}`)
  if (!res.ok) throw new Error(`Failed to fetch tournaments: ${res.status}`)
  const data = await res.json()
  // The Netlify function already nests the data in the right shape with confirmedTeamCount and status
  return z.array(TournamentSummarySchema).parse(data)
}

export async function getTournamentBySlug(slug: string): Promise<TournamentDetail> {
  const res = await fetch(`/api/tournament?slug=${encodeURIComponent(slug)}`)
  if (res.status === 404) throw new Error(`Tournament not found: ${slug}`)
  if (!res.ok) throw new Error(`Failed to fetch tournament: ${res.status}`)
  const data = await res.json()
  return TournamentDetailSchema.parse(data)
}

export async function getDivisionTeams(divisionId: string): Promise<PublicTeam[]> {
  const res = await fetch(`/api/division-teams?division_id=${encodeURIComponent(divisionId)}`)
  if (!res.ok) throw new Error(`Failed to fetch teams: ${res.status}`)
  return z.array(PublicTeamSchema).parse(await res.json())
}

// ─── TanStack Query hooks ─────────────────────────────────────────────────────

export function useUpcomingTournaments(limit?: number) {
  return useQuery({
    queryKey: ['tournaments', 'upcoming', limit],
    queryFn: () => listUpcomingTournaments(limit),
  })
}

export function useTournament(slug: string) {
  return useQuery({
    queryKey: ['tournaments', slug],
    queryFn: () => getTournamentBySlug(slug),
    enabled: Boolean(slug),
  })
}

export function useDivisionTeams(divisionId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['division-teams', divisionId],
    queryFn: () => getDivisionTeams(divisionId),
    enabled: Boolean(divisionId) && enabled,
  })
}
