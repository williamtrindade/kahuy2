import type { WorkMonth } from '../../Entities/WorkMonth'
import type { YearMonth } from '../../Entities/YearMonth'

/** holiday = feriado nacional (holidays.json); vacation = férias/folga pessoal (HOLIDAYS / holidays.local.json). */
export type DayOff = { kind: 'holiday' | 'vacation'; name: string }

export interface WorkCalendarRepositoryInterface {
  workMonth(month: YearMonth): WorkMonth
  /** Seg–sex que não está em HOLIDAYS. */
  isWorkday(date: string): boolean
  /** Folga na data: feriado nacional ou férias/folga pessoal (nome vazio se sem nome); null se não for folga. */
  dayOff(date: string): DayOff | null
}
