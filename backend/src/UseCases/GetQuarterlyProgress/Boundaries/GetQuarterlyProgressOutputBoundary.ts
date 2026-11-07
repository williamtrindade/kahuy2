import type { GetQuarterlyProgressResponseModel } from '../DTOs/GetQuarterlyProgressResponseModel'

export interface GetQuarterlyProgressOutputBoundary {
  present(response: GetQuarterlyProgressResponseModel): void
}
