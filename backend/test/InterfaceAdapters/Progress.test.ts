import { describe, expect, it } from 'vitest'
import { GetMonthlyProgressController } from '../../src/InterfaceAdapters/Http/Controllers/Progress/GetMonthlyProgressController'
import { GetQuarterlyProgressController } from '../../src/InterfaceAdapters/Http/Controllers/Progress/GetQuarterlyProgressController'
import { GetMonthlyProgressApiPresenter } from '../../src/InterfaceAdapters/Presenters/Api/GetMonthlyProgressApiPresenter'
import { GetQuarterlyProgressApiPresenter } from '../../src/InterfaceAdapters/Presenters/Api/GetQuarterlyProgressApiPresenter'
import { percent, round1 } from '../../src/InterfaceAdapters/ViewModels/round'
import type { GetMonthlyProgressInputBoundary } from '../../src/UseCases/GetMonthlyProgress/Boundaries/GetMonthlyProgressInputBoundary'
import type { GetMonthlyProgressResponseModel } from '../../src/UseCases/GetMonthlyProgress/DTOs/GetMonthlyProgressResponseModel'
import type { GetQuarterlyProgressInputBoundary } from '../../src/UseCases/GetQuarterlyProgress/Boundaries/GetQuarterlyProgressInputBoundary'
import { GetWeeklyProgressApiPresenter } from '../../src/InterfaceAdapters/Presenters/Api/GetWeeklyProgressApiPresenter'
import type { GetWeeklyProgressResponseModel } from '../../src/UseCases/GetWeeklyProgress/DTOs/GetWeeklyProgressResponseModel'
import type { GetQuarterlyProgressResponseModel } from '../../src/UseCases/GetQuarterlyProgress/DTOs/GetQuarterlyProgressResponseModel'

const monthly: GetMonthlyProgressResponseModel = {
  month: '2026-11',
  isCurrent: true,
  period: 'current',
  goalHours: 152,
  goalEstimated: false,
  workingDays: 19,
  doneHours: 98,
  openHours: 14,
  forecastHours: 112,
  remainingWorkingDays: 12,
  delivered: {
    hours: 98,
    tiers: [{ percent: 100, goalHours: 152, expectedHours: 94.6666, reached: false, onTrack: true, deltaHours: 3.3333, remainingHours: 54, requiredPerDay: 4.4444 }],
  },
  forecast: {
    hours: 112,
    tiers: [{ percent: 100, goalHours: 152, expectedHours: 94.6666, reached: false, onTrack: true, deltaHours: 17.3333, remainingHours: 40, requiredPerDay: 3.3333 }],
  },
  today: {
    date: '2026-11-05',
    isWorkingDay: true,
    isHoliday: false,
    holidayName: null,
    doneHours: 6,
    openHours: 14,
    goalHours: 8,
    delivered: { hours: 6, tiers: [{ percent: 100, hours: 8, reached: false, remainingHours: 2 }] },
    forecast: { hours: 20, tiers: [{ percent: 100, hours: 8, reached: true, remainingHours: 0 }] },
  },
  calendar: [{ date: '2026-11-03', kind: 'workday', name: null, doneHours: 2.25 }],
  dailyCumulative: [{ date: '2026-11-01', doneHours: 0, ideal: [{ percent: 100, hours: 7.2381 }, { percent: 125, hours: 9.0476 }] }],
  tasks: [{ title: 'X', status: 'Concluido', hours: 2.25, url: 'u', done: true, kind: 'test', date: '2026-11-02', week: '2026-11-01' }],
  weeks: [{ start: '2026-11-01', end: '2026-11-07', inMonthStart: '2026-11-01', inMonthEnd: '2026-11-07', isCurrent: true }],
  doneTaskCount: 3,
  averageHoursPerTask: 32.6666,
  hoursByType: [],
  hoursByDeveloper: [],
  hoursByRequester: [],
  undatedTasks: [],
  invalidTasks: [],
}

const quarterly: GetQuarterlyProgressResponseModel = {
  quarter: '2026-Q4',
  goalHours: 488,
  doneHours: 122.25,
  forecastHours: 136.25,
  remainingHours: 365.75,
  tiers: [{ percent: 100, goalHours: 488, expectedHours: 197.71, reached: false, onTrack: false, deltaHours: -75.46 }],
  months: [{ month: '2026-10', goalHours: 176, doneHours: 88, forecastHours: 88, goalEstimated: false, isCurrent: false }],
}

describe('view model helpers', () => {
  it('rounds to one decimal and computes safe percentages', () => {
    expect(round1(8.1666)).toBe(8.2)
    expect(percent(98, 152)).toBe(64)
    expect(percent(5, 0)).toBe(0)
  })
})

describe('GetMonthlyProgressApiPresenter', () => {
  it('builds the monthly view model', () => {
    const p = new GetMonthlyProgressApiPresenter()
    p.present(monthly)
    const vm = p.getViewModel()
    expect(vm.delivered).toMatchObject({ hours: 98, percent: 64 })
    expect(vm.delivered.tiers[0]).toMatchObject({ expectedHours: 94.7, deltaHours: 3.3, onTrack: true, requiredPerDay: 4.4 })
    expect(vm.forecast).toMatchObject({ hours: 112, percent: 74 })
    expect(vm.averageHoursPerTask).toBe(32.7)
    expect(vm.tasks[0]).toMatchObject({ hours: 2.3, kind: 'test', done: true })
    expect(vm.calendar[0]).toEqual({ date: '2026-11-03', kind: 'workday', name: null, doneHours: 2.3 })
    expect(vm.today!.delivered).toMatchObject({ hours: 6, percent: 75 })
    expect(vm.today!.forecast).toMatchObject({ hours: 20, percent: 250 })
    expect(vm.dailyCumulative[0]!.ideal).toEqual([{ percent: 100, hours: 7.2 }, { percent: 125, hours: 9 }])
  })

  it('throws when read before present()', () => {
    expect(() => new GetMonthlyProgressApiPresenter().getViewModel()).toThrow()
  })
})

const weekly: GetWeeklyProgressResponseModel = {
  start: '2026-11-01',
  end: '2026-11-07',
  period: 'current',
  previousWeek: '2026-10-25',
  nextWeek: '2026-11-08',
  goalHours: 40,
  dailyGoalHours: 8,
  workingDays: 5,
  remainingWorkdays: 2,
  doneHours: 13.25,
  openHours: 6,
  forecastHours: 19.25,
  pacePerWorkday: 4.4166,
  projectedHours: 21.83,
  delivered: {
    hours: 13.25,
    tiers: [{ percent: 100, goalHours: 40, expectedHours: 24, reached: false, onTrack: false, deltaHours: -10.76, remainingHours: 26.76, requiredPerDay: 13.38 }],
  },
  forecast: {
    hours: 19.25,
    tiers: [{ percent: 100, goalHours: 40, expectedHours: 24, reached: false, onTrack: false, deltaHours: -4.76, remainingHours: 20.76, requiredPerDay: 10.38 }],
  },
}

describe('GetWeeklyProgressApiPresenter', () => {
  it('builds the weekly view model', () => {
    const p = new GetWeeklyProgressApiPresenter()
    p.present(weekly)
    const vm = p.getViewModel()
    expect(vm).toMatchObject({ doneHours: 13.3, pacePerWorkday: 4.4, projectedHours: 21.8, previousWeek: '2026-10-25' })
    expect(vm.delivered).toMatchObject({ hours: 13.3, percent: 33 })
    expect(vm.delivered.tiers[0]).toMatchObject({ deltaHours: -10.8, remainingHours: 26.8, requiredPerDay: 13.4 })
    expect(vm.forecast).toMatchObject({ hours: 19.3, percent: 48 })
  })
})

describe('GetQuarterlyProgressApiPresenter', () => {
  it('builds the quarterly view model', () => {
    const p = new GetQuarterlyProgressApiPresenter()
    p.present(quarterly)
    const vm = p.getViewModel()
    expect(vm.donePercent).toBe(25)
    expect(vm.forecastPercent).toBe(28)
    expect(vm.doneHours).toBe(122.3)
    expect(vm.months[0]).toMatchObject({ donePercent: 50 })
    expect(vm.tiers[0]).toMatchObject({ deltaHours: -75.5 })
  })
})

describe('controllers', () => {
  it('monthly controller passes the request and returns the view model', async () => {
    const seen: unknown[] = []
    const interactor: GetMonthlyProgressInputBoundary = {
      async execute(request, presenter) {
        seen.push(request)
        presenter.present(monthly)
      },
    }
    await expect(new GetMonthlyProgressController(interactor).handle({ month: '2026-11' })).resolves.toMatchObject({
      month: '2026-11',
      delivered: { percent: 64 },
    })
    expect(seen).toEqual([{ month: '2026-11' }])
  })

  it('quarterly controller passes the request and returns the view model', async () => {
    const interactor: GetQuarterlyProgressInputBoundary = {
      async execute(_request, presenter) {
        presenter.present(quarterly)
      },
    }
    await expect(new GetQuarterlyProgressController(interactor).handle({})).resolves.toMatchObject({ quarter: '2026-Q4' })
  })
})
