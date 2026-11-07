import { Quarter } from '../../Entities/Quarter'
import { localDate } from '../../Entities/time'
import { YearMonth } from '../../Entities/YearMonth'
import type { ClockInterface } from '../Contracts/ClockInterface'
import type { TaskRepositoryInterface } from '../Contracts/TaskRepositoryInterface'
import type { WorkCalendarRepositoryInterface } from '../Contracts/WorkCalendarRepositoryInterface'
import type { ProgressSettings } from '../ProgressSettings'
import { buildTiers, doneTasksIn, elapsedWorkdayRatio, openTasks, sumHours } from '../Shared/taskAggregations'
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

    let expected100 = 0
    const months = quarter.months().map((month) => {
      const workMonth = this.calendar.workMonth(month)
      const goalHours = workMonth.goal()
      const doneHours = sumHours(doneTasksIn(all, month, this.settings))
      const isCurrent = month.equals(current)
      expected100 += goalHours * elapsedWorkdayRatio(workMonth, today)
      return {
        month: month.toString(),
        goalHours,
        doneHours,
        forecastHours: doneHours + (isCurrent ? openHours : 0),
        goalEstimated: workMonth.estimated,
        isCurrent,
      }
    })

    const goalHours = months.reduce((acc, m) => acc + m.goalHours, 0)
    const doneHours = months.reduce((acc, m) => acc + m.doneHours, 0)

    presenter.present({
      quarter: quarter.toString(),
      goalHours,
      doneHours,
      forecastHours: months.reduce((acc, m) => acc + m.forecastHours, 0),
      remainingHours: Math.max(0, goalHours - doneHours),
      tiers: buildTiers(goalHours, expected100, doneHours, this.settings.goalTiers),
      months,
    })
  }
}
