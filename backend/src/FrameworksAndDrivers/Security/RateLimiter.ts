export interface RateLimiter {
  /** true = tentativa permitida */
  allow(key: string): Promise<boolean>
}
