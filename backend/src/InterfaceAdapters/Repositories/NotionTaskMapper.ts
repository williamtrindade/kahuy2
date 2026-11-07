import { Task } from '../../Entities/Task'
import { NotionMappingError } from './NotionMappingError'
import type { NotionFieldMap, NotionPage, NotionProperty } from './NotionTypes'

type Named = { name?: string } | null | undefined
type DateValue = { start?: string | null; end?: string | null } | null | undefined

/**
 * Data só com dia ("2026-11-01") vira meio-dia UTC: o dia local é o mesmo em qualquer fuso
 * de UTC−11 a UTC+11. `new Date("2026-11-01")` seria meia-noite UTC = dia anterior no Brasil.
 */
function parseNotionDate(value: string | null | undefined): Date | null {
  if (!value) return null
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value)
}

export class NotionTaskMapper {
  constructor(private readonly fields: NotionFieldMap) {}

  toEntity(page: NotionPage): Task {
    const status = this.required(page, this.fields.status, ['select', 'status'])
    const date = this.required(page, this.fields.date, ['date']).date as DateValue
    const type = page.properties[this.fields.type]

    return new Task({
      id: page.id,
      title: this.title(page),
      hours: this.hours(page),
      status: ((status.select ?? status.status) as Named)?.name ?? '',
      type: (type?.select as Named)?.name ?? null,
      startDate: parseNotionDate(date?.start),
      endDate: parseNotionDate(date?.end),
      url: page.url,
    })
  }

  title(page: NotionPage): string {
    const title = this.required(page, this.fields.title, ['title']).title as { plain_text?: string }[] | undefined
    return (title ?? []).map((t) => t.plain_text ?? '').join('')
  }

  /** Aceita propriedade numérica ou fórmula com resultado numérico; vazio = 0. */
  private hours(page: NotionPage): number {
    const prop = this.required(page, this.fields.hours, ['number', 'formula'])
    if (prop.type === 'number') return (prop.number as number | null) ?? 0
    const formula = prop.formula as { type?: string; number?: number | null } | undefined
    if (formula?.type !== 'number') throw new NotionMappingError(this.fields.hours, `formula:${formula?.type}`)
    return formula.number ?? 0
  }

  private required(page: NotionPage, field: string, types: string[]): NotionProperty {
    const prop = page.properties[field]
    if (!prop) throw new NotionMappingError(field)
    if (!types.includes(prop.type)) throw new NotionMappingError(field, prop.type)
    return prop
  }
}
