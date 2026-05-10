import type { APIRequestContext } from '@playwright/test'

interface CreateOrderInput {
  captainEmail: string
  captainName?: string
  divisionId: string
  tournamentDayId: string
  players: string[]
  teamName: string
}

export async function createCheckoutSession(
  request: APIRequestContext,
  input: CreateOrderInput,
): Promise<{ status: number; body: unknown }> {
  const res = await request.post('/api/create-checkout-session', {
    data: {
      captain: {
        name: input.captainName ?? 'E2E Captain',
        email: input.captainEmail,
        phone: '3015551234',
        city: 'Rockville',
      },
      dayEntries: [
        {
          tournamentDayId: input.tournamentDayId,
          divisionId: input.divisionId,
          teamName: input.teamName,
          players: input.players.map((name) => ({ name })),
        },
      ],
      agreedToRules: true,
    },
  })
  return { status: res.status(), body: await res.json().catch(() => null) }
}
