import type { Scenario, TierOutlook } from '../../UseCases/Shared/taskAggregations'
import { type GoalTierViewModel, toGoalTierViewModel } from './GoalTierViewModel'
import { percent, round1 } from './round'

export type TierOutlookViewModel = GoalTierViewModel & Pick<TierOutlook, 'remainingHours' | 'requiredPerDay'>

/** Cenário entregue (só concluídas) ou previsto (+ em aberto), com o % da meta do período. */
export type ScenarioViewModel<T = TierOutlookViewModel> = { hours: number; percent: number; tiers: T[] }

export function toOutlookScenario(sc: Scenario<TierOutlook>, goal: number): ScenarioViewModel {
  return {
    hours: round1(sc.hours),
    percent: percent(sc.hours, goal),
    tiers: sc.tiers.map((t) => ({ ...toGoalTierViewModel(t), remainingHours: round1(t.remainingHours), requiredPerDay: round1(t.requiredPerDay) })),
  }
}
