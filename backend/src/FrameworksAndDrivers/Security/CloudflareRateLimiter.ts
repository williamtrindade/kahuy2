import type { RateLimiter } from './RateLimiter'

export type RateLimitBinding = { limit(options: { key: string }): Promise<{ success: boolean }> }

/** Usa o binding de Rate Limiting do Cloudflare Workers (configurado no wrangler.toml). */
export class CloudflareRateLimiter implements RateLimiter {
  constructor(private readonly binding: RateLimitBinding) {}

  async allow(key: string): Promise<boolean> {
    return (await this.binding.limit({ key })).success
  }
}
