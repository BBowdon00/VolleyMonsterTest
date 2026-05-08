import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from '../netlify/functions/_lib/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = path.resolve(__dirname, '../netlify/database/migrations')

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT NOW()
    )
  `)
}

async function appliedSet(): Promise<Set<string>> {
  const res = await pool.query<{ name: string }>('SELECT name FROM _migrations')
  return new Set(res.rows.map((r) => r.name))
}

async function applyOne(name: string): Promise<void> {
  const sql = await readFile(path.join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf8')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('INSERT INTO _migrations (name) VALUES ($1)', [name])
    await client.query('COMMIT')
    console.log(`[migrate] applied ${name}`)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function main(): Promise<void> {
  await ensureMigrationsTable()
  const applied = await appliedSet()
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true })
  const pending = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .filter((name) => !applied.has(name))

  if (pending.length === 0) {
    console.log('[migrate] no pending migrations')
    return
  }

  console.log(`[migrate] applying ${pending.length} migration(s)`)
  for (const name of pending) {
    await applyOne(name)
  }
  console.log('[migrate] done')
}

main()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate] failed', err)
    pool.end().finally(() => process.exit(1))
  })
