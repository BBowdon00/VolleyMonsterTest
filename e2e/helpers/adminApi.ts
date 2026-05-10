import type { APIRequestContext } from '@playwright/test'

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? ''

function adminHeaders() {
  return { 'x-admin-token': ADMIN_TOKEN }
}

export async function deleteTeamsByEmail(request: APIRequestContext, email: string): Promise<void> {
  await request.delete(`/api/admin/teams?captain_email=${encodeURIComponent(email)}`, {
    headers: adminHeaders(),
  })
}

export async function pollForConfirmedTeam(
  request: APIRequestContext,
  tournamentSlug: string,
  email: string,
  timeoutMs: number,
): Promise<{ id: string; name: string; players: string[] } | null> {
  const normalizedEmail = email.toLowerCase().trim()
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const res = await request.get(`/api/admin/teams?tournament_slug=${tournamentSlug}`, {
      headers: adminHeaders(),
    })
    const teams = (await res.json()) as Array<{
      id: string
      name: string
      captain_email: string
      status: string
      players: Array<{ name: string }>
    }>
    const team = teams.find((t) => t.captain_email === normalizedEmail && t.status === 'confirmed')
    if (team) {
      return { id: team.id, name: team.name, players: team.players.map((p) => p.name) }
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  return null
}
