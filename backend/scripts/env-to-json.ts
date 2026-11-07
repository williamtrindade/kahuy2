// Converte o .env (+ holidays.local.json, suas folgas) em JSON para `wrangler secret bulk`.
// Os feriados nacionais (holidays.json) já vão no build do Worker.
// Uso: tsx scripts/env-to-json.ts .env > secrets.json
import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { LOCAL_HOLIDAYS_FILE } from '../src/FrameworksAndDrivers/Config/holidays'

const file = process.argv[2] ?? '.env'
const vars = parseEnv(readFileSync(file, 'utf8'))
if (!vars.HOLIDAYS && existsSync(LOCAL_HOLIDAYS_FILE)) {
  vars.HOLIDAYS = JSON.stringify(JSON.parse(readFileSync(LOCAL_HOLIDAYS_FILE, 'utf8')))
}
delete vars.PORT
delete vars.NOTION_API_URL
process.stdout.write(JSON.stringify(vars, null, 2))
