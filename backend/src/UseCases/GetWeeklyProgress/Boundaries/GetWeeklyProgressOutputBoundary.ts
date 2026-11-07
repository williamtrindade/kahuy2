import type { GetWeeklyProgressResponseModel } from '../DTOs/GetWeeklyProgressResponseModel'

export interface GetWeeklyProgressOutputBoundary {
  present(response: GetWeeklyProgressResponseModel): void
}
