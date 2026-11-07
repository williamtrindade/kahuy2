import type { GetMonthlyProgressRequestModel } from '../DTOs/GetMonthlyProgressRequestModel'
import type { GetMonthlyProgressOutputBoundary } from './GetMonthlyProgressOutputBoundary'

export interface GetMonthlyProgressInputBoundary {
  execute(request: GetMonthlyProgressRequestModel, presenter: GetMonthlyProgressOutputBoundary): Promise<void>
}
