const formatters = new Map<string, Intl.DateTimeFormat>()

/** Data ISO (YYYY-MM-DD) do instante `d` no fuso `timeZone`. */
export function localDate(d: Date, timeZone: string): string {
  let fmt = formatters.get(timeZone)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    formatters.set(timeZone, fmt)
  }
  return fmt.format(d)
}

/** Data ISO (AAAA-MM-DD) que existe no calendário (rejeita 2026-02-30 e 2026-13-01). */
export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

/** Segunda a sexta. */
export function isWeekday(isoDate: string): boolean {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay()
  return day >= 1 && day <= 5
}

/** Soma `days` dias a uma data ISO (YYYY-MM-DD). */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Domingo da semana (domingo a sábado) que contém a data. */
export function weekStart(isoDate: string): string {
  return addDays(isoDate, -new Date(`${isoDate}T00:00:00Z`).getUTCDay())
}
