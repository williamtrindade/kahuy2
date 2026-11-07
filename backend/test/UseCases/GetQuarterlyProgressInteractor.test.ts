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
    expect(r.period).toBe('current')
    expect(r.remainingWorkingDays).toBe(18 + 20) // nov: 05..30 · dez: 20 configurados
    expect(r.months.map((m) => m.month)).toEqual(['2026-10', '2026-11', '2026-12'])
    expect(r.months.map((m) => m.forecastHours)).toEqual([5, 11, 0])
    expect(r.months[1]!.isCurrent).toBe(true)
  })

  it('reports quarter tiers with the expected hours so far', async () => {
    const r = await run({})
    expect(r.delivered.tiers[0]!.expectedHours).toBeCloseTo(176 + (152 * 3) / 21)
    expect(r.delivered.tiers[1]!.goalHours).toBe(610)
  })

  it('splits the quarter into delivered and forecast scenarios, with what is missing per day', async () => {
    const r = await run({})
    expect(r.delivered.hours).toBe(10)
    expect(r.delivered.tiers[0]).toMatchObject({ remainingHours: 478 })
    expect(r.delivered.tiers[0]!.requiredPerDay).toBeCloseTo(478 / 38)
    expect(r.forecast.hours).toBe(16)
    expect(r.forecast.tiers[0]).toMatchObject({ remainingHours: 472 })
    expect(r.forecast.tiers[0]!.requiredPerDay).toBeCloseTo(472 / 38)
  })

  it('tells each month\'s expected hours so far (100%): full goal if past, 0 if future', async () => {
    const r = await run({}) // qui 05/11: seg, ter, qua de novembro encerrados
    expect(r.months[0]!.expectedHours).toBe(176)
    expect(r.months[1]!.expectedHours).toBeCloseTo((152 * 3) / 21)
    expect(r.months[2]!.expectedHours).toBe(0)
  })

  it('past quarter forecast equals done', async () => {
    const past = await run({ quarter: '2026-Q3' })
    expect(past.forecastHours).toBe(past.doneHours)
    expect(past.forecast).toEqual(past.delivered)
    expect(past.period).toBe('past')
    expect((await run({ quarter: '2027-Q1' })).period).toBe('future')
  })

  it('rejects an invalid quarter', async () => {
    await expect(run({ quarter: '2026-Q9' })).rejects.toThrow(DomainError)
  })
})
