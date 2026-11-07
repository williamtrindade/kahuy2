import { describe, expect, it } from 'vitest'
import { DomainError } from '../../src/Entities/DomainError'
import type { Task } from '../../src/Entities/Task'
import type { GetWeeklyProgressRequestModel } from '../../src/UseCases/GetWeeklyProgress/DTOs/GetWeeklyProgressRequestModel'
import type { GetWeeklyProgressResponseModel } from '../../src/UseCases/GetWeeklyProgress/DTOs/GetWeeklyProgressResponseModel'
import { GetWeeklyProgressInteractor } from '../../src/UseCases/GetWeeklyProgress/GetWeeklyProgressInteractor'
import { CapturingPresenter, FixedCalendar, FixedClock, InMemoryTaskRepository, makeTask, novemberTasks } from '../support/fakes'

const settings = { doneStatuses: ['Concluido'], timeZone: 'America/Sao_Paulo', goalTiers: [100, 125], testTypes: ['TESTE'] }

async function run(
  request: GetWeeklyProgressRequestModel,
  opts: { tasks?: Task[]; now?: string; holidays?: Record<string, string> } = {},
): Promise<GetWeeklyProgressResponseModel> {
  const interactor = new GetWeeklyProgressInteractor(
    new InMemoryTaskRepository(opts.tasks ?? novemberTasks()),
    new FixedCalendar({}, 8, opts.holidays),
    new FixedClock(opts.now ?? '2026-11-05T15:00:00Z'), // quinta
    settings,
  )
  const presenter = new CapturingPresenter<GetWeeklyProgressResponseModel>()
  await interactor.execute(request, presenter)
  return presenter.response!
}

describe('GetWeeklyProgressInteractor', () => {
  it('defaults to the current week (Sunday to Saturday) against 40h tiers', async () => {
    const w = await run({})
    expect(w).toMatchObject({
      start: '2026-11-01',
      end: '2026-11-07',
      period: 'current',
      previousWeek: '2026-10-25',
      nextWeek: '2026-11-08',
      goalHours: 40,
      workingDays: 5,
      doneHours: 5,
    })
    // esperado: seg, ter, qua já encerrados = 3 × 8h
    expect(w.delivered.tiers[0]).toMatchObject({ percent: 100, goalHours: 40, expectedHours: 24, onTrack: false, deltaHours: -19 })
    expect(w.delivered.tiers[1]).toMatchObject({ percent: 125, goalHours: 50, expectedHours: 30 })
  })

  it('has delivered and forecast scenarios with what is missing per tier', async () => {
    const w = await run({}) // entregue 5h; aberta D = 6h; restam qui e sex
    expect(w).toMatchObject({ doneHours: 5, openHours: 6, forecastHours: 11, remainingWorkdays: 2 })
    expect(w.delivered.tiers[0]).toMatchObject({ remainingHours: 35, requiredPerDay: 17.5 })
    expect(w.delivered.tiers[1]).toMatchObject({ remainingHours: 45, requiredPerDay: 22.5 })
    expect(w.forecast.hours).toBe(11)
    expect(w.forecast.tiers[0]).toMatchObject({ remainingHours: 29, requiredPerDay: 14.5, expectedHours: 24, onTrack: false })
  })

  it('shows any week chosen by a date in it: a past week is closed', async () => {
    const tasks = [
      makeTask({ title: 'qui', hours: 10, endDate: new Date('2026-10-29T15:00:00Z') }),
      makeTask({ title: 'sex', hours: 20, endDate: new Date('2026-10-30T15:00:00Z') }),
      makeTask({ title: 'aberta', hours: 6, status: 'Aguardando' }),
    ]
    const w = await run({ week: '2026-10-28' }, { tasks })
    expect(w).toMatchObject({ start: '2026-10-25', end: '2026-10-31', period: 'past', doneHours: 30, openHours: 0, remainingWorkdays: 0 })
    expect(w.forecast).toEqual(w.delivered) // abertas só contam na semana corrente
    expect(w.delivered.tiers[0]).toMatchObject({ expectedHours: 40, remainingHours: 10, requiredPerDay: 0 })
  })

  it('a future week has nothing expected yet', async () => {
    const w = await run({ week: '2026-11-10' })
    expect(w).toMatchObject({ start: '2026-11-08', period: 'future', doneHours: 0, openHours: 0, remainingWorkdays: 5 })
    expect(w.delivered.tiers[0]).toMatchObject({ expectedHours: 0, onTrack: true, requiredPerDay: 8 })
  })

  it('counts both months when the week crosses the boundary', async () => {
    const tasks = [
      makeTask({ title: 'nov', hours: 4, endDate: new Date('2026-11-30T15:00:00Z') }),
      makeTask({ title: 'dez', hours: 2, endDate: new Date('2026-12-01T15:00:00Z') }),
      makeTask({ title: 'fora', hours: 9, endDate: new Date('2026-11-28T15:00:00Z') }), // sábado anterior
    ]
    const w = await run({}, { tasks, now: '2026-12-02T15:00:00Z' }) // quarta
    expect(w).toMatchObject({ start: '2026-11-29', end: '2026-12-05', doneHours: 6 })
    expect(w.delivered.tiers[0]!.expectedHours).toBe(16) // seg e ter encerrados
  })

  it('on Saturday all five weekdays are expected', async () => {
    expect((await run({}, { now: '2026-11-07T15:00:00Z' })).delivered.tiers[0]!.expectedHours).toBe(40)
  })

  it('remaining hours never go below zero', async () => {
    const tasks = [makeTask({ title: 'muito', hours: 60, endDate: new Date('2026-11-03T15:00:00Z') })]
    const w = await run({}, { tasks })
    expect(w.delivered.tiers.map((t) => t.remainingHours)).toEqual([0, 0])
    expect(w.delivered.tiers.map((t) => t.requiredPerDay)).toEqual([0, 0])
  })

  it('discounts holidays from the goal and the expected hours', async () => {
    const w = await run({}, { holidays: { '2026-11-02': 'Finados' } })
    expect(w).toMatchObject({ goalHours: 32, workingDays: 4 })
    expect(w.delivered.tiers[0]).toMatchObject({ goalHours: 32, expectedHours: 16 })
    expect(w.delivered.tiers[1]).toMatchObject({ goalHours: 40, expectedHours: 20 })
  })

  it('rejects an invalid week', async () => {
    await expect(run({ week: '2026-13-01' })).rejects.toThrow(DomainError)
  })
})
