import { DomainError } from './DomainError'
import { YearMonth } from './YearMonth'

export class Quarter {
  private constructor(
    readonly year: number,
    readonly n: 1 | 2 | 3 | 4,
  ) {}

  static parse(s: string): Quarter {
    const m = /^(\d{4})-Q([1-4])$/.exec(s)
    if (!m) throw new DomainError(`Trimestre inválido: "${s}" (use AAAA-Qn)`)
    return new Quarter(Number(m[1]), Number(m[2]) as 1 | 2 | 3 | 4)
  }

  static of(m: YearMonth): Quarter {
    return new Quarter(m.year, m.quarterNumber())
  }

  months(): [YearMonth, YearMonth, YearMonth] {
    const first = YearMonth.parse(`${this.year}-${String((this.n - 1) * 3 + 1).padStart(2, '0')}`)
    const second = first.next()
    return [first, second, second.next()]
  }

  toString(): string {
    return `${this.year}-Q${this.n}`
  }
}
