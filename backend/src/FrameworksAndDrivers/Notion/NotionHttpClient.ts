import type { NotionDatabaseClient, NotionQueryResult } from '../../InterfaceAdapters/Repositories/NotionTypes'
import { NotionApiError } from './NotionApiError'

const NOTION_VERSION = '2022-06-28'

export class NotionHttpClient implements NotionDatabaseClient {
  constructor(
    private readonly token: string,
    private readonly baseUrl: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async queryDatabase(databaseId: string, startCursor?: string): Promise<NotionQueryResult> {
    const res = await this.fetchFn(`${this.baseUrl}/v1/databases/${encodeURIComponent(databaseId)}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(startCursor ? { page_size: 100, start_cursor: startCursor } : { page_size: 100 }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string }
      throw new NotionApiError(res.status, `Notion respondeu ${res.status}: ${body.message ?? res.statusText}`)
    }
    return (await res.json()) as NotionQueryResult
  }
}
