import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'

describe('GET /api/version (VERSION-INFO-001)', () => {
  it('given the server is running from source (no dist/version.json), when GET /api/version, then it reports live git fields labeled "Dev build"', async () => {
    // given: the app is running (this test suite always runs from src/, never dist/)
    const app = createApp()

    // when: a client requests the version endpoint
    const response = await request(app).get('/api/version')

    // then: it reports the live git snapshot, not a build artifact
    expect(response.status).toBe(200)
    expect(response.body).toEqual(
      expect.objectContaining({
        branch: expect.any(String),
        commitSha: expect.any(String),
        dirty: expect.any(Boolean),
        commitTimestamp: expect.any(String),
        label: 'Dev build',
        startedAt: expect.any(String),
      }),
    )
  })

  it('given two requests, when GET /api/version is called twice, then the reported startedAt does not change between calls', async () => {
    // given: the app is running
    const app = createApp()

    // when: the endpoint is called twice
    const first = await request(app).get('/api/version')
    const second = await request(app).get('/api/version')

    // then: startedAt is stable (computed once at process start, not per-request)
    expect(second.body.startedAt).toBe(first.body.startedAt)
  })
})
