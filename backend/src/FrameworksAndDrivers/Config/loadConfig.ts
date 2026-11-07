import { isIsoDate } from '../../Entities/time'
import type { NotionFieldMap } from '../../InterfaceAdapters/Repositories/NotionTypes'
import { ConfigError } from './ConfigError'

export type Config = {
  notionToken: string
  notionDatabaseId: string
  notionApiUrl: string
  password: string
  fields: NotionFieldMap
  doneStatuses: string[]
  hoursPerDay: number
  goalTiers: number[]
  workingDays: Record<string, number>
  /** data AAAA-MM-DD → nome (vazio quando não informado) */
  holidays: Record<string, string>
  /** só as folgas pessoais (HOLIDAYS / holidays.local.json), já incluídas em `holidays` */
  personalDaysOff: Record<string, string>
  timeZone: string
  allowedOrigin: string | null
  /** Node atrás de proxy reverso próprio: usa X-Forwarded-For como IP do cliente. */
  trustProxy: boolean
  testTypes: string[]
  port: number
}

const MIN_PASSWORD = 16

/**
 * Lê a configuração de `process.env` (Node) ou do `env` do Worker. Os feriados nacionais
 * (NATIONAL_HOLIDAYS) são passados pelo entrypoint; HOLIDAYS traz só as folgas pessoais.
 */
export function loadConfig(env: Record<string, unknown>, nationalHolidays: Record<string, string> = {}): Config {
  const get = (key: string): string | undefined => {
    const v = env[key]
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined
  }
  const required = (key: string): string => {
    const v = get(key)
    if (!v) throw new ConfigError(`Variável ${key} é obrigatória (veja .env.example)`)
    return v
  }
  const list = (key: string, fallback: string) =>
    (get(key) ?? fallback)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

  const password = required('KAHUY_PASSWORD')
  if (password.length < MIN_PASSWORD) {
    throw new ConfigError(
      `KAHUY_PASSWORD precisa ter pelo menos ${MIN_PASSWORD} caracteres (gere com: openssl rand -base64 24). ` +
        'Se a senha tiver # ou espaços, coloque-a entre aspas no .env: KAHUY_PASSWORD="..." (sem aspas, o # vira comentário e corta o valor)',
    )
  }

  const hoursPerDay = Number(get('HOURS_PER_DAY') ?? '8')
  if (!(hoursPerDay > 0)) throw new ConfigError('HOURS_PER_DAY deve ser um número maior que 0')

  const goalTiers = list('GOAL_TIERS', '100,125').map(Number)
  if (goalTiers.length === 0 || goalTiers.some((n) => !(n > 0))) {
    throw new ConfigError('GOAL_TIERS deve ser uma lista de percentuais, ex.: 100,125')
  }

  const timeZone = get('TIMEZONE') ?? 'America/Sao_Paulo'
  try {
    new Intl.DateTimeFormat('en', { timeZone })
  } catch {
    throw new ConfigError(`TIMEZONE inválido: ${timeZone}`)
  }

  const personalDaysOff = parseHolidays(get('HOLIDAYS'))

  const port = Number(get('PORT') ?? '8787')
  if (!Number.isInteger(port) || port <= 0) throw new ConfigError('PORT inválida')

  return {
    notionToken: required('NOTION_TOKEN'),
    notionDatabaseId: required('NOTION_DATABASE_ID'),
    notionApiUrl: (get('NOTION_API_URL') ?? 'https://api.notion.com').replace(/\/$/, ''),
    password,
    fields: {
      title: get('NOTION_FIELD_TITLE') ?? 'Task',
      hours: get('NOTION_FIELD_HOURS') ?? 'Horas',
      status: get('NOTION_FIELD_STATUS') ?? 'Status',
      date: get('NOTION_FIELD_DATE') ?? 'Data',
      type: get('NOTION_FIELD_TYPE') ?? 'Tipo',
    },
    doneStatuses: list('DONE_STATUSES', 'Concluido'),
    hoursPerDay,
    goalTiers,
    workingDays: parseWorkingDays(get('WORKING_DAYS')),
    holidays: { ...validateHolidays(Object.entries(nationalHolidays), 'holidays.json'), ...personalDaysOff },
    personalDaysOff,
    timeZone,
    allowedOrigin: get('ALLOWED_ORIGIN') ?? null,
    trustProxy: parseBoolean('TRUST_PROXY', get('TRUST_PROXY')),
    testTypes: list('TEST_TYPES', 'TESTE'),
    port,
  }
}

/**
 * HOLIDAYS (férias e folgas pessoais; ou holidays.local.json no Node) aceita:
 *   {"2026-11-02":"Finados", ...}  ·  ["2026-11-02", ...]  ·  2026-11-02,2026-11-20
 */
function parseBoolean(key: string, raw: string | undefined): boolean {
  if (raw === undefined) return false
  if (['true', '1'].includes(raw.toLowerCase())) return true
  if (['false', '0'].includes(raw.toLowerCase())) return false
  throw new ConfigError(`${key} deve ser true ou false`)
}

function parseHolidays(raw: string | undefined): Record<string, string> {
  if (!raw) return {}
  let entries: [string, string][]
  if (raw.startsWith('{') || raw.startsWith('[')) {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new ConfigError(`HOLIDAYS / holidays.local.json não é um JSON válido (${HOLIDAYS_HELP})`)
    }
    entries = Array.isArray(parsed)
      ? parsed.map((d) => [String(d), ''])
      : Object.entries(parsed as Record<string, unknown>).map(([d, name]) => [d, typeof name === 'string' ? name : ''])
  } else {
    entries = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((d) => [d, ''])
  }
  return validateHolidays(entries, 'HOLIDAYS / holidays.local.json')
}

const HOLIDAYS_HELP = 'use {"2026-11-02":"Finados"}, ["2026-11-02"] ou 2026-11-02,2026-11-20'

function validateHolidays(entries: [string, string][], source: string): Record<string, string> {
  for (const [d] of entries) {
    if (!isIsoDate(d)) throw new ConfigError(`${source} tem data inválida: "${d}" (${HOLIDAYS_HELP})`)
  }
  return Object.fromEntries(entries)
}

function parseWorkingDays(raw: string | undefined): Record<string, number> {
  if (!raw) return {}
  const invalid = () =>
    new ConfigError('WORKING_DAYS deve ser um JSON como {"2026-11":19,"2026-12":20} (dias inteiros ≥ 0)')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw invalid()
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw invalid()
  for (const [month, days] of Object.entries(parsed)) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !Number.isInteger(days) || (days as number) < 0) throw invalid()
  }
  return parsed as Record<string, number>
}
