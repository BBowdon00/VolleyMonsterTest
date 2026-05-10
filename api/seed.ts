import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from '../server/routes/_lib/db.js'

// One-shot seed for non-prod environments. Deliberately a CLI script, not an
// HTTP route — the api/index.ts router does NOT mount this file, so it has
// zero internet surface. The only way to invoke it is via the matching
// `seed` service in docker-compose.preview.yml (`docker compose run --rm
// seed`), which requires SSH access to the VPS.
//
// The underlying SQL (server/database/seed-dev.sql) is idempotent — it
// deletes any prior `@test.vm` rows before inserting, so re-running is safe.
//
// Refusing to run when NODE_ENV=production guards against accidentally
// pointing this at the live DB. Preview compose sets NODE_ENV=production for
// other reasons (gates the existing /api/seed-dev route, runs Hono in prod
// mode); override here with ALLOW_SEED=true so preview's seed service still
// works without weakening that gate elsewhere.

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SEED_SQL_PATH = path.resolve(__dirname, '../server/database/seed-dev.sql')

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    throw new Error(
      'Refusing to seed: NODE_ENV=production. Set ALLOW_SEED=true in the env file to permit this (preview only — never production).',
    )
  }

  const sql = await readFile(SEED_SQL_PATH, 'utf8')
  const client = await pool.connect()
  try {
    await client.query(sql)
    console.log(`[seed] applied ${path.basename(SEED_SQL_PATH)}`)
  } finally {
    client.release()
  }
}

main()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed] failed:', err)
    pool.end().finally(() => process.exit(1))
  })
