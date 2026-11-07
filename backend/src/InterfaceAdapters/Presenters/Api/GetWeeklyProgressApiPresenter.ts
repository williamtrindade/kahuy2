import type { GetWeeklyProgressOutputBoundary } from '../../../UseCases/GetWeeklyProgress/Boundaries/GetWeeklyProgressOutputBoundary'
import type { GetWeeklyProgressResponseModel } from '../../../UseCases/GetWeeklyProgress/DTOs/GetWeeklyProgressResponseModel'
import { toWeeklyProgressViewModel, type WeeklyProgressViewModel } from '../../ViewModels/WeeklyProgressViewModel'

export class GetWeeklyProgressApiPresenter implements GetWeeklyProgressOutputBoundary {
  private viewModel: WeeklyProgressViewModel | undefined

  present(response: GetWeeklyProgressResponseModel): void {
    this.viewModel = toWeeklyProgressViewModel(response)
  }

  getViewModel(): WeeklyProgressViewModel {
    if (!this.viewModel) throw new Error('Presenter lido antes de present()')
    return this.viewModel
  }
}
