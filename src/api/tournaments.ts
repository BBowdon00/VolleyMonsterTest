import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

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

export type Tournament = z.infer<typeof TournamentSchema>
export type TournamentDay = z.infer<typeof TournamentDaySchema>
export type Division = z.infer<typeof DivisionSchema>
export type DivisionWithTeams = z.infer<typeof DivisionWithTeamsSchema>
export type TournamentDayWithDivisions = z.infer<typeof TournamentDayWithDivisionsSchema>
export type TournamentSummary = z.infer<typeof TournamentSummarySchema>
export type TournamentDetail = z.infer<typeof TournamentDetailSchema>

// ─── Internal shape helpers ──────────────────────────────────────────────────

type RawTournament = {
  id: string
  name: string
  slug: string
  start_date: string
  end_date: string | null
  location_name: string | null
  location_address: string | null
  location_city: string | null
  location_state: string | null
  hero_image_url: string | null
  description_md: string | null
  status: 'draft' | 'published' | 'closed' | 'completed' | 'cancelled'
  registration_opens_at: string | null
  registration_closes_at: string | null
  tournament_days: RawDay[]
}

type RawDivision = {
  id: string
  tournament_day_id: string
  skill_level: string
  gender: string
  display_name: string
  format: string
  fee_cents: number
  team_size: number
  max_teams: number | null
}

type RawDay = {
  id: string
  tournament_id: string
  day_date: string
  label: string | null
  description_md: string | null
  check_in_time: string | null
  divisions: RawDivision[]
}

function buildConfirmedCounts(
  capacityData: Array<{ division_id: string; confirmed_teams: number }> | null,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of capacityData ?? []) {
    map.set(row.division_id, row.confirmed_teams)
  }
  return map
}

function divisionStatus(
  confirmedTeamCount: number,
  max_teams: number | null,
): 'open' | 'waitlist' | 'closed' {
  if (max_teams === null) return 'open'
  if (confirmedTeamCount >= max_teams) return 'closed'
  return 'open'
}

function attachCounts(days: RawDay[], counts: Map<string, number>): TournamentDayWithDivisions[] {
  return days.map((day) => ({
    ...day,
    divisions: day.divisions.map((div) => {
      const confirmedTeamCount = counts.get(div.id) ?? 0
      return {
        ...div,
        confirmedTeamCount,
        status: divisionStatus(confirmedTeamCount, div.max_teams),
      }
    }),
  }))
}

const TOURNAMENT_SELECT = `
  id, name, slug, start_date, end_date,
  location_name, location_address, location_city, location_state,
  hero_image_url, description_md, status,
  registration_opens_at, registration_closes_at,
  tournament_days (
    id, tournament_id, day_date, label, description_md, check_in_time,
    divisions (
      id, tournament_day_id, skill_level, gender, display_name, format,
      fee_cents, team_size, max_teams
    )
  )
`.trim()

// ─── API helpers ─────────────────────────────────────────────────────────────

export async function listUpcomingTournaments(limit?: number): Promise<TournamentSummary[]> {
  const today = new Date().toISOString().slice(0, 10)

  let query = supabase
    .from('tournaments')
    .select(TOURNAMENT_SELECT)
    .eq('status', 'published')
    .gte('start_date', today)
    .order('start_date', { ascending: true })

  if (limit !== undefined) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  if (!data) return []

  const { data: capacityData, error: capacityError } = await supabase
    .from('division_capacity')
    .select('division_id, confirmed_teams')

  if (capacityError) throw new Error(capacityError.message)

  const counts = buildConfirmedCounts(capacityData)

  const raw = data as unknown as RawTournament[]
  const results = raw.map((t) => ({
    ...t,
    tournament_days: attachCounts(t.tournament_days, counts),
  }))

  return z.array(TournamentSummarySchema).parse(results)
}

export async function getTournamentBySlug(slug: string): Promise<TournamentDetail> {
  const { data, error } = await supabase
    .from('tournaments')
    .select(TOURNAMENT_SELECT)
    .eq('slug', slug)
    .single()

  if (error) throw new Error(error.message)
  if (!data) throw new Error(`Tournament not found: ${slug}`)

  const rawData = data as unknown as RawTournament
  const rawDays = rawData.tournament_days
  const divisionIds = rawDays.flatMap((day) => day.divisions.map((div) => div.id))

  const { data: capacityData, error: capacityError } = await supabase
    .from('division_capacity')
    .select('division_id, confirmed_teams')
    .in('division_id', divisionIds.length > 0 ? divisionIds : ['__none__'])

  if (capacityError) throw new Error(capacityError.message)

  const counts = buildConfirmedCounts(capacityData)

  const result = {
    ...rawData,
    tournament_days: attachCounts(rawDays, counts),
  }

  return TournamentDetailSchema.parse(result)
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
