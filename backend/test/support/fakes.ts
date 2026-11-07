import { Task, type TaskProps } from '../../src/Entities/Task'
import { isWeekday } from '../../src/Entities/time'
import { WorkMonth } from '../../src/Entities/WorkMonth'
import type { YearMonth } from '../../src/Entities/YearMonth'
import type { ClockInterface } from '../../src/UseCases/Contracts/ClockInterface'
import type { InvalidTask, TaskList, TaskRepositoryInterface } from '../../src/UseCases/Contracts/TaskRepositoryInterface'
import type { DayOff, WorkCalendarRepositoryInterface } from '../../src/UseCases/Contracts/WorkCalendarRepositoryInterface'

export class InMemoryTaskRepository implements TaskRepositoryInterface {
  constructor(
    private readonly tasks: Task[],
    private readonly invalid: InvalidTask[] = [],
  ) {}
  async findAll(): Promise<TaskList> {
    return { tasks: this.tasks, invalid: this.invalid }
  }
}

export class FixedCalendar implements WorkCalendarRepositoryInterface {
  constructor(
    private readonly days: Record<string, number>,
    private readonly hoursPerDay = 8,
    private readonly holidays: Record<string, string> = {},
    private readonly vacations: Record<string, string> = {},
  ) {}
  isWorkday(date: string): boolean {
    return isWeekday(date) && !(date in this.holidays) && !(date in this.vacations)
  }
  dayOff(date: string): DayOff | null {
    if (date in this.vacations) return { kind: 'vacation', name: this.vacations[date]! }
    return date in this.holidays ? { kind: 'holiday', name: this.holidays[date]! } : null
  }
  workMonth(month: YearMonth): WorkMonth {
    const workdays = month.days().filter((d) => this.isWorkday(d))
    const configured = this.days[month.toString()]
    return configured === undefined
      ? new WorkMonth(month, workdays.length, this.hoursPerDay, !Object.keys(this.holidays).some((d) => d.startsWith(`${month.year}-`)), workdays)
      : new WorkMonth(month, configured, this.hoursPerDay, false, workdays)
  }
}

export class FixedClock implements ClockInterface {
  constructor(private readonly iso: string) {}
  now(): Date {
    return new Date(this.iso)
  }
}

export class CapturingPresenter<T> {
  response: T | undefined
  present(response: T): void {
    this.response = response
  }
}

let seq = 0
export function makeTask(overrides: Partial<TaskProps>): Task {
  seq += 1
  return new Task({
    id: String(seq),
    title: `Task ${seq}`,
    hours: 1,
    status: 'Concluido',
    type: null,
    startDate: null,
    endDate: null,
    url: `https://notion.so/${seq}`,
    ...overrides,
  })
}

/** Cenário de novembro/2026 usado nos testes dos casos de uso. */
export function novemberTasks(): Task[] {
  return [
    makeTask({ title: 'A [Guidolin]', hours: 3, type: 'TESTE', startDate: new Date('2026-11-02T12:00:00Z'), endDate: new Date('2026-11-03T15:00:00Z') }),
    makeTask({ title: 'B', hours: 2, type: 'PROGRAMAÇÂO', startDate: new Date('2026-11-03T12:00:00Z'), endDate: new Date('2026-11-04T15:00:00Z') }),
    makeTask({ title: 'C', hours: 5, type: 'TESTE', startDate: new Date('2026-10-29T12:00:00Z'), endDate: new Date('2026-10-30T15:00:00Z') }),
    makeTask({ title: 'D', hours: 6, status: 'Aguardando', startDate: new Date('2026-10-20T12:00:00Z') }),
    makeTask({ title: 'E', hours: 1 }),
  ]
}
