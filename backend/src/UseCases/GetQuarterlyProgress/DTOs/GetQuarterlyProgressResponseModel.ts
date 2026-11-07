import type { Scenario, TierOutlook } from '../../Shared/taskAggregations'

export type GetQuarterlyProgressResponseModel = {
  quarter: string
  goalHours: number
  doneHours: number
  forecastHours: number
  period: 'past' | 'current' | 'future'
  /** dias úteis de hoje (inclusive) até o fim do trimestre */
  remainingWorkingDays: number
  /** Dois cenários para o front alternar: delivered (só concluídas) e forecast (+ em aberto, só no corrente). */
  delivered: Scenario<TierOutlook>
  forecast: Scenario<TierOutlook>
  months: {
    month: string
    goalHours: number
    /** esperado até hoje (100%): meta inteira se passado, 0 se futuro, proporcional aos dias úteis encerrados se corrente */
    expectedHours: number
    doneHours: number
    forecastHours: number
    goalEstimated: boolean
    isCurrent: boolean
  }[]
}
