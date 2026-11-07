import type { GetQuarterlyProgressInputBoundary } from '../../../../UseCases/GetQuarterlyProgress/Boundaries/GetQuarterlyProgressInputBoundary'
import { GetQuarterlyProgressApiPresenter } from '../../../Presenters/Api/GetQuarterlyProgressApiPresenter'
import type { QuarterlyProgressViewModel } from '../../../ViewModels/QuarterlyProgressViewModel'

export class GetQuarterlyProgressController {
  constructor(private readonly interactor: GetQuarterlyProgressInputBoundary) {}

  async handle(input: { quarter?: string }): Promise<QuarterlyProgressViewModel> {
    const presenter = new GetQuarterlyProgressApiPresenter()
    await this.interactor.execute({ quarter: input.quarter }, presenter)
    return presenter.getViewModel()
  }
}
