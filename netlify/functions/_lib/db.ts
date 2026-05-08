import pg from 'pg'

const connectionString = process.env.DATABASE_URL ?? process.env.NETLIFY_DB_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

export const pool = new pg.Pool({ connectionString })

async function sql<T = Record<string, unknown>[]>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T> {
  let text = strings[0] ?? ''
  for (let i = 0; i < values.length; i++) {
    text += `$${i + 1}` + (strings[i + 1] ?? '')
  }
  const res = await pool.query(text, values as unknown[])
  return res.rows as unknown as T
}

export const db = { sql, pool }
