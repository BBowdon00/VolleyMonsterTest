#!/usr/bin/env node
// Populates the local dev database with test data via the /api/seed-dev
// function. Requires `netlify dev` to be running on http://localhost:8888.
// Usage: npm run db:seed

const url = 'http://localhost:8888/api/seed-dev'

let res
try {
  res = await fetch(url, { method: 'POST' })
} catch (err) {
  console.error('Could not reach', url)
  console.error('Make sure `netlify dev` is running in another terminal.')
  process.exit(1)
}

if (!res.ok) {
  console.error(`Seed failed (${res.status} ${res.statusText})`)
  console.error(await res.text())
  process.exit(1)
}

const body = await res.json()
console.log(`Seed complete: ${body.teams} teams, ${body.players} players inserted.`)
