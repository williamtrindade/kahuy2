import { describe, expect, it } from 'vitest'
import { ConfigError } from '../../src/FrameworksAndDrivers/Config/ConfigError'
import { NATIONAL_HOLIDAYS } from '../../src/FrameworksAndDrivers/Config/holidays'
import { loadConfig } from '../../src/FrameworksAndDrivers/Config/loadConfig'

const env = { NOTION_TOKEN: 'secret_x', NOTION_DATABASE_ID: 'db', KAHUY_PASSWORD: 'a'.repeat(16) }

describe('loadConfig', () => {
  it('applies defaults', () => {
    expect(loadConfig(env)).toEqual({
      notionToken: 'secret_x',
      notionDatabaseId: 'db',
      notionApiUrl: 'https://api.notion.com',
      password: 'a'.repeat(16),
      fields: { title: 'Task', hours: 'Horas', status: 'Status', date: 'Data', type: 'Tipo' },
      doneStatuses: ['Concluido'],
      hoursPerDay: 8,
      goalTiers: [100, 125],
      workingDays: {},
      holidays: {},
      personalDaysOff: {},
      timeZone: 'America/Sao_Paulo',
      allowedOrigin: null,
      trustProxy: false,
      testTypes: ['TESTE'],
      port: 8787,
    })
  })

  it('parses lists and JSON', () => {
    const c = loadConfig({
      ...env,
      DONE_STATUSES: 'Concluido, Entregue',
      GOAL_TIERS: '100,110,125',
      WORKING_DAYS: '{"2026-11":19}',
      NOTION_FIELD_HOURS: 'Hours',
      PORT: '9000',
    })
    expect(c.doneStatuses).toEqual(['Concluido', 'Entregue'])
    expect(c.goalTiers).toEqual([100, 110, 125])
    expect(c.workingDays).toEqual({ '2026-11': 19 })
    expect(c.fields.hours).toBe('Hours')
    expect(c.port).toBe(9000)
    expect(loadConfig({ ...env, TRUST_PROXY: 'true' }).trustProxy).toBe(true)
    expect(loadConfig({ ...env, TEST_TYPES: 'TESTE, QA' }).testTypes).toEqual(['TESTE', 'QA'])
    expect(loadConfig({ ...env, HOLIDAYS: '2026-11-02, 2026-11-20' }).holidays).toEqual({ '2026-11-02': '', '2026-11-20': '' })
  })

  it('accepts HOLIDAYS as JSON (object with names or array)', () => {
    expect(loadConfig({ ...env, HOLIDAYS: '{"2026-11-02":"Finados","2026-12-25":"Natal"}' }).holidays).toEqual({
      '2026-11-02': 'Finados',
      '2026-12-25': 'Natal',
    })
    expect(loadConfig({ ...env, HOLIDAYS: '["2026-11-02"]' }).holidays).toEqual({ '2026-11-02': '' })
  })

  it('adds personal HOLIDAYS on top of the national holidays (personal wins on the same date)', () => {
    const national = { '2026-11-02': 'Finados', '2026-12-25': 'Natal' }
    const personal = '{"2027-01-04":"Férias","2026-12-25":"Natal (folga)"}'
    expect(loadConfig({ ...env, HOLIDAYS: personal }, national).holidays).toEqual({
      '2026-11-02': 'Finados',
      '2026-12-25': 'Natal (folga)',
      '2027-01-04': 'Férias',
    })
    expect(loadConfig(env, national).holidays).toEqual(national)
  })

  it('keeps the personal days off apart, so the calendar tells vacation from holiday', () => {
    const national = { '2026-11-02': 'Finados' }
    const c = loadConfig({ ...env, HOLIDAYS: '{"2026-11-20":"Férias"}' }, national)
    expect(c.personalDaysOff).toEqual({ '2026-11-20': 'Férias' })
    expect(loadConfig(env, national).personalDaysOff).toEqual({})
  })

  it('rejects an invalid date in the national holidays', () => {
    expect(() => loadConfig(env, { '02/11/2026': 'Finados' })).toThrow(/holidays\.json/)
  })

  it('ships a valid holidays.json with the national holidays', () => {
    const { holidays } = loadConfig(env, NATIONAL_HOLIDAYS)
    expect(holidays['2026-12-25']).toBe('Natal')
    expect(holidays['2027-01-01']).toBeDefined()
  })

  it('treats empty strings as missing', () => {
    expect(() => loadConfig({ ...env, NOTION_TOKEN: '' })).toThrow(/NOTION_TOKEN/)
    expect(loadConfig({ ...env, TIMEZONE: '' }).timeZone).toBe('America/Sao_Paulo')
  })

  it('hints at quoting when a short password looks cut by a # comment', () => {
    expect(() => loadConfig({ ...env, KAHUY_PASSWORD: 'a' })).toThrow(/entre aspas/)
  })

  it.each([
    [{ KAHUY_PASSWORD: 'curta' }, /KAHUY_PASSWORD/],
    [{ NOTION_DATABASE_ID: undefined }, /NOTION_DATABASE_ID/],
    [{ WORKING_DAYS: '{x' }, /WORKING_DAYS/],
    [{ WORKING_DAYS: '{"2026-11":-2}' }, /WORKING_DAYS/],
    [{ WORKING_DAYS: '{"novembro":19}' }, /WORKING_DAYS/],
    [{ TIMEZONE: 'Marte/Base' }, /TIMEZONE/],
    [{ GOAL_TIERS: '100,abc' }, /GOAL_TIERS/],
    [{ HOURS_PER_DAY: '0' }, /HOURS_PER_DAY/],
    [{ TRUST_PROXY: 'talvez' }, /TRUST_PROXY/],
    [{ HOLIDAYS: '02/11/2026' }, /HOLIDAYS/],
    [{ HOLIDAYS: '2026-02-30' }, /HOLIDAYS/],
    [{ HOLIDAYS: '2026-13-01' }, /HOLIDAYS/],
    [{ HOLIDAYS: '{"2026-11-02":' }, /HOLIDAYS/],
    [{ HOLIDAYS: '{"02/11/2026":"Finados"}' }, /HOLIDAYS/],
  ])('rejects %o', (override, message) => {
    expect(() => loadConfig({ ...env, ...override })).toThrow(ConfigError)
    expect(() => loadConfig({ ...env, ...override })).toThrow(message)
  })
})
