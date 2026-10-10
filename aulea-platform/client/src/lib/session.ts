import { useEffect, useState } from 'react'

/**
 * Shared shape of `GET /api/me`'s response body (AUTH-UX-001, `tenant`
 * added by TENANT-001). Any screen that needs to know "am I signed in,
 * and as whom" uses this — not each screen re-deriving it from a cookie.
 */
export interface SignedInUser {
  id: string
  email: string
  tenant: { id: string; name: string } | null
}

/**
 * `GET /api/me` on mount, plus a `logout` action (`POST /api/logout` then
 * a full navigation home — LOGOUT-001) — factored out of `App.tsx` so
 * COURSE-001's dashboard doesn't re-implement the same fetch/logout pair.
 */
export function useSignedInUser(): { user: SignedInUser | null; logout: () => Promise<void> } {
  const [user, setUser] = useState<SignedInUser | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/me')
      .then((res) => (res.status === 200 ? res.json() : null))
      .then((body) => {
        if (!cancelled && body) setUser(body)
      })
      .catch(() => {
        // a failed check is treated the same as signed-out
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function logout() {
    await fetch('/api/logout', { method: 'POST' })
    window.location.assign('/')
  }

  return { user, logout }
}
