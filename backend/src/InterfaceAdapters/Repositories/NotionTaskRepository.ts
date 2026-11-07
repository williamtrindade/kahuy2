import { DomainError } from '../../Entities/DomainError'
import type { InvalidTask, TaskList, TaskRepositoryInterface } from '../../UseCases/Contracts/TaskRepositoryInterface'
import type { NotionTaskMapper } from './NotionTaskMapper'
import type { NotionDatabaseClient } from './NotionTypes'

export class NotionTaskRepository implements TaskRepositoryInterface {
  constructor(
    private readonly client: NotionDatabaseClient,
    private readonly databaseId: string,
    private readonly mapper: NotionTaskMapper,
  ) {}

  async findAll(): Promise<TaskList> {
    const list: TaskList = { tasks: [], invalid: [] }
    let cursor: string | undefined
    do {
      const page = await this.client.queryDatabase(this.databaseId, cursor)
      for (const p of page.results) {
        try {
          list.tasks.push(this.mapper.toEntity(p))
        } catch (err) {
          // Uma task com dado inválido não derruba o dashboard: sai da conta e vira aviso.
          if (!(err instanceof DomainError)) throw err
          list.invalid.push({ title: this.mapper.title(p), url: p.url, reason: err.message } satisfies InvalidTask)
        }
      }
      cursor = page.has_more && page.next_cursor ? page.next_cursor : undefined
    } while (cursor)
    return list
  }
}
