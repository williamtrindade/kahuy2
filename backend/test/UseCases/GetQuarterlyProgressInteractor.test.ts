import { describe, expect, it } from 'vitest'
import { DomainError } from '../../src/Entities/DomainError'
import { GetQuarterlyProgressInteractor } from '../../src/UseCases/GetQuarterlyProgress/GetQuarterlyProgressInteractor'
import type { GetQuarterlyProgressRequestModel } from '../../src/UseCases/GetQuarterlyProgress/DTOs/GetQuarterlyProgressRequestModel'
import type { GetQuarterlyProgressResponseModel } from '../../src/UseCases/GetQuarterlyProgress/DTOs/GetQuarterlyProgressResponseModel'
import { CapturingPresenter, FixedCalendar, FixedClock, InMemoryTaskRepository, novemberTasks } from '../support/fakes'

const settings = { doneStatuses: ['Concluido'], timeZone: 'America/Sao_Paulo', goalTiers: [100, 125], testTypes: ['TESTE'] }

async function run(request: GetQuarterlyProgressRequestModel): Promise<GetQuarterlyProgressResponseModel> {
  const interactor = new GetQuarterlyProgressInteractor(
    new InMemoryTaskRepository(novemberTasks()),
    new FixedCalendar({ '2026-10': 22, '2026-11': 19, '2026-12': 20 }),
    new FixedClock('2026-11-05T15:00:00Z'),
    settings,
  )
  const presenter = new CapturingPresenter<GetQuarterlyProgressResponseModel>()
  await interactor.execute(request, presenter)
  return presenter.response!
}

describe('GetQuarterlyProgressInteractor', () => {
  it('sums the three months of the current quarter', async () => {
    const r = await run({})
    expect(r.quarter).toBe('2026-Q4')
    expect(r.goalHours).toBe((22 + 19 + 20) * 8)
    expect(r.doneHours).toBe(10)
    expect(r.forecastHours).toBe(16)
    expect(r.remainingHours).toBe(488 - 10)
    expect(r.months.map((m) => m.month)).toEqual(['2026-10', '2026-11', '2026-12'])
    expect(r.months.map((m) => m.forecastHours)).toEqual([5, 11, 0])
    expect(r.months[1]!.isCurrent).toBe(true)
  })

  it('reports quarter tiers with the expected hours so far', async () => {
    const r = await run({})
    expect(r.tiers[0]!.expectedHours).toBeCloseTo(176 + (152 * 3) / 21)
    expect(r.tiers[1]!.goalHours).toBe(610)
  })

  it('past quarter forecast equals done', async () => {
    const past = await run({ quarter: '2026-Q3' })
    expect(past.forecastHours).toBe(past.doneHours)
  })

  it('rejects an invalid quarter', async () => {
    await expect(run({ quarter: '2026-Q9' })).rejects.toThrow(DomainError)
  })
})
