import { describe, expect, it } from 'vitest'
import { CloudflareRateLimiter } from '../../src/FrameworksAndDrivers/Security/CloudflareRateLimiter'
import { HmacSessionCookie } from '../../src/FrameworksAndDrivers/Security/HmacSessionCookie'
import { MemoryRateLimiter } from '../../src/FrameworksAndDrivers/Security/MemoryRateLimiter'
import { verifyPassword } from '../../src/FrameworksAndDrivers/Security/PasswordAuth'

const PASSWORD = 'a'.repeat(16)

describe('verifyPassword', () => {
  it('accepts the right password and rejects others', async () => {
    expect(await verifyPassword(PASSWORD, PASSWORD)).toBe(true)
    expect(await verifyPassword('b'.repeat(16), PASSWORD)).toBe(false)
    expect(await verifyPassword('', PASSWORD)).toBe(false)
  })
})

describe('HmacSessionCookie', () => {
  const session = new HmacSessionCookie(PASSWORD)

  it('verifies a token it issued until it expires', async () => {
    const token = await session.issue(1000)
    expect(await session.verify(token, 2000)).toBe(true)
    expect(await session.verify(token, 1000 + HmacSessionCookie.MAX_AGE_S * 1000 + 1)).toBe(false)
  })

  it('rejects tokens signed with another password (password rotated)', async () => {
    const token = await session.issue(1000)
    expect(await new HmacSessionCookie('c'.repeat(16)).verify(token, 2000)).toBe(false)
  })

  it('rejects tampered or missing tokens', async () => {
    const token = await session.issue(1000)
    expect(await session.verify(token.replace(/^\d+/, '9999999999999'), 2000)).toBe(false)
    expect(await session.verify('lixo', 2000)).toBe(false)
    expect(await session.verify(undefined, 2000)).toBe(false)
  })
})

describe('MemoryRateLimiter', () => {
  it('allows 5 attempts per window per key', async () => {
    let t = 0
    const rl = new MemoryRateLimiter(5, 60000, () => t)
    for (let i = 0; i < 5; i++) expect(await rl.allow('ip')).toBe(true)
    expect(await rl.allow('ip')).toBe(false)
    expect(await rl.allow('outro')).toBe(true)
    t = 60001
    expect(await rl.allow('ip')).toBe(true)
  })
})

describe('CloudflareRateLimiter', () => {
  it('delegates to the Workers binding', async () => {
    const keys: string[] = []
    const rl = new CloudflareRateLimiter({
      async limit({ key }) {
        keys.push(key)
        return { success: key !== 'blocked' }
      },
    })
    expect(await rl.allow('ip')).toBe(true)
    expect(await rl.allow('blocked')).toBe(false)
    expect(keys).toEqual(['ip', 'blocked'])
  })
})
