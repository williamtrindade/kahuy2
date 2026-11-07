import type { GetQuarterlyProgressResponseModel as R } from '../../UseCases/GetQuarterlyProgress/DTOs/GetQuarterlyProgressResponseModel'
import { percent, round1 } from './round'
import { type ScenarioViewModel, toOutlookScenario } from './ScenarioViewModel'

export type QuarterlyProgressViewModel = Omit<R, 'delivered' | 'forecast' | 'months'> & {
  delivered: ScenarioViewModel
  forecast: ScenarioViewModel
  months: (R['months'][number] & { donePercent: number })[]
}

export function toQuarterlyProgressViewModel(r: R): QuarterlyProgressViewModel {
  return {
    ...r,
    goalHours: round1(r.goalHours),
    doneHours: round1(r.doneHours),
    forecastHours: round1(r.forecastHours),
    delivered: toOutlookScenario(r.delivered, r.goalHours),
    forecast: toOutlookScenario(r.forecast, r.goalHours),
    months: r.months.map((m) => ({
      ...m,
      goalHours: round1(m.goalHours),
      expectedHours: round1(m.expectedHours),
      doneHours: round1(m.doneHours),
      forecastHours: round1(m.forecastHours),
      donePercent: percent(m.doneHours, m.goalHours),
    })),
  }
}
