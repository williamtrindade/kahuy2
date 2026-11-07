import { describe, expect, it } from 'vitest'
import { NotionApiError } from '../../src/FrameworksAndDrivers/Notion/NotionApiError'
import { NotionHttpClient } from '../../src/FrameworksAndDrivers/Notion/NotionHttpClient'

function fakeFetch(status: number, body: unknown) {
  const requests: Request[] = []
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(new Request(input, init))
    return new Response(JSON.stringify(body), { status })
  }) as typeof fetch
  return { fn, requests }
}

describe('NotionHttpClient', () => {
  it('queries the database with pagination', async () => {
    const f = fakeFetch(200, { results: [], has_more: false, next_cursor: null })
    const client = new NotionHttpClient('secret_x', 'https://api.notion.com', f.fn)
    await expect(client.queryDatabase('db', 'c2')).resolves.toEqual({ results: [], has_more: false, next_cursor: null })
    const req = f.requests[0]!
    expect(req.method).toBe('POST')
    expect(req.url).toBe('https://api.notion.com/v1/databases/db/query')
    expect(req.headers.get('Notion-Version')).toBe('2022-06-28')
    expect(req.headers.get('Authorization')).toBe('Bearer secret_x')
    expect(await req.json()).toEqual({ page_size: 100, start_cursor: 'c2' })
  })

  it('omits start_cursor on the first page', async () => {
    const f = fakeFetch(200, { results: [], has_more: false, next_cursor: null })
    await new NotionHttpClient('secret_x', 'https://api.notion.com', f.fn).queryDatabase('db')
    expect(await f.requests[0]!.json()).toEqual({ page_size: 100 })
  })

  it('raises NotionApiError without leaking the token', async () => {
    const f = fakeFetch(401, { message: 'API token is invalid.' })
    const client = new NotionHttpClient('secret_x', 'https://api.notion.com', f.fn)
    const err = await client.queryDatabase('db').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(NotionApiError)
    expect((err as NotionApiError).status).toBe(401)
    expect(String((err as Error).message)).not.toContain('secret_x')
  })
})
