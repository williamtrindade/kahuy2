import { localDate } from '../../Entities/time'
import { Week } from '../../Entities/Week'
import { YearMonth } from '../../Entities/YearMonth'
import type { ClockInterface } from '../Contracts/ClockInterface'
import type { TaskRepositoryInterface } from '../Contracts/TaskRepositoryInterface'
import type { WorkCalendarRepositoryInterface } from '../Contracts/WorkCalendarRepositoryInterface'
import type { ProgressSettings } from '../ProgressSettings'
import { buildOutlook, openTasks, sumHours } from '../Shared/taskAggregations'
import type { GetWeeklyProgressInputBoundary } from './Boundaries/GetWeeklyProgressInputBoundary'
import type { GetWeeklyProgressOutputBoundary } from './Boundaries/GetWeeklyProgressOutputBoundary'
import type { GetWeeklyProgressRequestModel } from './DTOs/GetWeeklyProgressRequestModel'

export class GetWeeklyProgressInteractor implements GetWeeklyProgressInputBoundary {
  constructor(
    private readonly tasks: TaskRepositoryInterface,
    private readonly calendar: WorkCalendarRepositoryInterface,
    private readonly clock: ClockInterface,
    private readonly settings: ProgressSettings,
  ) {}

  async execute(request: GetWeeklyProgressRequestModel, presenter: GetWeeklyProgressOutputBoundary): Promise<void> {
    const tz = this.settings.timeZone
    const today = localDate(this.clock.now(), tz)
    const week = request.week ? Week.parse(request.week) : Week.containing(today)
    const dates = week.days()
    const isCurrent = dates.includes(today)

    const { tasks: all } = await this.tasks.findAll()
    const doneOn = (pick: (date: string) => boolean) =>
      sumHours(
        all.filter((t) => {
          const date = t.isDone(this.settings.doneStatuses) ? t.completionLocalDate(tz) : null
          return date !== null && dates.includes(date) && pick(date)
        }),
      )
    const doneHours = doneOn(() => true)
    // Abertas contam só no período corrente (spec §2).
    const openHours = isCurrent ? sumHours(openTasks(all, this.settings)) : 0

    const hoursPerDay = this.calendar.workMonth(YearMonth.parse(week.start.slice(0, 7))).hoursPerDay
    const workdays = dates.filter((d) => this.calendar.isWorkday(d))
    const closed = workdays.filter((d) => d < today).length
    const remainingWorkdays = workdays.length - closed
    const goalHours = workdays.length * hoursPerDay
    const expected = closed * hoursPerDay
    const scenario = (hours: number) => ({
      hours,
      tiers: buildOutlook(goalHours, expected, hours, this.settings.goalTiers, remainingWorkdays),
    })

    presenter.present({
      start: week.start,
      end: week.end,
      period: isCurrent ? 'current' : week.end < today ? 'past' : 'future',
      previousWeek: week.previous().start,
      nextWeek: week.next().start,
      goalHours,
      workingDays: workdays.length,
      remainingWorkdays,
      doneHours,
      openHours,
      forecastHours: doneHours + openHours,
      delivered: scenario(doneHours),
      forecast: scenario(doneHours + openHours),
    })
  }
}
