import { useEffect, useState } from 'react'
import type { ClientVersionInfo } from './version'

/** VERSION-INFO-001: `GET /api/version` on mount — same shape as `ClientVersionInfo`. */
export function useServerVersionInfo(): ClientVersionInfo | null {
  const [info, setInfo] = useState<ClientVersionInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/version')
      .then((res) => (res.status === 200 ? res.json() : null))
      .then((body) => {
        if (!cancelled && body) setInfo(body)
      })
      .catch(() => {
        // a failed check just leaves the server side unreported
      })
    return () => {
      cancelled = true
    }
  }, [])

  return info
}
