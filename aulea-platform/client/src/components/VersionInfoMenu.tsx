import { TriangleAlert } from 'lucide-react'
import { getClientVersionInfo, type ClientVersionInfo } from '../lib/version'
import { useServerVersionInfo } from '../lib/useServerVersionInfo'

/**
 * VERSION-INFO-001: one short label per side (branch@sha, "-dirty" if
 * applicable) inside USER-MENU-001's dropdown, each a native `<details>` so
 * the full breakdown expands on click (keyboard/touch parity, no custom JS)
 * rather than hover-only. A `<details>` disclosure isn't inside the Radix
 * `DropdownMenuItem` role hierarchy — rendered as plain markup below the
 * menu items instead of as `DropdownMenuItem`s themselves.
 */
function shortLabel(info: ClientVersionInfo): string {
  return `${info.branch}@${info.commitSha}${info.dirty ? '-dirty' : ''}`
}

function VersionRow({ side, info }: { side: string; info: ClientVersionInfo }) {
  return (
    <details className="px-2 py-1 text-xs text-ink/80">
      <summary className="cursor-pointer select-none">{`${side}: ${shortLabel(info)}`}</summary>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 pl-2">
        <dt className="font-medium">Branch</dt>
        <dd>{info.branch}</dd>
        <dt className="font-medium">Commit</dt>
        <dd>{info.commitSha}</dd>
        <dt className="font-medium">Status</dt>
        <dd>{info.dirty ? 'dirty' : 'clean'}</dd>
        <dt className="font-medium">Commit time</dt>
        <dd>{info.commitTimestamp}</dd>
        <dt className="font-medium">{info.label}</dt>
        <dd>{info.builtAt ?? info.startedAt}</dd>
      </dl>
    </details>
  )
}

function VersionInfoMenu() {
  const client = getClientVersionInfo()
  const server = useServerVersionInfo()
  const mismatch = server !== null && server.commitSha !== client.commitSha

  return (
    <div className="border-t border-border pt-1">
      {mismatch && (
        <p className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-error">
          <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
          Client/server version mismatch
        </p>
      )}
      <VersionRow side="Client" info={client} />
      {server && <VersionRow side="Server" info={server} />}
    </div>
  )
}

export default VersionInfoMenu
