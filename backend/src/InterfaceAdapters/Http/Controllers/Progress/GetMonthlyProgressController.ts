import type { GetMonthlyProgressInputBoundary } from '../../../../UseCases/GetMonthlyProgress/Boundaries/GetMonthlyProgressInputBoundary'
import { GetMonthlyProgressApiPresenter } from '../../../Presenters/Api/GetMonthlyProgressApiPresenter'
import type { MonthlyProgressViewModel } from '../../../ViewModels/MonthlyProgressViewModel'

export class GetMonthlyProgressController {
  constructor(private readonly interactor: GetMonthlyProgressInputBoundary) {}

  async handle(input: { month?: string }): Promise<MonthlyProgressViewModel> {
    const presenter = new GetMonthlyProgressApiPresenter()
    await this.interactor.execute({ month: input.month }, presenter)
    return presenter.getViewModel()
  }
}
