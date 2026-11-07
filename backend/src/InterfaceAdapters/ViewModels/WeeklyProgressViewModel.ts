import type { GetWeeklyProgressResponseModel as R } from '../../UseCases/GetWeeklyProgress/DTOs/GetWeeklyProgressResponseModel'
import { round1 } from './round'
import { type ScenarioViewModel, toOutlookScenario } from './ScenarioViewModel'

export type WeeklyProgressViewModel = Omit<R, 'delivered' | 'forecast'> & {
  delivered: ScenarioViewModel
  forecast: ScenarioViewModel
}

export function toWeeklyProgressViewModel(r: R): WeeklyProgressViewModel {
  return {
    ...r,
    goalHours: round1(r.goalHours),
    doneHours: round1(r.doneHours),
    openHours: round1(r.openHours),
    forecastHours: round1(r.forecastHours),
    delivered: toOutlookScenario(r.delivered, r.goalHours),
    forecast: toOutlookScenario(r.forecast, r.goalHours),
  }
}
