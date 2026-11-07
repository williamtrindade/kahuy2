import { DomainError } from './DomainError'
import { addDays, isIsoDate, weekStart } from './time'

/** Semana de domingo a sábado, identificada pelo domingo (data ISO). */
export class Week {
  private constructor(readonly start: string) {}

  /** Semana que contém a data AAAA-MM-DD (qualquer dia dela serve). */
  static parse(s: string): Week {
    if (!isIsoDate(s)) throw new DomainError(`Semana inválida: "${s}" (use uma data AAAA-MM-DD)`)
    return Week.containing(s)
  }

  static containing(isoDate: string): Week {
    return new Week(weekStart(isoDate))
  }

  get end(): string {
    return addDays(this.start, 6)
  }

  days(): string[] {
    return Array.from({ length: 7 }, (_, i) => addDays(this.start, i))
  }

  previous(): Week {
    return new Week(addDays(this.start, -7))
  }

  next(): Week {
    return new Week(addDays(this.start, 7))
  }
}
