import type { GoalTier } from '../../UseCases/Shared/taskAggregations'
import { round1 } from './round'

export type GoalTierViewModel = GoalTier

export function toGoalTierViewModel(t: GoalTier): GoalTierViewModel {
  return { ...t, goalHours: round1(t.goalHours), expectedHours: round1(t.expectedHours), deltaHours: round1(t.deltaHours) }
}
