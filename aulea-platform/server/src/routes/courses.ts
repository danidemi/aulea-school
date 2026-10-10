import { Router, type RequestHandler } from 'express'
import { isUniqueViolation } from '../db/users.js'
import { isInvalidIdError } from '../db/errors.js'
import type { CourseRepository, CourseSort } from '../db/courses.js'

const SORT_VALUES: CourseSort[] = ['title', 'createdAt', 'updatedAt']

function isCourseSort(value: unknown): value is CourseSort {
  return typeof value === 'string' && (SORT_VALUES as string[]).includes(value)
}

const MAX_TITLE_LENGTH = 200

function isValidTitle(title: unknown): title is string {
  return typeof title === 'string' && title.trim().length > 0 && title.length <= MAX_TITLE_LENGTH
}

/**
 * `GET /api/courses` and `POST /api/courses` (COURSE-001). Both require a
 * session (TENANT-001's `req.session.tenantId`) — there is no "courses
 * outside any tenant" case, so an unauthenticated request is rejected
 * outright rather than being asked which tenant it means.
 */
export function createCoursesRouter(courses: CourseRepository, sessionMiddleware: RequestHandler): Router {
  const router = Router()

  router.get('/api/courses', sessionMiddleware, async (req, res) => {
    if (!req.session.tenantId) {
      res.status(401).json({ error: 'not_signed_in' })
      return
    }

    const sortByParam = req.query.sortBy
    const sortBy = isCourseSort(sortByParam) ? sortByParam : 'title'

    try {
      const rows = await courses.listByTenant(req.session.tenantId, sortBy)
      res.status(200).json(rows)
    } catch (err) {
      console.error('list courses failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  // COURSE-DETAIL-001: fetches one course's own title for the course
  // detail page's breadcrumb. Same 401/404 shape as quizzes.ts's
  // `authorizeCourse` — a course id in another tenant is indistinguishable
  // from one that doesn't exist at all. ROUTE-ID-GUARD-001: a malformed
  // (non-UUID) course id gets the same 404 too, rather than the 500 this
  // route used to return for it — same information-hiding rationale, and
  // it means a caller can't distinguish "malformed" from "doesn't exist"
  // from "wrong tenant" either.
  router.get('/api/courses/:courseId', sessionMiddleware, async (req, res) => {
    if (!req.session.tenantId) {
      res.status(401).json({ error: 'not_signed_in' })
      return
    }

    try {
      const course = await courses.findByIdForTenant(req.params.courseId, req.session.tenantId)
      if (!course) {
        res.status(404).json({ error: 'course_not_found' })
        return
      }
      res.status(200).json(course)
    } catch (err) {
      if (isInvalidIdError(err)) {
        res.status(404).json({ error: 'course_not_found' })
        return
      }
      console.error('get course failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  router.post('/api/courses', sessionMiddleware, async (req, res) => {
    if (!req.session.tenantId) {
      res.status(401).json({ error: 'not_signed_in' })
      return
    }

    const { title } = req.body ?? {}
    if (!isValidTitle(title)) {
      res.status(400).json({ error: 'invalid_title' })
      return
    }

    try {
      const created = await courses.create({ tenantId: req.session.tenantId, title: title.trim() })
      res.status(201).json(created)
    } catch (err) {
      if (isUniqueViolation(err)) {
        res.status(409).json({ error: 'title_taken' })
        return
      }
      console.error('create course failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  return router
}
