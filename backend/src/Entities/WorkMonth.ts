import { DomainError } from './DomainError'
import type { YearMonth } from './YearMonth'

export class WorkMonth {
  constructor(
    readonly month: YearMonth,
    readonly workingDays: number,
    readonly hoursPerDay: number,
    readonly estimated: boolean,
    /** Datas úteis do mês (seg–sex sem feriados), usadas no ritmo e na linha ideal. */
    readonly workdays: readonly string[],
  ) {
    if (!Number.isInteger(workingDays) || workingDays < 0) {
      throw new DomainError(`Dias úteis inválidos para ${month}: ${workingDays}`)
    }
    if (!(hoursPerDay > 0)) throw new DomainError(`Horas por dia inválidas: ${hoursPerDay}`)
  }

  goal(): number {
    return this.workingDays * this.hoursPerDay
  }
}
