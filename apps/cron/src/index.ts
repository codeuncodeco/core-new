// Daily cron worker. The only job today: hit the CMS's /cold-flag-cron route
// to flip stale "sent" proposals to "cold". Reaches the CMS via a service
// binding so we don't need DNS/public network for an internal call, and pass
// the bearer secret expected by the route.
//
// Deploy: pnpm --filter cu-cron deploy (with CLOUDFLARE_ENV=dev|test|live).
// Set the secret per env: wrangler secret put CRON_SECRET --env=<name>

interface Env {
  CMS: Fetcher
  CRON_SECRET: string
}

const callColdFlag = async (env: Env): Promise<void> => {
  if (!env.CRON_SECRET) {
    console.error('CRON_SECRET not set on the cron worker')
    return
  }
  const req = new Request('https://internal/cold-flag-cron', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
  })
  const res = await env.CMS.fetch(req)
  const body = await res.text()
  if (!res.ok) {
    console.error(`cold-flag-cron failed: ${res.status} ${body}`)
    return
  }
  console.log(`cold-flag-cron ok: ${body}`)
}

export default {
  // Cron Trigger entry point. wrangler.jsonc: triggers.crons = ["0 4 * * *"].
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(callColdFlag(env))
  },
  // HTTP endpoint so we can manually trigger the same path during local dev
  // via `wrangler dev` and a curl, and so wrangler's --test-scheduled flow
  // works too. Public — protect with a secret if you wire it up to an
  // external scheduler.
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname !== '/run' && url.pathname !== '/__scheduled') {
      return new Response('Not Found', { status: 404 })
    }
    await callColdFlag(env)
    return new Response('ok\n', { status: 200 })
  },
} satisfies ExportedHandler<Env>
