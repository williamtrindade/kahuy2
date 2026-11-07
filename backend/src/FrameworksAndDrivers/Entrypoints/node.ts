import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { ConfigError } from '../Config/ConfigError'
import { LOCAL_HOLIDAYS_FILE, NATIONAL_HOLIDAYS } from '../Config/holidays'
import { loadConfig } from '../Config/loadConfig'
import { createApp } from '../Http/HonoApp'
import { buildContainer } from '../Providers/CleanArchServiceProvider'
import { nodeClientKey } from '../Security/clientKey'
import { MemoryRateLimiter } from '../Security/MemoryRateLimiter'

// .env e holidays.local.json ficam na raiz do backend/
const backendRoot = resolve(fileURLToPath(import.meta.url), '../../../..')

try {
  process.loadEnvFile(resolve(backendRoot, '.env'))
} catch {
  // sem .env: usa apenas as variáveis do ambiente
}

let config
try {
  // Folgas pessoais: HOLIDAYS no .env ou, se ausente, holidays.local.json. Os nacionais vêm no build.
  const localFile = resolve(backendRoot, LOCAL_HOLIDAYS_FILE)
  if (!process.env.HOLIDAYS && existsSync(localFile)) process.env.HOLIDAYS = readFileSync(localFile, 'utf8')
  config = loadConfig(process.env, NATIONAL_HOLIDAYS)
} catch (err) {
  if (err instanceof ConfigError) {
    console.error(`[kahuy] ${err.message}`)
    process.exit(1)
  }
  throw err
}

// Mesma regra do Cloudflare (wrangler.toml): 5 tentativas de login por minuto, por IP.
const app = createApp({
  config,
  container: buildContainer(config),
  rateLimiter: new MemoryRateLimiter(5, 60_000),
  clientKey: nodeClientKey(config.trustProxy),
})

// Só API: o front é servido pelo Vite (dev/preview) ou pelo Cloudflare (produção).
app.all('*', (c) => c.json({ error: 'not_found' }, 404))

serve({ fetch: app.fetch, port: config.port, hostname: '127.0.0.1' }, (info) => {
  console.log(`[kahuy] http://127.0.0.1:${info.port}`)
})
