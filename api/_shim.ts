// Minimal stand-in for @netlify/functions' Context. Handlers in this codebase
// only read context.deploy.context (seed-dev gate) and call context.waitUntil
// (background work in stripe-webhook + create-checkout-session). Both are
// shimmed here so handlers can be hosted by api/index.ts without Netlify.

export interface Context {
  waitUntil(promise: Promise<unknown>): void
  deploy: { context: 'production' | 'dev' | string }
}

export function makeContext(_req: Request): Context {
  return {
    waitUntil(promise) {
      void Promise.resolve(promise).catch((err) => console.error('[waitUntil]', err))
    },
    deploy: {
      context: process.env.NODE_ENV === 'production' ? 'production' : 'dev',
    },
  }
}
