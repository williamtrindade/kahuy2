import { isWeekday } from '../../Entities/time'
import { WorkMonth } from '../../Entities/WorkMonth'
import type { YearMonth } from '../../Entities/YearMonth'
import type { DayOff, WorkCalendarRepositoryInterface } from '../../UseCases/Contracts/WorkCalendarRepositoryInterface'

/**
 * Dia útil = seg–sex fora de HOLIDAYS. A quantidade do mês vem de WORKING_DAYS quando
 * configurada; senão é calculada, e fica marcada como estimada se o ano não tiver nenhum feriado.
 */
export class EnvWorkCalendarRepository implements WorkCalendarRepositoryInterface {
  private readonly holidays: ReadonlyMap<string, string>
  private readonly yearsWithHolidays: ReadonlySet<number>

  constructor(
    private readonly workingDays: Record<string, number>,
    private readonly hoursPerDay: number,
    /** todas as folgas (nacionais + pessoais; o pessoal já venceu na data repetida) */
    holidays: Record<string, string> = {},
    /** só as pessoais, para distinguir férias de feriado */
    private readonly personal: Record<string, string> = {},
  ) {
    this.holidays = new Map(Object.entries(holidays))
    this.yearsWithHolidays = new Set(Object.keys(holidays).map((d) => Number(d.slice(0, 4))))
  }

  isWorkday(date: string): boolean {
    return isWeekday(date) && !this.holidays.has(date)
  }

  dayOff(date: string): DayOff | null {
    if (date in this.personal) return { kind: 'vacation', name: this.personal[date]! }
    const name = this.holidays.get(date)
    return name === undefined ? null : { kind: 'holiday', name }
  }

  workMonth(month: YearMonth): WorkMonth {
    const workdays = month.days().filter((d) => this.isWorkday(d))
    const configured = this.workingDays[month.toString()]
    return configured === undefined
      ? new WorkMonth(month, workdays.length, this.hoursPerDay, !this.yearsWithHolidays.has(month.year), workdays)
      : new WorkMonth(month, configured, this.hoursPerDay, false, workdays)
  }
}
