import type { RateLimiter } from './RateLimiter'

/** Janela fixa em memória (Node / desenvolvimento). */
export class MemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>()

  constructor(
    private readonly limit = 5,
    private readonly windowMs = 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  async allow(key: string): Promise<boolean> {
    const t = this.now()
    if (this.windows.size > 1000) {
      for (const [k, w] of this.windows) if (t - w.start > this.windowMs) this.windows.delete(k)
    }
    const w = this.windows.get(key)
    if (!w || t - w.start > this.windowMs) {
      this.windows.set(key, { start: t, count: 1 })
      return true
    }
    w.count += 1
    return w.count <= this.limit
  }
}
