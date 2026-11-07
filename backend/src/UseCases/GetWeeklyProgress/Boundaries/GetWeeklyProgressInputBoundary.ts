import type { GetWeeklyProgressRequestModel } from '../DTOs/GetWeeklyProgressRequestModel'
import type { GetWeeklyProgressOutputBoundary } from './GetWeeklyProgressOutputBoundary'

export interface GetWeeklyProgressInputBoundary {
  execute(request: GetWeeklyProgressRequestModel, presenter: GetWeeklyProgressOutputBoundary): Promise<void>
}
