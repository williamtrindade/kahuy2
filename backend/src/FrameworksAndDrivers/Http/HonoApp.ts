import { type Context, Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { cors } from 'hono/cors'
import { DomainError } from '../../Entities/DomainError'
import { NotionMappingError } from '../../InterfaceAdapters/Repositories/NotionMappingError'
import { BusinessRuleException } from '../../UseCases/Exceptions/BusinessRuleException'
import { ResourceNotFoundException } from '../../UseCases/Exceptions/ResourceNotFoundException'
import type { Config } from '../Config/loadConfig'
import { NotionApiError } from '../Notion/NotionApiError'
import type { Container } from '../Providers/CleanArchServiceProvider'
import { HmacSessionCookie } from '../Security/HmacSessionCookie'
import { verifyPassword } from '../Security/PasswordAuth'
import type { RateLimiter } from '../Security/RateLimiter'
import { CSP } from './securityHeaders'

export { CSP }

type AppOptions = {
  config: Config
  container: Container
  rateLimiter: RateLimiter
  now?: () => number
  /** Chave do rate limit. Node: IP da conexão (nodeClientKey); Worker: cf-connecting-ip. Padrão: constante. */
  clientKey?: (c: Context) => string
}

export function createApp(opts: AppOptions) {
  const { config, container, rateLimiter } = opts
  const now = opts.now ?? Date.now
  const clientKey = opts.clientKey ?? (() => 'local')
  const session = new HmacSessionCookie(config.password)
  const app = new Hono()

  app.use('*', async (c, next) => {
    await next()
    c.header('Content-Security-Policy', CSP)
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('Referrer-Policy', 'no-referrer')
  })

  if (config.allowedOrigin) {
    app.use('/api/*', cors({ origin: config.allowedOrigin, credentials: true }))
  }

  app.get('/api/health', (c) => c.json({ ok: true }))

  app.post('/api/login', async (c) => {
    if (!(await rateLimiter.allow(`login:${clientKey(c)}`))) {
      c.header('Retry-After', '60')
      return c.json({ error: 'too_many_attempts' }, 429)
    }

    const body = (await c.req.json().catch(() => ({}))) as { password?: unknown }
    const password = typeof body.password === 'string' ? body.password : ''
    if (!(await verifyPassword(password, config.password))) return c.json({ error: 'invalid_password' }, 401)

    setCookie(c, HmacSessionCookie.NAME, await session.issue(now()), {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/',
      maxAge: HmacSessionCookie.MAX_AGE_S,
    })
    return c.body(null, 204)
  })

  app.use('/api/*', async (c, next) => {
    if (!(await session.verify(getCookie(c, HmacSessionCookie.NAME), now()))) {
      return c.json({ error: 'unauthorized' }, 401)
    }
    await next()
  })

  app.post('/api/logout', (c) => {
    deleteCookie(c, HmacSessionCookie.NAME, { path: '/', secure: true, httpOnly: true, sameSite: 'Strict' })
    return c.body(null, 204)
  })

  app.get('/api/progress/monthly', async (c) =>
    c.json(await container.getMonthlyProgressController.handle({ month: c.req.query('month') })),
  )

  app.get('/api/progress/weekly', async (c) =>
    c.json(await container.getWeeklyProgressController.handle({ week: c.req.query('week') })),
  )

  app.get('/api/progress/quarterly', async (c) =>
    c.json(await container.getQuarterlyProgressController.handle({ quarter: c.req.query('quarter') })),
  )

  app.onError((err, c) => {
    if (err instanceof DomainError || err instanceof BusinessRuleException) return c.json({ error: err.message }, 422)
    if (err instanceof ResourceNotFoundException) return c.json({ error: err.message }, 404)
    if (err instanceof NotionMappingError) return c.json({ error: err.message }, 502)
    if (err instanceof NotionApiError) {
      console.error(`[kahuy] ${err.message}`)
      return c.json({ error: 'Falha ao consultar o Notion' }, 502)
    }
    console.error('[kahuy] erro inesperado:', err.name, err.message)
    return c.json({ error: 'internal' }, 500)
  })

  return app
}
