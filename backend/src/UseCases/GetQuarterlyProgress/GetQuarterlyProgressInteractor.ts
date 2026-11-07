import { Quarter } from '../../Entities/Quarter'
import { localDate } from '../../Entities/time'
import { YearMonth } from '../../Entities/YearMonth'
import type { ClockInterface } from '../Contracts/ClockInterface'
import type { TaskRepositoryInterface } from '../Contracts/TaskRepositoryInterface'
import type { WorkCalendarRepositoryInterface } from '../Contracts/WorkCalendarRepositoryInterface'
import type { ProgressSettings } from '../ProgressSettings'
import { buildOutlook, doneTasksIn, elapsedWorkdayRatio, openTasks, remainingWorkingDays, sumHours } from '../Shared/taskAggregations'
import type { GetQuarterlyProgressInputBoundary } from './Boundaries/GetQuarterlyProgressInputBoundary'
import type { GetQuarterlyProgressOutputBoundary } from './Boundaries/GetQuarterlyProgressOutputBoundary'
import type { GetQuarterlyProgressRequestModel } from './DTOs/GetQuarterlyProgressRequestModel'

export class GetQuarterlyProgressInteractor implements GetQuarterlyProgressInputBoundary {
  constructor(
    private readonly tasks: TaskRepositoryInterface,
    private readonly calendar: WorkCalendarRepositoryInterface,
    private readonly clock: ClockInterface,
    private readonly settings: ProgressSettings,
  ) {}

  async execute(request: GetQuarterlyProgressRequestModel, presenter: GetQuarterlyProgressOutputBoundary): Promise<void> {
    const tz = this.settings.timeZone
    const now = this.clock.now()
    const today = localDate(now, tz)
    const current = YearMonth.fromDate(now, tz)
    const quarter = request.quarter ? Quarter.parse(request.quarter) : Quarter.of(current)

    const { tasks: all } = await this.tasks.findAll()
    const openHours = sumHours(openTasks(all, this.settings))

    let remainingDays = 0
    const months = quarter.months().map((month) => {
      const workMonth = this.calendar.workMonth(month)
      const goalHours = workMonth.goal()
      const doneHours = sumHours(doneTasksIn(all, month, this.settings))
      const isCurrent = month.equals(current)
      const expectedHours = goalHours * elapsedWorkdayRatio(workMonth, today)
      remainingDays += remainingWorkingDays(workMonth, today)
      return {
        month: month.toString(),
        goalHours,
        expectedHours,
        doneHours,
        forecastHours: doneHours + (isCurrent ? openHours : 0),
        goalEstimated: workMonth.estimated,
        isCurrent,
      }
    })

    const goalHours = months.reduce((acc, m) => acc + m.goalHours, 0)
    const doneHours = months.reduce((acc, m) => acc + m.doneHours, 0)
    const forecastHours = months.reduce((acc, m) => acc + m.forecastHours, 0)
    const expected = months.reduce((acc, m) => acc + m.expectedHours, 0)
    const scenario = (hours: number) => ({
      hours,
      tiers: buildOutlook(goalHours, expected, hours, this.settings.goalTiers, remainingDays),
    })
    const [, , last] = quarter.months()

    presenter.present({
      quarter: quarter.toString(),
      goalHours,
      doneHours,
      forecastHours,
      period: months.some((m) => m.isCurrent) ? 'current' : last.compare(current) < 0 ? 'past' : 'future',
      remainingWorkingDays: remainingDays,
      delivered: scenario(doneHours),
      forecast: scenario(forecastHours),
      months,
    })
  }
}
