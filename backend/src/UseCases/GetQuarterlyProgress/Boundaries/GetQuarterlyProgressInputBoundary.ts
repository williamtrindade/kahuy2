import type { GetQuarterlyProgressRequestModel } from '../DTOs/GetQuarterlyProgressRequestModel'
import type { GetQuarterlyProgressOutputBoundary } from './GetQuarterlyProgressOutputBoundary'

export interface GetQuarterlyProgressInputBoundary {
  execute(request: GetQuarterlyProgressRequestModel, presenter: GetQuarterlyProgressOutputBoundary): Promise<void>
}
