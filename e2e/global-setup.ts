import { spawn, spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://volleymonster:dev@localhost:5432/volleymonster'

async function waitForPostgres(timeoutMs = 30_000): Promise<void> {
  const start = Date.now()
  let lastErr: unknown
  while (Date.now() - start < timeoutMs) {
    try {
      const c = new Client({ connectionString: DATABASE_URL })
      await c.connect()
      await c.query('SELECT 1')
      await c.end()
      return
    } catch (err) {
      lastErr = err
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  throw new Error(`Postgres not reachable: ${(lastErr as Error)?.message}`)
}

function run(cmd: string, args: string[], cwd = ROOT): void {
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
  if (res.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')} (exit ${res.status})`)
  }
}

function getStripeWebhookSecret(): string {
  const res = spawnSync('stripe', ['listen', '--print-secret'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
  if (res.status !== 0) {
    throw new Error(
      `\`stripe listen --print-secret\` failed (status ${res.status}). Is the Stripe CLI installed and \`stripe login\` complete? stderr:\n${res.stderr}`,
    )
  }
  const secret = res.stdout
    .trim()
    .split(/\s+/)
    .find((tok) => tok.startsWith('whsec_'))
  if (!secret) {
    throw new Error(
      `Could not parse webhook secret from \`stripe listen --print-secret\`:\n${res.stdout}`,
    )
  }
  return secret
}

async function startStripeForwarder(): Promise<{ pid: number }> {
  // IMPORTANT: do not use `shell: true` on Windows. With shell=true the
  // returned `child.pid` is the cmd.exe wrapper, not stripe.exe — kill the
  // shell and the grandchild stripe.exe orphans, leaving stale forwarders
  // that double- or triple-deliver every webhook to the next test run
  // (each delivery races for the same `payments_stripe_payment_intent_id_key`
  // unique constraint and produces duplicate-key errors). Resolve the .exe
  // path explicitly so we can spawn it without a shell on every platform.
  const stripeBin = resolveStripeBinary()
  const child = spawn(
    stripeBin,
    ['listen', '--forward-to', 'http://localhost:3000/api/stripe-webhook'],
    {
      cwd: ROOT,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  child.stdout?.on('data', (b) => process.stdout.write(`[stripe listen] ${b}`))
  child.stderr?.on('data', (b) => process.stderr.write(`[stripe listen] ${b}`))
  // Wait for the listener to attach before returning. The CLI prints
  // "Ready! ..." on stderr when it's connected and forwarding.
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('stripe listen did not become ready in 10s')),
      10_000,
    )
    const onLine = (chunk: Buffer): void => {
      if (chunk.toString().includes('Ready!')) {
        clearTimeout(timeout)
        resolve()
      }
    }
    child.stderr?.on('data', onLine)
    child.stdout?.on('data', onLine)
    child.on('exit', (code) => {
      clearTimeout(timeout)
      reject(new Error(`stripe listen exited with code ${code} before becoming ready`))
    })
  })
  if (!child.pid) throw new Error('stripe listen did not return a pid')
  return { pid: child.pid }
}

async function applySeedSql(): Promise<void> {
  const sqlPath = path.join(ROOT, 'server', 'database', 'seed-dev.sql')
  const sql = await readFile(sqlPath, 'utf8')
  const c = new Client({ connectionString: DATABASE_URL })
  await c.connect()
  try {
    await c.query(sql)
  } finally {
    await c.end()
  }
}

async function readEnvLocalSecret(): Promise<string | null> {
  try {
    const txt = await readFile(path.join(ROOT, '.env.local'), 'utf8')
    const m = txt.match(/^STRIPE_WEBHOOK_SECRET=(\S+)/m)
    return m?.[1] ?? null
  } catch {
    return null
  }
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  console.log('[e2e setup] starting Postgres (docker compose)…')
  run('docker', ['compose', '-f', 'deploy/docker-compose.dev.yml', 'up', '-d'])

  console.log('[e2e setup] waiting for Postgres to accept connections…')
  await waitForPostgres()

  console.log('[e2e setup] applying migrations…')
  run('npx', ['tsx', '--env-file=.env.local', 'api/migrate.ts'])

  console.log('[e2e setup] applying dev seed…')
  await applySeedSql()

  console.log('[e2e setup] resolving Stripe webhook secret…')
  const cliSecret = getStripeWebhookSecret()
  const envSecret = await readEnvLocalSecret()
  if (envSecret && envSecret !== cliSecret) {
    throw new Error(
      `STRIPE_WEBHOOK_SECRET in .env.local (${envSecret.slice(0, 12)}…) does not match the active Stripe CLI account secret (${cliSecret.slice(0, 12)}…).\n` +
        `Update .env.local — webhooks signed by \`stripe listen\` won't verify against the wrong secret.`,
    )
  }
  process.env.STRIPE_WEBHOOK_SECRET = cliSecret

  console.log('[e2e setup] starting `stripe listen` forwarder…')
  const { pid } = await startStripeForwarder()

  return async () => {
    console.log(`[e2e teardown] stopping stripe listen (pid=${pid})…`)
    killStripeProcess(pid)
    // Sanity check — if anything still holds the pid (Windows can be slow
    // to reap), wait briefly then escalate. Orphan listeners cause
    // duplicate webhook deliveries on subsequent runs.
    await new Promise((r) => setTimeout(r, 250))
    if (isPidAlive(pid)) {
      killStripeProcess(pid, true)
    }
  }
}

function resolveStripeBinary(): string {
  // On Windows, spawn() without shell=true requires the full path to .exe;
  // PATH lookup that finds .cmd shims won't work. Try `where.exe` to
  // resolve, falling back to the bare command name on POSIX.
  if (process.platform !== 'win32') return 'stripe'
  const r = spawnSync('where.exe', ['stripe'], { encoding: 'utf8' })
  const candidate = (r.stdout ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.toLowerCase().endsWith('.exe'))
  if (!candidate) {
    throw new Error(
      'Could not locate stripe.exe via `where stripe`. Install Stripe CLI and ensure it is on PATH.',
    )
  }
  return candidate
}

function killStripeProcess(pid: number, force = false): void {
  try {
    if (process.platform === 'win32') {
      // taskkill with /T ends the process tree (covers any helpers stripe
      // spawned). /F forces kill, used only as escalation.
      const args = ['/PID', String(pid), '/T']
      if (force) args.push('/F')
      spawnSync('taskkill.exe', args, { stdio: 'ignore' })
    } else {
      process.kill(pid, force ? 'SIGKILL' : 'SIGTERM')
    }
  } catch {
    // already exited
  }
}

function isPidAlive(pid: number): boolean {
  try {
    // Signal 0 doesn't actually send a signal — just probes the pid.
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
