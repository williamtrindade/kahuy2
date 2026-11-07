import { NATIONAL_HOLIDAYS } from '../Config/holidays'
import { loadConfig } from '../Config/loadConfig'
import { createApp } from '../Http/HonoApp'
import { buildContainer } from '../Providers/CleanArchServiceProvider'
import { CloudflareRateLimiter, type RateLimitBinding } from '../Security/CloudflareRateLimiter'

type Env = Record<string, unknown> & { LOGIN_LIMITER: RateLimitBinding }

let app: ReturnType<typeof createApp> | undefined

// Só recebe /api/*: o front fica no Cloudflare Pages, que repassa a API por service binding.
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (!app) {
      try {
        const config = loadConfig(env, NATIONAL_HOLIDAYS)
        app = createApp({
          config,
          container: buildContainer(config),
          rateLimiter: new CloudflareRateLimiter(env.LOGIN_LIMITER),
          // Header definido pelo próprio Cloudflare; não dá para forjar através da borda.
          clientKey: (c) => c.req.header('cf-connecting-ip') ?? 'unknown',
        })
      } catch (err) {
        // Detalhe só no log do Worker (wrangler tail); o cliente não precisa saber qual variável falta.
        console.error(`[kahuy] configuração inválida: ${(err as Error).message}`)
        return Response.json({ error: 'config' }, { status: 500 })
      }
    }
    return app.fetch(request, env, ctx)
  },
}
