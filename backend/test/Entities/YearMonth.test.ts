import { describe, expect, it } from 'vitest'
import { DomainError } from '../../src/Entities/DomainError'
import { YearMonth } from '../../src/Entities/YearMonth'
import { isWeekday, localDate } from '../../src/Entities/time'

describe('YearMonth', () => {
  it('parses and formats', () => {
    expect(YearMonth.parse('2026-11').toString()).toBe('2026-11')
  })

  it('rejects invalid input', () => {
    expect(() => YearMonth.parse('2026-13')).toThrow(DomainError)
    expect(() => YearMonth.parse('nov')).toThrow(DomainError)
  })

  it('rolls over the year on next()', () => {
    expect(YearMonth.parse('2026-12').next().toString()).toBe('2027-01')
  })

  it('uses the time zone to decide the month', () => {
    expect(YearMonth.fromDate(new Date('2026-11-01T01:00:00Z'), 'America/Sao_Paulo').toString()).toBe('2026-10')
  })

  it('lists days and weekdays', () => {
    const nov = YearMonth.parse('2026-11')
    expect(nov.days()).toHaveLength(30)
    expect(nov.days()[0]).toBe('2026-11-01')
    expect(nov.weekdays()).toHaveLength(21)
  })

  it('knows its quarter and compares', () => {
    expect(YearMonth.parse('2026-11').quarterNumber()).toBe(4)
    expect(YearMonth.parse('2026-02').quarterNumber()).toBe(1)
    expect(YearMonth.parse('2026-10').compare(YearMonth.parse('2026-11'))).toBeLessThan(0)
    expect(YearMonth.parse('2026-11').equals(YearMonth.parse('2026-11'))).toBe(true)
  })
})

describe('time helpers', () => {
  it('formats a local date', () => {
    expect(localDate(new Date('2026-11-05T02:00:00Z'), 'America/Sao_Paulo')).toBe('2026-11-04')
  })

  it('detects weekdays', () => {
    expect(isWeekday('2026-11-06')).toBe(true) // sexta
    expect(isWeekday('2026-11-07')).toBe(false) // sábado
  })
})
