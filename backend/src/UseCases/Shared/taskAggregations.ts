import type { Task } from '../../Entities/Task'
import type { WorkMonth } from '../../Entities/WorkMonth'
import type { YearMonth } from '../../Entities/YearMonth'
import type { ProgressSettings } from '../ProgressSettings'

export type GoalTier = {
  percent: number
  goalHours: number
  expectedHours: number
  reached: boolean
  onTrack: boolean
  deltaHours: number
}

/** Faixa com o que falta e o ritmo necessário nos dias úteis restantes. */
export type TierOutlook = GoalTier & { remainingHours: number; requiredPerDay: number }

/** Faixa do dia: horas da faixa, se foi atingida e quanto falta. */
export type DayTier = { percent: number; hours: number; reached: boolean; remainingHours: number }

/** Um cenário do período: entregue (só concluídas) ou previsto (concluídas + em aberto). */
export type Scenario<T> = { hours: number; tiers: T[] }

export function buildDayTiers(goal: number, hours: number, tiers: readonly number[]): DayTier[] {
  return tiers.map((percent) => {
    const tierHours = (goal * percent) / 100
    return { percent, hours: tierHours, reached: goal > 0 && hours >= tierHours, remainingHours: goal > 0 ? Math.max(0, tierHours - hours) : 0 }
  })
}

export function buildOutlook(
  goal: number,
  expected100: number,
  hours: number,
  tiers: readonly number[],
  remainingWorkdays: number,
): TierOutlook[] {
  return buildTiers(goal, expected100, hours, tiers).map((t) => {
    const remainingHours = Math.max(0, t.goalHours - hours)
    return { ...t, remainingHours, requiredPerDay: remainingWorkdays > 0 ? remainingHours / remainingWorkdays : 0 }
  })
}

export function doneTasksIn(tasks: Task[], month: YearMonth, s: ProgressSettings): Task[] {
  return tasks.filter((t) => t.isDone(s.doneStatuses) && t.completionMonth(s.timeZone)?.equals(month))
}

export function openTasks(tasks: Task[], s: ProgressSettings): Task[] {
  return tasks.filter((t) => !t.isDone(s.doneStatuses))
}

export function sumHours(tasks: Task[]): number {
  return tasks.reduce((acc, t) => acc + t.hours, 0)
}

/** Posição do mês em relação ao mês de `today`: <0 passado, 0 corrente, >0 futuro. */
function relative(month: YearMonth, today: string): number {
  return month.toString().localeCompare(today.slice(0, 7))
}

export function remainingWorkingDays(wm: WorkMonth, today: string): number {
  const rel = relative(wm.month, today)
  if (rel < 0) return 0
  const workdays = rel > 0 ? wm.workdays : wm.workdays.filter((d) => d >= today)
  return Math.min(workdays.length, wm.workingDays)
}

/** Fração dos dias úteis (seg–sex sem feriados) do mês já encerrados antes de hoje. */
export function elapsedWorkdayRatio(wm: WorkMonth, today: string): number {
  const rel = relative(wm.month, today)
  if (rel < 0) return 1
  if (rel > 0) return 0
  if (wm.workdays.length === 0) return 0
  return wm.workdays.filter((d) => d < today).length / wm.workdays.length
}

export function buildTiers(goal: number, expected100: number, done: number, tiers: readonly number[]): GoalTier[] {
  return tiers.map((percent) => {
    const goalHours = (goal * percent) / 100
    const expectedHours = (expected100 * percent) / 100
    return {
      percent,
      goalHours,
      expectedHours,
      reached: goalHours > 0 && done >= goalHours,
      onTrack: done >= expectedHours,
      deltaHours: done - expectedHours,
    }
  })
}
