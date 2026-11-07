import type { GetQuarterlyProgressResponseModel as R } from '../../UseCases/GetQuarterlyProgress/DTOs/GetQuarterlyProgressResponseModel'
import { type GoalTierViewModel, toGoalTierViewModel } from './GoalTierViewModel'
import { percent, round1 } from './round'

export type QuarterlyProgressViewModel = Omit<R, 'tiers' | 'months'> & {
  donePercent: number
  forecastPercent: number
  tiers: GoalTierViewModel[]
  months: (R['months'][number] & { donePercent: number })[]
}

export function toQuarterlyProgressViewModel(r: R): QuarterlyProgressViewModel {
  return {
    ...r,
    goalHours: round1(r.goalHours),
    doneHours: round1(r.doneHours),
    forecastHours: round1(r.forecastHours),
    remainingHours: round1(r.remainingHours),
    donePercent: percent(r.doneHours, r.goalHours),
    forecastPercent: percent(r.forecastHours, r.goalHours),
    tiers: r.tiers.map(toGoalTierViewModel),
    months: r.months.map((m) => ({
      ...m,
      goalHours: round1(m.goalHours),
      doneHours: round1(m.doneHours),
      forecastHours: round1(m.forecastHours),
      donePercent: percent(m.doneHours, m.goalHours),
    })),
  }
}
