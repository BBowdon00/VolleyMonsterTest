import { Client } from 'pg'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://volleymonster:dev@localhost:5432/volleymonster'

export async function withDb<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: DATABASE_URL })
  await c.connect()
  try {
    return await fn(c)
  } finally {
    await c.end()
  }
}

export async function getTeamStatus(teamId: string): Promise<string | null> {
  return withDb(async (c) => {
    const r = await c.query<{ status: string }>('SELECT status FROM teams WHERE id = $1', [teamId])
    return r.rows[0]?.status ?? null
  })
}

export async function getOrderStatus(orderId: string): Promise<string | null> {
  return withDb(async (c) => {
    const r = await c.query<{ status: string }>(
      'SELECT status FROM registration_orders WHERE id = $1',
      [orderId],
    )
    return r.rows[0]?.status ?? null
  })
}

export async function getDivisionByExample(opts: {
  slug: string
  dayDate: string // YYYY-MM-DD
  skill: string
  gender: string
}): Promise<{ id: string; tournament_day_id: string; team_size: number; fee_cents: number }> {
  return withDb(async (c) => {
    const r = await c.query<{
      id: string
      tournament_day_id: string
      team_size: number
      fee_cents: number
    }>(
      `SELECT d.id, d.tournament_day_id, d.team_size, d.fee_cents
       FROM divisions d
       JOIN tournament_days td ON td.id = d.tournament_day_id
       JOIN tournaments t ON t.id = td.tournament_id
       WHERE t.slug = $1 AND td.day_date = $2::date
         AND d.skill_level = $3 AND d.gender = $4`,
      [opts.slug, opts.dayDate, opts.skill, opts.gender],
    )
    if (!r.rows[0]) throw new Error(`No division: ${JSON.stringify(opts)}`)
    return r.rows[0]
  })
}

export async function deleteTeamsByEmail(email: string): Promise<void> {
  await withDb(async (c) => {
    await c.query(
      `DELETE FROM players WHERE team_id IN (SELECT id FROM teams WHERE captain_email = $1)`,
      [email],
    )
    await c.query(
      `DELETE FROM registrations WHERE team_id IN (SELECT id FROM teams WHERE captain_email = $1)`,
      [email],
    )
    await c.query(`DELETE FROM teams WHERE captain_email = $1`, [email])
    await c.query(`DELETE FROM registration_orders WHERE captain_email = $1`, [
      email.toLowerCase().trim(),
    ])
  })
}
