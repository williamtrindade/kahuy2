/** Formato mínimo de uma página retornada pela API do Notion. */
export type NotionProperty = { type: string; [key: string]: unknown }

export type NotionPage = {
  id: string
  url: string
  properties: Record<string, NotionProperty>
}

export type NotionQueryResult = {
  results: NotionPage[]
  has_more: boolean
  next_cursor: string | null
}

/** Porta para o cliente HTTP do Notion (implementada em FrameworksAndDrivers). */
export interface NotionDatabaseClient {
  queryDatabase(databaseId: string, startCursor?: string): Promise<NotionQueryResult>
}

export type NotionFieldMap = {
  title: string
  hours: string
  status: string
  date: string
  type: string
}
