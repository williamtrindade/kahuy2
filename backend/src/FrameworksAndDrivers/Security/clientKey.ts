import type { Context } from 'hono'

type NodeBindings = { incoming?: { socket?: { remoteAddress?: string } } }

/**
 * Chave do rate limit no Node: o IP da conexão TCP. Headers como X-Forwarded-For são
 * forjáveis, então só são usados com TRUST_PROXY=true (API atrás de um proxy reverso seu).
 */
export function nodeClientKey(trustProxy: boolean): (c: Context) => string {
  return (c) => {
    const peer = (c.env as NodeBindings | undefined)?.incoming?.socket?.remoteAddress ?? 'unknown'
    if (!trustProxy) return peer
    return c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || peer
  }
}
