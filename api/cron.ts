import cron from 'node-cron'
import { cleanupPendingTeams } from '../netlify/functions/cleanup-pending-teams.js'

export function startCron(): void {
  cron.schedule('0 * * * *', () => {
    cleanupPendingTeams().catch((err) => console.error('[cron] cleanup-pending-teams failed', err))
  })
  console.log('[cron] scheduled cleanup-pending-teams @hourly')
}
