import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './client'

/**
 * Fetches `path` and re-fetches whenever `path` or any of `deps` change
 * (pass the store's `refresh` counter so lists update after an action).
 */
export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const seq = useRef(0)

  const load = useCallback(async () => {
    if (!path) {
      setData(null)
      return
    }
    const mine = ++seq.current
    setLoading(true)
    try {
      const d = await api<T>(path)
      if (mine === seq.current) {
        setData(d)
        setError(null)
      }
    } catch (e) {
      if (mine === seq.current) setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (mine === seq.current) setLoading(false)
    }
  }, [path])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, ...deps])

  return { data, error, loading, reload: load }
}
