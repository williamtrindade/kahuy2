import type { DayTier, Scenario, TierOutlook } from '../../Shared/taskAggregations'

export type GetMonthlyProgressResponseModel = {
  month: string
  isCurrent: boolean
  period: 'past' | 'current' | 'future'
  goalHours: number
  goalEstimated: boolean
  workingDays: number
  doneHours: number
  openHours: number
  forecastHours: number
  remainingWorkingDays: number
  /** meta de um dia útil (HOURS_PER_DAY) */
  dailyGoalHours: number
  /** ritmo: entregue no mês antes de hoje ÷ dias úteis do mês já encerrados; null se nenhum encerrou */
  pacePerWorkday: number | null
  /** projeção do mês: entregue até ontem + ritmo × dias úteis restantes (mínimo = entregue) */
  projectedHours: number | null
  /** Dois cenários para o front alternar: delivered (só concluídas) e forecast (+ tasks em aberto). */
  delivered: Scenario<TierOutlook>
  forecast: Scenario<TierOutlook>
  /** Só no mês corrente; mesmos dois cenários (no previsto, as abertas contam hoje). */
  today: {
    date: string
    isWorkingDay: boolean
    isHoliday: boolean
    holidayName: string | null
    doneHours: number
    openHours: number
    goalHours: number
    delivered: Scenario<DayTier>
    forecast: Scenario<DayTier>
  } | null
  /**
   * Cada dia do mês: workday (seg–sex sem folga), weekend, holiday (feriado nacional) ou
   * vacation (férias/folga pessoal), com o nome da folga e as horas concluídas no dia.
   */
  calendar: { date: string; kind: 'workday' | 'weekend' | 'holiday' | 'vacation'; name: string | null; doneHours: number }[]
  /** realizado acumulado e, por faixa de GOAL_TIERS (meta, supermeta…), a linha ideal até o dia */
  dailyCumulative: { date: string; doneHours: number; ideal: { percent: number; hours: number }[] }[]
  /**
   * Tasks do mês: abertas (só no mês corrente) e depois as concluídas no mês, da mais recente.
   * kind: 'test' se o tipo está em TEST_TYPES, senão 'development'. date: dia da conclusão (null se aberta).
   * week: `start` da semana em weeks (abertas: semana corrente).
   */
  tasks: { title: string; status: string; hours: number; url: string; done: boolean; kind: 'development' | 'test'; date: string | null; week: string }[]
  /**
   * Semanas (domingo a sábado) que tocam o mês: start/end completos (card Semana) e
   * inMonthStart/inMonthEnd, o trecho dentro do mês (tasks do mês por semana).
   */
  weeks: { start: string; end: string; inMonthStart: string; inMonthEnd: string; isCurrent: boolean }[]
  doneTaskCount: number
  averageHoursPerTask: number
  hoursByType: { type: string; hours: number }[]
  /** tasks de teste: [nome] = dev */
  hoursByDeveloper: { developer: string; hours: number }[]
  /** demais tasks: [nome] = solicitante */
  hoursByRequester: { requester: string; hours: number }[]
  undatedTasks: { title: string; url: string }[]
  /** tasks fora da conta por violar uma regra (ex.: horas negativas) */
  invalidTasks: { title: string; url: string; reason: string }[]
}
