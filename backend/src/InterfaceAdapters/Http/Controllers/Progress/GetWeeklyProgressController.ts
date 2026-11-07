import type { GetWeeklyProgressInputBoundary } from '../../../../UseCases/GetWeeklyProgress/Boundaries/GetWeeklyProgressInputBoundary'
import { GetWeeklyProgressApiPresenter } from '../../../Presenters/Api/GetWeeklyProgressApiPresenter'
import type { WeeklyProgressViewModel } from '../../../ViewModels/WeeklyProgressViewModel'

export class GetWeeklyProgressController {
  constructor(private readonly interactor: GetWeeklyProgressInputBoundary) {}

  async handle(input: { week?: string }): Promise<WeeklyProgressViewModel> {
    const presenter = new GetWeeklyProgressApiPresenter()
    await this.interactor.execute({ week: input.week }, presenter)
    return presenter.getViewModel()
  }
}
