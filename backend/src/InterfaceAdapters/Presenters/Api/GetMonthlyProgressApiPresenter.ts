import type { GetMonthlyProgressOutputBoundary } from '../../../UseCases/GetMonthlyProgress/Boundaries/GetMonthlyProgressOutputBoundary'
import type { GetMonthlyProgressResponseModel } from '../../../UseCases/GetMonthlyProgress/DTOs/GetMonthlyProgressResponseModel'
import { type MonthlyProgressViewModel, toMonthlyProgressViewModel } from '../../ViewModels/MonthlyProgressViewModel'

export class GetMonthlyProgressApiPresenter implements GetMonthlyProgressOutputBoundary {
  private viewModel: MonthlyProgressViewModel | undefined

  present(response: GetMonthlyProgressResponseModel): void {
    this.viewModel = toMonthlyProgressViewModel(response)
  }

  getViewModel(): MonthlyProgressViewModel {
    if (!this.viewModel) throw new Error('Presenter lido antes de present()')
    return this.viewModel
  }
}
