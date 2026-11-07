import type { GetQuarterlyProgressOutputBoundary } from '../../../UseCases/GetQuarterlyProgress/Boundaries/GetQuarterlyProgressOutputBoundary'
import type { GetQuarterlyProgressResponseModel } from '../../../UseCases/GetQuarterlyProgress/DTOs/GetQuarterlyProgressResponseModel'
import { type QuarterlyProgressViewModel, toQuarterlyProgressViewModel } from '../../ViewModels/QuarterlyProgressViewModel'

export class GetQuarterlyProgressApiPresenter implements GetQuarterlyProgressOutputBoundary {
  private viewModel: QuarterlyProgressViewModel | undefined

  present(response: GetQuarterlyProgressResponseModel): void {
    this.viewModel = toQuarterlyProgressViewModel(response)
  }

  getViewModel(): QuarterlyProgressViewModel {
    if (!this.viewModel) throw new Error('Presenter lido antes de present()')
    return this.viewModel
  }
}
