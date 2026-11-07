import { describe, expect, it } from 'vitest'
import { loadConfig } from '../../src/FrameworksAndDrivers/Config/loadConfig'
import { CSP, createApp } from '../../src/FrameworksAndDrivers/Http/HonoApp'
import { buildContainer } from '../../src/FrameworksAndDrivers/Providers/CleanArchServiceProvider'
import { MemoryRateLimiter } from '../../src/FrameworksAndDrivers/Security/MemoryRateLimiter'
import { FixedClock } from '../support/fakes'
import page1 from '../fixtures/notion-query-page1.json'
import page2 from '../fixtures/notion-query-page2.json'

const PASSWORD = 'senha-forte-de-teste-123'
const NOW = '2026-11-05T15:00:00Z'

const notionFetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
  const body = JSON.parse(String(init?.body ?? '{}')) as { start_cursor?: string }
  return Response.json(body.start_cursor === 'c2' ? page2 : page1)
}) as typeof fetch

function makeApp(extraEnv: Record<string, string> = {}) {
  const config = loadConfig({
    NOTION_TOKEN: 'secret_x',
    NOTION_DATABASE_ID: 'db',
    KAHUY_PASSWORD: PASSWORD,
    WORKING_DAYS: '{"2026-11":19}',
    ...extraEnv,
  })
  return createApp({
    config,
    container: buildContainer(config, { fetchFn: notionFetch, clock: new FixedClock(NOW) }),
    rateLimiter: new MemoryRateLimiter(),
    now: () => Date.parse(NOW),
  })
}

type App = ReturnType<typeof makeApp>

const login = (app: App, password: string) =>
  app.request('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
  })

async function sessionCookie(app: App): Promise<string> {
  const res = await login(app, PASSWORD)
  return res.headers.get('set-cookie')!.split(';')[0]!
}

describe('HonoApp', () => {
  it('health is public', async () => {
    const res = await makeApp().request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('protected routes require a session', async () => {
    const res = await makeApp().request('/api/progress/monthly')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })

  it('rejects a wrong password', async () => {
    expect((await login(makeApp(), 'errada-errada-errada')).status).toBe(401)
  })

  it('issues a hardened session cookie', async () => {
    const res = await login(makeApp(), PASSWORD)
    expect(res.status).toBe(204)
    const cookie = res.headers.get('set-cookie')!
    expect(cookie).toMatch(/^kahuy_session=[^;]+/)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/Secure/i)
    expect(cookie).toMatch(/SameSite=Strict/i)
    expect(cookie).toMatch(/Path=\//)
    expect(cookie).toMatch(/Max-Age=2592000/)
  })

  it('serves monthly progress with a session', async () => {
    const app = makeApp()
    const res = await app.request('/api/progress/monthly?month=2026-11', { headers: { cookie: await sessionCookie(app) } })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { month: string; doneHours: number; goalHours: number; openHours: number }
    expect(body).toMatchObject({ month: '2026-11', goalHours: 152, doneHours: 7, openHours: 6 })
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('referrer-policy')).toBe('no-referrer')
  })

  it('serves weekly progress for the week of a date', async () => {
    const app = makeApp()
    const res = await app.request('/api/progress/weekly?week=2026-11-04', { headers: { cookie: await sessionCookie(app) } })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ start: '2026-11-01', end: '2026-11-07', period: 'current' })
    const bad = await app.request('/api/progress/weekly?week=xx', { headers: { cookie: await sessionCookie(app) } })
    expect(bad.status).toBe(422)
  })

  it('serves quarterly progress with a session', async () => {
    const app = makeApp()
    const res = await app.request('/api/progress/quarterly?quarter=2026-Q4', { headers: { cookie: await sessionCookie(app) } })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ quarter: '2026-Q4' })
  })

  it('maps domain errors to 422', async () => {
    const app = makeApp()
    const res = await app.request('/api/progress/monthly?month=xx', { headers: { cookie: await sessionCookie(app) } })
    expect(res.status).toBe(422)
    expect(((await res.json()) as { error: string }).error).toContain('xx')
  })

  it('maps a missing Notion field to 502 naming the field', async () => {
    const app = makeApp({ NOTION_FIELD_HOURS: 'Hours' })
    const res = await app.request('/api/progress/monthly', { headers: { cookie: await sessionCookie(app) } })
    expect(res.status).toBe(502)
    expect(((await res.json()) as { error: string }).error).toContain('"Hours"')
  })

  it('maps Notion API failures to 502 without details', async () => {
    const config = loadConfig({ NOTION_TOKEN: 'secret_x', NOTION_DATABASE_ID: 'db', KAHUY_PASSWORD: PASSWORD })
    const failing = (async () => Response.json({ message: 'API token is invalid.' }, { status: 401 })) as typeof fetch
    const app = createApp({
      config,
      container: buildContainer(config, { fetchFn: failing, clock: new FixedClock(NOW) }),
      rateLimiter: new MemoryRateLimiter(),
      now: () => Date.parse(NOW),
    })
    const res = await app.request('/api/progress/monthly', { headers: { cookie: await sessionCookie(app) } })
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'Falha ao consultar o Notion' })
  })

  it('logout clears the cookie', async () => {
    const app = makeApp()
    const res = await app.request('/api/logout', { method: 'POST', headers: { cookie: await sessionCookie(app) } })
    expect(res.status).toBe(204)
    expect(res.headers.get('set-cookie')).toMatch(/kahuy_session=;.*Max-Age=0/)
  })

  it('ignores spoofable forwarding headers for the rate limit key by default (I3)', async () => {
    const app = makeApp()
    for (let i = 0; i < 5; i++) {
      await app.request('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${i}`, 'cf-connecting-ip': `10.1.0.${i}` },
        body: JSON.stringify({ password: 'x'.repeat(16) }),
      })
    }
    const res = await app.request('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.9.9.9' },
      body: JSON.stringify({ password: PASSWORD }),
    })
    expect(res.status).toBe(429)
  })

  it('rate limits login attempts with Retry-After', async () => {
    const app = makeApp()
    for (let i = 0; i < 5; i++) await login(app, 'x'.repeat(16))
    const res = await login(app, PASSWORD)
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('60')
  })

  it('keeps separate counters per client', async () => {
    const config = loadConfig({ NOTION_TOKEN: 'secret_x', NOTION_DATABASE_ID: 'db', KAHUY_PASSWORD: PASSWORD })
    const app = createApp({
      config,
      container: buildContainer(config, { fetchFn: notionFetch, clock: new FixedClock(NOW) }),
      rateLimiter: new MemoryRateLimiter(),
      now: () => Date.parse(NOW),
      clientKey: (c) => c.req.header('x-test-ip') ?? 'none',
    })
    const attempt = (ip: string, password: string) =>
      app.request('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-test-ip': ip },
        body: JSON.stringify({ password }),
      })
    for (let i = 0; i < 5; i++) await attempt('atacante', 'x'.repeat(16))
    expect((await attempt('atacante', PASSWORD)).status).toBe(429)
    expect((await attempt('voce', PASSWORD)).status).toBe(204)
  })
})
