import { GetMonthlyProgressController } from '../../InterfaceAdapters/Http/Controllers/Progress/GetMonthlyProgressController'
import { GetQuarterlyProgressController } from '../../InterfaceAdapters/Http/Controllers/Progress/GetQuarterlyProgressController'
import { GetWeeklyProgressController } from '../../InterfaceAdapters/Http/Controllers/Progress/GetWeeklyProgressController'
import { EnvWorkCalendarRepository } from '../../InterfaceAdapters/Repositories/EnvWorkCalendarRepository'
import { NotionTaskMapper } from '../../InterfaceAdapters/Repositories/NotionTaskMapper'
import { NotionTaskRepository } from '../../InterfaceAdapters/Repositories/NotionTaskRepository'
import type { ClockInterface } from '../../UseCases/Contracts/ClockInterface'
import { GetMonthlyProgressInteractor } from '../../UseCases/GetMonthlyProgress/GetMonthlyProgressInteractor'
import { GetQuarterlyProgressInteractor } from '../../UseCases/GetQuarterlyProgress/GetQuarterlyProgressInteractor'
import { GetWeeklyProgressInteractor } from '../../UseCases/GetWeeklyProgress/GetWeeklyProgressInteractor'
import type { ProgressSettings } from '../../UseCases/ProgressSettings'
import { SystemClock } from '../Clock/SystemClock'
import type { Config } from '../Config/loadConfig'
import { NotionHttpClient } from '../Notion/NotionHttpClient'

export type Container = {
  getMonthlyProgressController: GetMonthlyProgressController
  getWeeklyProgressController: GetWeeklyProgressController
  getQuarterlyProgressController: GetQuarterlyProgressController
}

/** Composition root: liga cada interface à sua implementação concreta. */
export function buildContainer(config: Config, deps: { fetchFn?: typeof fetch; clock?: ClockInterface } = {}): Container {
  const client = new NotionHttpClient(config.notionToken, config.notionApiUrl, deps.fetchFn ?? ((...a) => fetch(...a)))
  const tasks = new NotionTaskRepository(client, config.notionDatabaseId, new NotionTaskMapper(config.fields))
  const calendar = new EnvWorkCalendarRepository(config.workingDays, config.hoursPerDay, config.holidays, config.personalDaysOff)
  const clock = deps.clock ?? new SystemClock()
  const settings: ProgressSettings = {
    doneStatuses: config.doneStatuses,
    timeZone: config.timeZone,
    goalTiers: config.goalTiers,
    testTypes: config.testTypes,
  }

  return {
    getMonthlyProgressController: new GetMonthlyProgressController(
      new GetMonthlyProgressInteractor(tasks, calendar, clock, settings),
    ),
    getWeeklyProgressController: new GetWeeklyProgressController(
      new GetWeeklyProgressInteractor(tasks, calendar, clock, settings),
    ),
    getQuarterlyProgressController: new GetQuarterlyProgressController(
      new GetQuarterlyProgressInteractor(tasks, calendar, clock, settings),
    ),
  }
}
