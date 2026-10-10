import { Router } from 'express'
import { getVersionInfo } from '../version.js'

/**
 * `GET /api/version` (VERSION-INFO-001) — no auth required, same as
 * `/healthz`; it only reveals git metadata about the running deployment.
 */
export function createVersionRouter(): Router {
  const router = Router()
  router.get('/api/version', (_req, res) => {
    res.status(200).json(getVersionInfo())
  })
  return router
}
