import { spawnSync } from 'node:child_process'

interface TriggerResult {
  ok: boolean
  stdout: string
  stderr: string
  code: number | null
}

// Run `stripe trigger <event>` synchronously. The Stripe CLI prints "Trigger
// succeeded! Check dashboard..." on success; the webhook arrives at our local
// server moments later via the `stripe listen` forwarder started in
// globalSetup.
export function stripeTrigger(
  event: string,
  options: { add?: Record<string, string>; override?: Record<string, string> } = {},
): TriggerResult {
  const args = ['trigger', event]
  for (const [k, v] of Object.entries(options.add ?? {})) {
    args.push('--add', `${k}=${v}`)
  }
  for (const [k, v] of Object.entries(options.override ?? {})) {
    args.push('--override', `${k}=${v}`)
  }
  const res = spawnSync('stripe', args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    timeout: 30_000,
  })
  return {
    ok: res.status === 0,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
    code: res.status,
  }
}
