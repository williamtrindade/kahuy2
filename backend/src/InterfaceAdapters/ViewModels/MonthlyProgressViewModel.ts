import type { GetMonthlyProgressResponseModel as R } from '../../UseCases/GetMonthlyProgress/DTOs/GetMonthlyProgressResponseModel'
import type { DayTier, Scenario } from '../../UseCases/Shared/taskAggregations'
import { percent, round1 } from './round'
import { type ScenarioViewModel, toOutlookScenario } from './ScenarioViewModel'

export type { ScenarioViewModel, TierOutlookViewModel } from './ScenarioViewModel'

type Today = NonNullable<R['today']>

export type DayTierViewModel = DayTier

export type MonthlyProgressViewModel = Omit<R, 'delivered' | 'forecast' | 'today'> & {
  delivered: ScenarioViewModel
  forecast: ScenarioViewModel
  today: (Omit<Today, 'delivered' | 'forecast'> & { delivered: ScenarioViewModel<DayTierViewModel>; forecast: ScenarioViewModel<DayTierViewModel> }) | null
}

const toDayScenario = (sc: Scenario<DayTier>, goal: number): ScenarioViewModel<DayTierViewModel> => ({
  hours: round1(sc.hours),
  percent: percent(sc.hours, goal),
  tiers: sc.tiers.map((t) => ({ ...t, hours: round1(t.hours), remainingHours: round1(t.remainingHours) })),
})

export function toMonthlyProgressViewModel(r: R): MonthlyProgressViewModel {
  return {
    ...r,
    goalHours: round1(r.goalHours),
    doneHours: round1(r.doneHours),
    openHours: round1(r.openHours),
    forecastHours: round1(r.forecastHours),
    averageHoursPerTask: round1(r.averageHoursPerTask),
    delivered: toOutlookScenario(r.delivered, r.goalHours),
    forecast: toOutlookScenario(r.forecast, r.goalHours),
    today: r.today && {
      ...r.today,
      doneHours: round1(r.today.doneHours),
      openHours: round1(r.today.openHours),
      goalHours: round1(r.today.goalHours),
      delivered: toDayScenario(r.today.delivered, r.today.goalHours),
      forecast: toDayScenario(r.today.forecast, r.today.goalHours),
    },
    calendar: r.calendar.map((d) => ({ ...d, doneHours: round1(d.doneHours) })),
    dailyCumulative: r.dailyCumulative.map((p) => ({
      date: p.date,
      doneHours: round1(p.doneHours),
      ideal: p.ideal.map((i) => ({ percent: i.percent, hours: round1(i.hours) })),
    })),
    tasks: r.tasks.map((t) => ({ ...t, hours: round1(t.hours) })),
    hoursByType: r.hoursByType.map((t) => ({ ...t, hours: round1(t.hours) })),
    hoursByDeveloper: r.hoursByDeveloper.map((t) => ({ ...t, hours: round1(t.hours) })),
    hoursByRequester: r.hoursByRequester.map((t) => ({ ...t, hours: round1(t.hours) })),
  }
}
