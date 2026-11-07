import type { GoalTier } from '../../Shared/taskAggregations'

export type GetQuarterlyProgressResponseModel = {
  quarter: string
  goalHours: number
  doneHours: number
  forecastHours: number
  remainingHours: number
  tiers: GoalTier[]
  months: {
    month: string
    goalHours: number
    doneHours: number
    forecastHours: number
    goalEstimated: boolean
    isCurrent: boolean
  }[]
}
