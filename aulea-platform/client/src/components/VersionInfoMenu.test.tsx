import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import VersionInfoMenu from './VersionInfoMenu'
import { getClientVersionInfo } from '../lib/version'

function stubVersionFetch(serverBody: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ status: 200, json: () => Promise.resolve(serverBody) })),
  )
}

describe('VersionInfoMenu (VERSION-INFO-001)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('given the server reports the same commit as the client, when rendered, then no mismatch flag is shown', async () => {
    // given: the server's version matches the client bundle's own
    const client = getClientVersionInfo()
    const suffix = client.dirty ? '-dirty' : ''
    stubVersionFetch(client)

    // when: the menu renders and the server version resolves
    render(<VersionInfoMenu />)
    await waitFor(() =>
      expect(screen.getByText(`Client: ${client.branch}@${client.commitSha}${suffix}`)).toBeInTheDocument(),
    )

    // then: no mismatch warning is shown, and the server row is present
    expect(screen.queryByText(/version mismatch/i)).not.toBeInTheDocument()
    expect(screen.getByText(`Server: ${client.branch}@${client.commitSha}${suffix}`)).toBeInTheDocument()
  })

  it('given the server reports a different commit than the client, when rendered, then a mismatch flag is shown', async () => {
    // given: the server's version disagrees with the client bundle's own
    const client = getClientVersionInfo()
    stubVersionFetch({ ...client, commitSha: 'deadbee', branch: 'other-branch', dirty: false })

    // when: the menu renders and the server version resolves
    render(<VersionInfoMenu />)
    await waitFor(() => expect(screen.getByText('Server: other-branch@deadbee')).toBeInTheDocument())

    // then: the mismatch warning is shown
    expect(screen.getByText(/version mismatch/i)).toBeInTheDocument()
  })
})
