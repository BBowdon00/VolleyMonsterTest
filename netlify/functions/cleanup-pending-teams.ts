import { db } from './_lib/db'

export async function cleanupPendingTeams(): Promise<void> {
  await db.sql`
    UPDATE teams
    SET status = 'cancelled'
    WHERE status = 'pending_payment'
      AND created_at < NOW() - INTERVAL '24 hours'
  `
}

export default async (_req: Request): Promise<void> => {
  await cleanupPendingTeams()
}
