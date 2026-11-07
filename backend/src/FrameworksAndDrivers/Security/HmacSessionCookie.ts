const encoder = new TextEncoder()

function toBase64Url(bytes: ArrayBuffer): string {
  let bin = ''
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> | null {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
    return Uint8Array.from(bin, (c) => c.charCodeAt(0))
  } catch {
    return null
  }
}

/** Sessão sem estado: "<expiraEmMs>.<HMAC-SHA256(expiraEmMs)>", chave derivada da senha. */
export class HmacSessionCookie {
  static readonly NAME = 'kahuy_session'
  static readonly MAX_AGE_S = 60 * 60 * 24 * 30

  private readonly key: Promise<CryptoKey>

  constructor(password: string) {
    this.key = crypto.subtle
      .digest('SHA-256', encoder.encode(`kahuy-session:${password}`))
      .then((raw) => crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']))
  }

  async issue(nowMs: number): Promise<string> {
    const exp = String(nowMs + HmacSessionCookie.MAX_AGE_S * 1000)
    const sig = await crypto.subtle.sign('HMAC', await this.key, encoder.encode(exp))
    return `${exp}.${toBase64Url(sig)}`
  }

  async verify(token: string | undefined, nowMs: number): Promise<boolean> {
    const match = token ? /^(\d+)\.([A-Za-z0-9_-]+)$/.exec(token) : null
    if (!match) return false
    const [, exp, sig] = match
    if (Number(exp) < nowMs) return false
    const bytes = fromBase64Url(sig!)
    if (!bytes) return false
    return crypto.subtle.verify('HMAC', await this.key, bytes, encoder.encode(exp))
  }
}
