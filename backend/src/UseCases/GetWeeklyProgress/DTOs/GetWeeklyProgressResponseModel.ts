import type { Scenario, TierOutlook } from '../../Shared/taskAggregations'

/** Semana de domingo a sábado. Dois cenários: delivered (só concluídas) e forecast (+ em aberto, só na corrente). */
export type GetWeeklyProgressResponseModel = {
  start: string
  end: string
  period: 'past' | 'current' | 'future'
  /** início das semanas vizinhas, para navegar */
  previousWeek: string
  nextWeek: string
  goalHours: number
  /** meta de um dia útil (HOURS_PER_DAY) */
  dailyGoalHours: number
  workingDays: number
  /** dias úteis de hoje (inclusive) até sábado */
  remainingWorkdays: number
  doneHours: number
  openHours: number
  forecastHours: number
  /** média por dia útil já encerrado; null se nenhum encerrou */
  pacePerWorkday: number | null
  /** entregue até ontem + ritmo × dias úteis restantes */
  projectedHours: number | null
  delivered: Scenario<TierOutlook>
  forecast: Scenario<TierOutlook>
}
