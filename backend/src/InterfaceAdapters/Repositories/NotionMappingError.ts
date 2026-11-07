export class NotionMappingError extends Error {
  constructor(
    readonly field: string,
    readonly actualType?: string,
  ) {
    super(
      actualType
        ? `Campo "${field}" da base do Notion tem tipo não suportado (${actualType}); verifique NOTION_FIELD_*`
        : `Campo "${field}" não encontrado na base do Notion (verifique NOTION_FIELD_*)`,
    )
    this.name = 'NotionMappingError'
  }
}
