import { describe, expect, it } from 'vitest'
import { DomainError } from '../../src/Entities/DomainError'
import { Quarter } from '../../src/Entities/Quarter'
import { YearMonth } from '../../src/Entities/YearMonth'

describe('Quarter', () => {
  it('lists its months', () => {
    expect(Quarter.parse('2026-Q4').months().map(String)).toEqual(['2026-10', '2026-11', '2026-12'])
  })

  it('is derived from a month', () => {
    expect(Quarter.of(YearMonth.parse('2026-02')).toString()).toBe('2026-Q1')
  })

  it('rejects invalid input', () => {
    expect(() => Quarter.parse('2026-Q5')).toThrow(DomainError)
  })
})
