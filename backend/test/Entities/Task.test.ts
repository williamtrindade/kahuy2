import { describe, expect, it } from 'vitest'
import { DomainError } from '../../src/Entities/DomainError'
import { Task, type TaskProps } from '../../src/Entities/Task'

const TZ = 'America/Sao_Paulo'
const base: TaskProps = {
  id: '1',
  title: 'Ajuste [Alisson]',
  hours: 6,
  status: 'Concluido',
  type: 'TESTE',
  startDate: new Date('2026-11-04T14:19:00Z'),
  endDate: null,
  url: 'https://notion.so/1',
}

describe('Task', () => {
  it('rejects negative or non-finite hours', () => {
    expect(() => new Task({ ...base, hours: -1 })).toThrow(DomainError)
    expect(() => new Task({ ...base, hours: Number.NaN })).toThrow(DomainError)
  })

  it('is done when its status is in the done list', () => {
    expect(new Task(base).isDone(['Concluido'])).toBe(true)
    expect(new Task({ ...base, status: 'Aguardando' }).isDone(['Concluido'])).toBe(false)
  })

  it('falls back to the start date when there is no end date', () => {
    expect(new Task(base).completionMonth(TZ)!.toString()).toBe('2026-11')
  })

  it('uses the local time zone for the completion month', () => {
    const t = new Task({ ...base, endDate: new Date('2026-11-01T01:00:00Z') })
    expect(t.completionMonth(TZ)!.toString()).toBe('2026-10')
    expect(t.completionLocalDate(TZ)).toBe('2026-10-31')
  })

  it('has no completion month without dates', () => {
    expect(new Task({ ...base, startDate: null }).completionMonth(TZ)).toBeNull()
  })

  it('extracts the name from the last [bracket]', () => {
    expect(new Task(base).bracketName()).toBe('Alisson')
    expect(new Task({ ...base, title: 'Exportação de riscos[Heliomar]' }).bracketName()).toBe('Heliomar')
    expect(new Task({ ...base, title: 'A [x] e [Mauro]' }).bracketName()).toBe('Mauro')
    expect(new Task({ ...base, title: 'Pesos invertidos' }).bracketName()).toBeNull()
  })

  it('in test tasks the [name] is the developer; otherwise the requester', () => {
    const test = new Task(base) // type TESTE
    expect(test.developer(['TESTE'])).toBe('Alisson')
    expect(test.requester(['TESTE'])).toBeNull()
    const dev = new Task({ ...base, type: 'PROGRAMAÇÂO', title: 'Ajuste [Mauro]' })
    expect(dev.developer(['TESTE'])).toBeNull()
    expect(dev.requester(['TESTE'])).toBe('Mauro')
  })
})
