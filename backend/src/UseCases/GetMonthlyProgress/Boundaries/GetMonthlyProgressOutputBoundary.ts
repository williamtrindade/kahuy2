import type { GetMonthlyProgressResponseModel } from '../DTOs/GetMonthlyProgressResponseModel'

export interface GetMonthlyProgressOutputBoundary {
  present(response: GetMonthlyProgressResponseModel): void
}
