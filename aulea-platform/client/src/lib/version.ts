/**
 * VERSION-INFO-001: `__CLIENT_VERSION__` is injected by `vite.config.ts`'s
 * `define` at config-load time (covers both `vite build` and `vite dev`),
 * baked into the bundle — never fetched.
 */
export interface ClientVersionInfo {
  branch: string
  commitSha: string
  dirty: boolean
  commitTimestamp: string
  label: 'Built' | 'Dev build'
  builtAt?: string
  startedAt?: string
}

declare const __CLIENT_VERSION__: ClientVersionInfo

export function getClientVersionInfo(): ClientVersionInfo {
  return __CLIENT_VERSION__
}
