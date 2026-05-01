import type { Config } from '@netlify/functions'
import { db } from './_lib/db'

export default async (_req: Request): Promise<void> => {
  await db.sql`
    UPDATE teams
    SET status = 'cancelled'
    WHERE status = 'pending_payment'
      AND created_at < NOW() - INTERVAL '24 hours'
  `
}

export const config: Config = { schedule: '@hourly' }
