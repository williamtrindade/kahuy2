import { describe, expect, it } from 'vitest'
import { DomainError } from '../../src/Entities/DomainError'
import { Week } from '../../src/Entities/Week'

describe('Week', () => {
  it('is the Sunday-to-Saturday week containing a date', () => {
    const w = Week.parse('2026-11-05') // quinta
    expect([w.start, w.end]).toEqual(['2026-11-01', '2026-11-07'])
    expect(w.days()).toEqual(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07'])
    expect(Week.containing('2026-11-01').start).toBe('2026-11-01') // domingo é o início
  })

  it('crosses month and year boundaries', () => {
    const w = Week.parse('2026-12-31')
    expect([w.start, w.end]).toEqual(['2026-12-27', '2027-01-02'])
    expect([w.previous().start, w.next().start]).toEqual(['2026-12-20', '2027-01-03'])
  })

  it('rejects an invalid date', () => {
    expect(() => Week.parse('2026-02-30')).toThrow(DomainError)
    expect(() => Week.parse('semana')).toThrow(DomainError)
  })
})
