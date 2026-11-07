import { DomainError } from './DomainError'
import { localDate } from './time'
import { YearMonth } from './YearMonth'

export type TaskProps = {
  id: string
  title: string
  hours: number
  status: string
  type: string | null
  startDate: Date | null
  endDate: Date | null
  url: string
}

export class Task {
  readonly id: string
  readonly title: string
  readonly hours: number
  readonly status: string
  readonly type: string | null
  readonly startDate: Date | null
  readonly endDate: Date | null
  readonly url: string

  constructor(props: TaskProps) {
    if (!Number.isFinite(props.hours) || props.hours < 0) {
      throw new DomainError(`Horas inválidas na task "${props.title}": ${props.hours}`)
    }
    this.id = props.id
    this.title = props.title
    this.hours = props.hours
    this.status = props.status
    this.type = props.type
    this.startDate = props.startDate
    this.endDate = props.endDate
    this.url = props.url
  }

  isDone(doneStatuses: readonly string[]): boolean {
    return doneStatuses.includes(this.status)
  }

  completionDate(): Date | null {
    return this.endDate ?? this.startDate
  }

  completionLocalDate(timeZone: string): string | null {
    const d = this.completionDate()
    return d ? localDate(d, timeZone) : null
  }

  completionMonth(timeZone: string): YearMonth | null {
    const d = this.completionDate()
    return d ? YearMonth.fromDate(d, timeZone) : null
  }

  /** Nome no último [colchete] do título. */
  bracketName(): string | null {
    const matches = [...this.title.matchAll(/\[([^\]]+)\]/g)]
    const last = matches.at(-1)?.[1]?.trim()
    return last ? last : null
  }

  isTest(testTypes: readonly string[]): boolean {
    return this.type !== null && testTypes.includes(this.type)
  }

  /** Em tasks de teste, o [nome] é o dev que fez o que foi testado. */
  developer(testTypes: readonly string[]): string | null {
    return this.isTest(testTypes) ? this.bracketName() : null
  }

  /** Nas demais tasks, o [nome] é quem pediu. */
  requester(testTypes: readonly string[]): string | null {
    return this.isTest(testTypes) ? null : this.bracketName()
  }
}
