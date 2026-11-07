import type { Context } from 'hono'
import { describe, expect, it } from 'vitest'
import { nodeClientKey } from '../../src/FrameworksAndDrivers/Security/clientKey'

function ctx(remoteAddress: string, headers: Record<string, string> = {}): Context {
  return {
    env: { incoming: { socket: { remoteAddress } } },
    req: { header: (name: string) => headers[name.toLowerCase()] },
  } as unknown as Context
}

describe('nodeClientKey', () => {
  it('uses the TCP peer address and ignores forwarding headers by default', () => {
    const key = nodeClientKey(false)
    expect(key(ctx('10.0.0.7', { 'x-forwarded-for': '1.2.3.4' }))).toBe('10.0.0.7')
  })

  it('uses the first X-Forwarded-For hop when behind a trusted proxy', () => {
    const key = nodeClientKey(true)
    expect(key(ctx('127.0.0.1', { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4')
    expect(key(ctx('127.0.0.1'))).toBe('127.0.0.1')
  })
})
