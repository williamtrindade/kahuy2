import type { MonthlyProgressViewModel, QuarterlyProgressViewModel, WeeklyProgressViewModel } from './types'

export type { MonthlyProgressViewModel, QuarterlyProgressViewModel, WeeklyProgressViewModel }

export class UnauthorizedError extends Error {
  constructor() {
    super('Sessão expirada')
    this.name = 'UnauthorizedError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin', ...init })
  if (res.status === 401) throw new UnauthorizedError()
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Erro ${res.status}`)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

export async function login(password: string): Promise<void> {
  const res = await fetch('/api/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (res.status === 401) throw new Error('Senha incorreta')
  if (res.status === 429) throw new Error('Muitas tentativas, aguarde 1 minuto')
  if (!res.ok) throw new Error(`Erro ${res.status}`)
}

export function logout(): Promise<void> {
  return request('/api/logout', { method: 'POST' })
}

// `signal` cancela a busca quando o período muda antes de ela terminar (ver usePeriod).
export function getMonthly(month?: string, signal?: AbortSignal): Promise<MonthlyProgressViewModel> {
  return request(`/api/progress/monthly${month ? `?month=${encodeURIComponent(month)}` : ''}`, { signal })
}

/** `week`: qualquer data AAAA-MM-DD da semana; ausente = semana corrente. */
export function getWeekly(week?: string, signal?: AbortSignal): Promise<WeeklyProgressViewModel> {
  return request(`/api/progress/weekly${week ? `?week=${encodeURIComponent(week)}` : ''}`, { signal })
}

export function getQuarterly(quarter?: string, signal?: AbortSignal): Promise<QuarterlyProgressViewModel> {
  return request(`/api/progress/quarterly${quarter ? `?quarter=${encodeURIComponent(quarter)}` : ''}`, { signal })
}
