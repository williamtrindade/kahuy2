import { describe, expect, it } from 'vitest'
import { YearMonth } from '../../src/Entities/YearMonth'
import { EnvWorkCalendarRepository } from '../../src/InterfaceAdapters/Repositories/EnvWorkCalendarRepository'
import { NotionMappingError } from '../../src/InterfaceAdapters/Repositories/NotionMappingError'
import { NotionTaskMapper } from '../../src/InterfaceAdapters/Repositories/NotionTaskMapper'
import { NotionTaskRepository } from '../../src/InterfaceAdapters/Repositories/NotionTaskRepository'
import type { NotionDatabaseClient, NotionPage, NotionQueryResult } from '../../src/InterfaceAdapters/Repositories/NotionTypes'
import page1 from '../fixtures/notion-query-page1.json'
import page2 from '../fixtures/notion-query-page2.json'

const fields = { title: 'Task', hours: 'Horas', status: 'Status', date: 'Data', type: 'Tipo' }
const mapper = new NotionTaskMapper(fields)
const pages = [...page1.results, ...page2.results] as unknown as NotionPage[]
const byTitle = (prefix: string) => pages.find((p) => JSON.stringify(p).includes(prefix))!
const clone = (p: NotionPage): NotionPage => JSON.parse(JSON.stringify(p))

describe('NotionTaskMapper', () => {
  it('maps a real page to a Task', () => {
    const t = mapper.toEntity(byTitle('Captura facial'))
    expect(t.hours).toBe(6)
    expect(t.status).toBe('Aguardando')
    expect(t.type).toBe('TESTE')
    expect(t.startDate?.toISOString()).toBe('2026-11-04T14:19:00.000Z')
    expect(t.endDate).toBeNull()
    expect(t.bracketName()).toBe('Alisson')
    expect(t.url).toMatch(/^https:\/\/www\.notion\.so\//)
  })

  it('accepts a status property of type "status"', () => {
    const p = clone(byTitle('Pesos invertidos'))
    p.properties.Status = { id: 's', type: 'status', status: { name: 'Concluido' } }
    expect(mapper.toEntity(p).status).toBe('Concluido')
  })

  it('treats empty hours as zero', () => {
    expect(mapper.toEntity(byTitle('Integração de exames')).hours).toBe(0)
  })

  it('treats a missing type property as no type', () => {
    expect(new NotionTaskMapper({ ...fields, type: 'NaoExiste' }).toEntity(byTitle('Pesos')).type).toBeNull()
  })

  it('fails with the field name when a required field is missing', () => {
    const bad = new NotionTaskMapper({ ...fields, hours: 'Hours' })
    expect(() => bad.toEntity(byTitle('Pesos'))).toThrow(NotionMappingError)
    expect(() => bad.toEntity(byTitle('Pesos'))).toThrow(/"Hours"/)
  })
})

describe('NotionTaskMapper date-only and field types', () => {
  it('keeps date-only Notion dates on the same local day (C1)', () => {
    const p = clone(byTitle('Pesos invertidos'))
    p.properties.Data = { type: 'date', date: { start: '2026-11-01', end: null } }
    const t = mapper.toEntity(p)
    expect(t.completionLocalDate('America/Sao_Paulo')).toBe('2026-11-01')
    expect(t.completionMonth('America/Sao_Paulo')!.toString()).toBe('2026-11')
  })

  it('reads hours from a numeric formula', () => {
    const p = clone(byTitle('Pesos invertidos'))
    p.properties.Horas = { type: 'formula', formula: { type: 'number', number: 2.5 } }
    expect(mapper.toEntity(p).hours).toBe(2.5)
  })

  it('rejects a mapped field of the wrong type naming the field and type (M3)', () => {
    const p = clone(byTitle('Pesos invertidos'))
    p.properties.Horas = { type: 'rich_text', rich_text: [] }
    expect(() => mapper.toEntity(p)).toThrow(NotionMappingError)
    expect(() => mapper.toEntity(p)).toThrow(/"Horas".*rich_text/)
    const q = clone(byTitle('Pesos invertidos'))
    q.properties.Status = { type: 'multi_select', multi_select: [] }
    expect(() => mapper.toEntity(q)).toThrow(/"Status".*multi_select/)
  })
})

describe('NotionTaskRepository', () => {
  it('follows pagination until has_more is false', async () => {
    const calls: (string | undefined)[] = []
    const client: NotionDatabaseClient = {
      async queryDatabase(databaseId, startCursor) {
        expect(databaseId).toBe('db')
        calls.push(startCursor)
        return (startCursor === 'c2' ? page2 : page1) as unknown as NotionQueryResult
      },
    }
    const { tasks, invalid } = await new NotionTaskRepository(client, 'db', mapper).findAll()
    expect(tasks).toHaveLength(page1.results.length + page2.results.length)
    expect(invalid).toEqual([])
    expect(calls).toEqual([undefined, 'c2'])
  })

  it('skips a task that breaks a domain rule instead of failing the whole read', async () => {
    const bad = clone(byTitle('Pesos invertidos'))
    bad.properties.Horas = { type: 'number', number: -2 }
    const good = byTitle('Captura facial')
    const client: NotionDatabaseClient = {
      async queryDatabase() {
        return { results: [bad, good], has_more: false, next_cursor: null }
      },
    }
    const { tasks, invalid } = await new NotionTaskRepository(client, 'db', mapper).findAll()
    expect(tasks).toHaveLength(1)
    expect(invalid).toEqual([{ title: expect.stringContaining('Pesos invertidos'), url: bad.url, reason: expect.stringMatching(/Horas inválidas/) }])
  })
})

describe('EnvWorkCalendarRepository', () => {
  const cal = new EnvWorkCalendarRepository({ '2026-11': 19 }, 8)

  it('uses configured working days', () => {
    expect(cal.workMonth(YearMonth.parse('2026-11'))).toMatchObject({ workingDays: 19, hoursPerDay: 8, estimated: false })
  })

  it('estimates with weekdays when not configured', () => {
    expect(cal.workMonth(YearMonth.parse('2026-12'))).toMatchObject({ workingDays: 23, estimated: true })
  })

  it('estimates a month whose year has no holiday registered', () => {
    const only2026 = new EnvWorkCalendarRepository({}, 8, { '2026-12-25': 'Natal' })
    expect(only2026.workMonth(YearMonth.parse('2026-11'))).toMatchObject({ estimated: false })
    expect(only2026.workMonth(YearMonth.parse('2028-01'))).toMatchObject({ estimated: true })
  })

  it('discounts HOLIDAYS when the month has no WORKING_DAYS', () => {
    const withHolidays = new EnvWorkCalendarRepository({}, 8, { '2026-12-24': '', '2026-12-25': 'Natal', '2026-12-26': '' })
    const dec = withHolidays.workMonth(YearMonth.parse('2026-12'))
    expect(dec).toMatchObject({ workingDays: 21, estimated: false }) // 26 é sábado
    expect(dec.workdays).not.toContain('2026-12-25')
    expect(withHolidays.isWorkday('2026-12-25')).toBe(false)
    expect(withHolidays.isWorkday('2026-12-28')).toBe(true)
    expect(withHolidays.isWorkday('2026-12-27')).toBe(false) // domingo
    expect(withHolidays.dayOff('2026-12-25')).toEqual({ kind: 'holiday', name: 'Natal' })
    expect(withHolidays.dayOff('2026-12-28')).toBeNull()
  })

  it('tells personal days off (vacation) from national holidays; personal wins on the same date', () => {
    const holidays = { '2026-11-02': 'Finados', '2026-11-20': 'Consciência Negra', '2026-11-23': 'Férias' }
    const personal = { '2026-11-20': 'Emenda', '2026-11-23': 'Férias' }
    const c = new EnvWorkCalendarRepository({}, 8, holidays, personal)
    expect(c.dayOff('2026-11-02')).toEqual({ kind: 'holiday', name: 'Finados' })
    expect(c.dayOff('2026-11-20')).toEqual({ kind: 'vacation', name: 'Emenda' })
    expect(c.dayOff('2026-11-23')).toEqual({ kind: 'vacation', name: 'Férias' })
    expect(c.isWorkday('2026-11-23')).toBe(false)
  })

  it('configured WORKING_DAYS keeps priority for the count', () => {
    const both = new EnvWorkCalendarRepository({ '2026-12': 18 }, 8, { '2026-12-25': 'Natal' })
    const dec = both.workMonth(YearMonth.parse('2026-12'))
    expect(dec.workingDays).toBe(18)
    expect(dec.workdays).toHaveLength(22)
  })
})
