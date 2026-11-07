import national from '../../../holidays.json'

/**
 * Feriados nacionais (backend/holidays.json, versionado). Vão no build, então valem igual no
 * Node e no Worker; atualize com `npm run holidays -- AAAA`.
 */
export const NATIONAL_HOLIDAYS: Record<string, string> = national

/** Férias e folgas pessoais no Node (fora do git). No Worker, use a variável HOLIDAYS. */
export const LOCAL_HOLIDAYS_FILE = 'holidays.local.json'
