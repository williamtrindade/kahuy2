// Baixa os feriados nacionais (BrasilAPI) e junta no holidays.json (versionado), sem apagar o que já existe.
// Férias, emendas e feriados locais vão no holidays.local.json (fora do git).
// Uso: npm run holidays -- 2026 2027
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const FILE = 'holidays.json'
const OPTIONAL = new Set(['Carnaval', 'Corpus Christi']) // pontos facultativos: confira com a empresa

const years = process.argv.slice(2).filter((y) => /^\d{4}$/.test(y))
if (years.length === 0) years.push(String(new Date().getFullYear()))

const holidays = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {}
let added = 0
for (const year of years) {
  const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`)
  if (!res.ok) throw new Error(`BrasilAPI respondeu ${res.status} para ${year}`)
  for (const { date, name } of await res.json()) {
    if (date in holidays) continue
    holidays[date] = OPTIONAL.has(name) ? `${name} (ponto facultativo)` : name
    added += 1
  }
}

const sorted = Object.fromEntries(Object.entries(holidays).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(FILE, `${JSON.stringify(sorted, null, 2)}\n`)
console.log(`${FILE}: ${added} feriado(s) adicionados (${years.join(', ')}). Férias e emendas: holidays.local.json`)
