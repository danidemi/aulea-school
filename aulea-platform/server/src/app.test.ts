import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from './app.js'

describe('server app', () => {
  it('responds ok on the health check endpoint', async () => {
    // given: the app is running
    const app = createApp()

    // when: a client requests the health check endpoint
    const response = await request(app).get('/healthz')

    // then: it responds with 200 and a status of ok
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })

  it('serves the built client for the root path', async () => {
    // given: the app is running and the client has been built
    const app = createApp()

    // when: an unregistered user's browser requests the platform URL
    const response = await request(app).get('/')

    // then: the home page (built client shell) is returned
    expect(response.status).toBe(200)
    expect(response.text).toContain('<div id="root">')
  })
})
