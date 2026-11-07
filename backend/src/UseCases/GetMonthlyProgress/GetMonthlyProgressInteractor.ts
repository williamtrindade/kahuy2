import type { Task } from '../../Entities/Task'
import { isWeekday, localDate } from '../../Entities/time'
import { Week } from '../../Entities/Week'
import type { WorkMonth } from '../../Entities/WorkMonth'
import { YearMonth } from '../../Entities/YearMonth'
import type { ClockInterface } from '../Contracts/ClockInterface'
import type { TaskRepositoryInterface } from '../Contracts/TaskRepositoryInterface'
import type { WorkCalendarRepositoryInterface } from '../Contracts/WorkCalendarRepositoryInterface'
import type { ProgressSettings } from '../ProgressSettings'
import {
  buildDayTiers,
  buildOutlook,
  doneTasksIn,
  elapsedWorkdayRatio,
  openTasks,
  remainingWorkingDays,
  sumHours,
} from '../Shared/taskAggregations'
import type { GetMonthlyProgressInputBoundary } from './Boundaries/GetMonthlyProgressInputBoundary'
import type { GetMonthlyProgressOutputBoundary } from './Boundaries/GetMonthlyProgressOutputBoundary'
import type { GetMonthlyProgressRequestModel } from './DTOs/GetMonthlyProgressRequestModel'
import type { GetMonthlyProgressResponseModel } from './DTOs/GetMonthlyProgressResponseModel'

export class GetMonthlyProgressInteractor implements GetMonthlyProgressInputBoundary {
  constructor(
    private readonly tasks: TaskRepositoryInterface,
    private readonly calendar: WorkCalendarRepositoryInterface,
    private readonly clock: ClockInterface,
    private readonly settings: ProgressSettings,
  ) {}

  async execute(request: GetMonthlyProgressRequestModel, presenter: GetMonthlyProgressOutputBoundary): Promise<void> {
    const tz = this.settings.timeZone
    const now = this.clock.now()
    const today = localDate(now, tz)
    const current = YearMonth.fromDate(now, tz)
    const month = request.month ? YearMonth.parse(request.month) : current
    const isCurrent = month.equals(current)

    const { tasks: all, invalid } = await this.tasks.findAll()
    const workMonth = this.calendar.workMonth(month)
    const goal = workMonth.goal()

    const done = doneTasksIn(all, month, this.settings)
    const open = isCurrent ? openTasks(all, this.settings) : []
    const doneHours = sumHours(done)
    const openHours = sumHours(open)
    const remainingDays = remainingWorkingDays(workMonth, today)
    const { weekOf, weeks } = monthWeeks(month, today)
    const expected = goal * elapsedWorkdayRatio(workMonth, today)
    // Ritmo do mês: hoje não entra (ainda está em andamento), igual ao "no ritmo".
    const closedWorkdays = workMonth.workdays.filter((d) => d < today).length
    const doneBeforeToday = sumHours(done.filter((t) => t.completionLocalDate(tz)! < today))
    const pace = closedWorkdays > 0 ? doneBeforeToday / closedWorkdays : null
    const scenario = (hours: number) => ({
      hours,
      tiers: buildOutlook(goal, expected, hours, this.settings.goalTiers, remainingDays),
    })

    presenter.present({
      month: month.toString(),
      isCurrent,
      period: isCurrent ? 'current' : month.compare(current) < 0 ? 'past' : 'future',
      goalHours: goal,
      goalEstimated: workMonth.estimated,
      workingDays: workMonth.workingDays,
      doneHours,
      openHours,
      forecastHours: doneHours + openHours,
      remainingWorkingDays: remainingDays,
      dailyGoalHours: workMonth.hoursPerDay,
      pacePerWorkday: pace,
      projectedHours: pace === null ? null : Math.max(doneHours, doneBeforeToday + pace * remainingDays),
      delivered: scenario(doneHours),
      forecast: scenario(doneHours + openHours),
      today: isCurrent ? this.todayProgress(all, today, workMonth.hoursPerDay, openHours) : null,
      calendar: this.monthCalendar(month, done),
      dailyCumulative: this.dailyCumulative(workMonth, done, goal),
      tasks: this.monthTasks(open, done, weekOf, weekOf.get(today)),
      weeks,
      doneTaskCount: done.length,
      averageHoursPerTask: done.length ? doneHours / done.length : 0,
      hoursByType: groupHours(done, (t) => t.type).map(([type, hours]) => ({ type, hours })),
      hoursByDeveloper: groupHours(done, (t) => t.developer(this.settings.testTypes)).map(([developer, hours]) => ({ developer, hours })),
      hoursByRequester: groupHours(done, (t) => t.requester(this.settings.testTypes)).map(([requester, hours]) => ({ requester, hours })),
      undatedTasks: all
        .filter((t) => t.isDone(this.settings.doneStatuses) && t.completionDate() === null)
        .map((t) => ({ title: t.title, url: t.url })),
      invalidTasks: invalid,
    })
  }

  private monthTasks(
    open: Task[],
    done: Task[],
    weekOf: ReadonlyMap<string, string>,
    currentWeek: string | undefined,
  ): GetMonthlyProgressResponseModel['tasks'] {
    const tz = this.settings.timeZone
    const row = (t: Task, isDone: boolean) => ({
      title: t.title,
      status: t.status,
      hours: t.hours,
      url: t.url,
      done: isDone,
      kind: t.isTest(this.settings.testTypes) ? ('test' as const) : ('development' as const),
      date: isDone ? t.completionLocalDate(tz) : null,
      // abertas só existem no mês corrente, então currentWeek está definido
      week: isDone ? weekOf.get(t.completionLocalDate(tz)!)! : currentWeek!,
    })
    const finished = done.map((t) => row(t, true)).sort((a, b) => b.date!.localeCompare(a.date!))
    return [...open.map((t) => row(t, false)), ...finished]
  }

  private todayProgress(all: Task[], today: string, hoursPerDay: number, openHours: number): GetMonthlyProgressResponseModel['today'] {
    const tz = this.settings.timeZone
    const doneHours = sumHours(
      all.filter((t) => t.isDone(this.settings.doneStatuses) && t.completionLocalDate(tz) === today),
    )
    const isWorkingDay = this.calendar.isWorkday(today)
    const goalHours = isWorkingDay ? hoursPerDay : 0
    return {
      date: today,
      isWorkingDay,
      isHoliday: isWeekday(today) && !isWorkingDay,
      holidayName: isWeekday(today) && !isWorkingDay ? (this.calendar.dayOff(today)?.name ?? null) : null,
      doneHours,
      openHours,
      goalHours,
      delivered: { hours: doneHours, tiers: buildDayTiers(goalHours, doneHours, this.settings.goalTiers) },
      forecast: { hours: doneHours + openHours, tiers: buildDayTiers(goalHours, doneHours + openHours, this.settings.goalTiers) },
    }
  }

  private monthCalendar(month: YearMonth, done: Task[]): GetMonthlyProgressResponseModel['calendar'] {
    const tz = this.settings.timeZone
    const hoursByDate = new Map<string, number>()
    for (const t of done) {
      const date = t.completionLocalDate(tz)!
      hoursByDate.set(date, (hoursByDate.get(date) ?? 0) + t.hours)
    }
    return month.days().map((date) => {
      const off = this.calendar.dayOff(date)
      const kind = off ? off.kind : isWeekday(date) ? 'workday' : 'weekend'
      return { date, kind, name: off?.name ?? null, doneHours: hoursByDate.get(date) ?? 0 }
    })
  }

  private dailyCumulative(workMonth: WorkMonth, done: Task[], goal: number) {
    const tz = this.settings.timeZone
    const weekdays = workMonth.workdays
    const dated = done.map((t) => ({ date: t.completionLocalDate(tz)!, hours: t.hours }))
    return workMonth.month.days().map((date) => {
      const ratio = weekdays.length ? weekdays.filter((d) => d <= date).length / weekdays.length : 0
      return {
        date,
        doneHours: dated.filter((d) => d.date <= date).reduce((acc, d) => acc + d.hours, 0),
        ideal: this.settings.goalTiers.map((percent) => ({ percent, hours: ((goal * percent) / 100) * ratio })),
      }
    })
  }
}

/** Semanas (domingo a sábado) que tocam o mês, e a semana (start) de cada dia do mês. */
function monthWeeks(month: YearMonth, today: string) {
  const weekOf = new Map<string, string>()
  const weeks: GetMonthlyProgressResponseModel['weeks'] = []
  for (const date of month.days()) {
    const week = Week.containing(date)
    const last = weeks.at(-1)
    if (last?.start === week.start) last.inMonthEnd = date
    else weeks.push({ start: week.start, end: week.end, inMonthStart: date, inMonthEnd: date, isCurrent: week.days().includes(today) })
    weekOf.set(date, week.start)
  }
  return { weekOf, weeks }
}

function groupHours(tasks: Task[], key: (t: Task) => string | null): [string, number][] {
  const totals = new Map<string, number>()
  for (const t of tasks) {
    const k = key(t)
    if (k) totals.set(k, (totals.get(k) ?? 0) + t.hours)
  }
  return [...totals].sort((a, b) => b[1] - a[1])
}
