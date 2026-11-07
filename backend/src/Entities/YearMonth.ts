import { DomainError } from './DomainError'
import { isWeekday, localDate } from './time'

const pad = (n: number) => String(n).padStart(2, '0')

export class YearMonth {
  private constructor(
    readonly year: number,
    readonly month: number,
  ) {}

  static parse(s: string): YearMonth {
    const m = /^(\d{4})-(\d{2})$/.exec(s)
    const month = m ? Number(m[2]) : 0
    if (!m || month < 1 || month > 12) throw new DomainError(`Mês inválido: "${s}" (use AAAA-MM)`)
    return new YearMonth(Number(m[1]), month)
  }

  static fromDate(d: Date, timeZone: string): YearMonth {
    return YearMonth.parse(localDate(d, timeZone).slice(0, 7))
  }

  toString(): string {
    return `${this.year}-${pad(this.month)}`
  }

  equals(o: YearMonth): boolean {
    return this.compare(o) === 0
  }

  compare(o: YearMonth): number {
    return this.year * 12 + this.month - (o.year * 12 + o.month)
  }

  next(): YearMonth {
    return this.month === 12 ? new YearMonth(this.year + 1, 1) : new YearMonth(this.year, this.month + 1)
  }

  days(): string[] {
    const count = new Date(Date.UTC(this.year, this.month, 0)).getUTCDate()
    return Array.from({ length: count }, (_, i) => `${this}-${pad(i + 1)}`)
  }

  weekdays(): string[] {
    return this.days().filter(isWeekday)
  }

  quarterNumber(): 1 | 2 | 3 | 4 {
    return (Math.floor((this.month - 1) / 3) + 1) as 1 | 2 | 3 | 4
  }
}
