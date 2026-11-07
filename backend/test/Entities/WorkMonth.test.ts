import { describe, expect, it } from 'vitest'
import { DomainError } from '../../src/Entities/DomainError'
import { WorkMonth } from '../../src/Entities/WorkMonth'
import { YearMonth } from '../../src/Entities/YearMonth'

const nov = YearMonth.parse('2026-11')

describe('WorkMonth', () => {
  it('goal is working days times hours per day', () => {
    expect(new WorkMonth(nov, 19, 8, false, nov.weekdays()).goal()).toBe(152)
    expect(new WorkMonth(nov, 0, 8, false, []).goal()).toBe(0)
  })

  it('exposes hours per day', () => {
    expect(new WorkMonth(nov, 19, 8, false, nov.weekdays()).hoursPerDay).toBe(8)
  })

  it('keeps the list of working dates', () => {
    expect(new WorkMonth(nov, 19, 8, false, ['2026-11-03']).workdays).toEqual(['2026-11-03'])
  })

  it('rejects invalid values', () => {
    expect(() => new WorkMonth(nov, -1, 8, false, [])).toThrow(DomainError)
    expect(() => new WorkMonth(nov, 1.5, 8, false, [])).toThrow(DomainError)
    expect(() => new WorkMonth(nov, 19, 0, false, [])).toThrow(DomainError)
  })
})
