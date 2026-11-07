import { useEffect, useState } from 'react'

/**
 * Carrega dados de um período; `period` undefined = período corrente. Ao trocar de período,
 * mantém os dados anteriores na tela e marca `loading` até chegarem os novos. A busca anterior
 * é cancelada (AbortController): trocar rápido não acumula requisições nem aplica resposta velha.
 */
export function usePeriod<T>(
  load: (period?: string, signal?: AbortSignal) => Promise<T>,
  period: string | undefined,
  onError: (e: unknown) => void,
) {
  const [data, setData] = useState<T | null>(null)
  const [loadedFor, setLoadedFor] = useState<{ period?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    load(period, controller.signal)
      .then((d) => {
        if (controller.signal.aborted) return
        setData(d)
        setLoadedFor({ period })
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return
        onError(e)
        setError((e as Error).message)
      })
    return () => controller.abort()
  }, [load, period, onError])

  return { data, error, loading: error === null && (loadedFor === null || loadedFor.period !== period) }
}
