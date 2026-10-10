import { Router, type Request, type Response, type RequestHandler } from 'express'
import multer from 'multer'
import path from 'node:path'
import type { CourseRepository } from '../db/courses.js'
import type { NewQuizFile, QuizRepository } from '../db/quizzes.js'
import { validateQti3, validateQtiPackage, extractZipEntries, type QtiValidationError } from '../qti/validateQti3.js'
import { isInvalidIdError } from '../db/errors.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

// A trainer's single-file upload is either a `.zip` package (ADR-0010) or,
// for backwards compatibility (QUIZ-PACKAGE-STORAGE-001's "standalone
// upload keeps working" DoD item), the same bare QTI 3.0 XML file
// QTI-22-IMPORT always accepted. Extension is the only cheap, unambiguous
// signal available here — content-sniffing a zip's magic bytes buys
// nothing multer's own filename doesn't already tell us.
function isZipUpload(originalName: string): boolean {
  return originalName.toLowerCase().endsWith('.zip')
}

function guessMimeType(relativePath: string): string | null {
  return relativePath.toLowerCase().endsWith('.xml') ? 'application/xml' : null
}

interface PreparedUpload {
  title: string
  files: NewQuizFile[]
}

type PrepareResult = { ok: true; upload: PreparedUpload } | { ok: false; errors: QtiValidationError[] }

// Shared by POST (create) and PUT (replace file) — both accept the same
// single-file input and must format-validate it the same way.
function prepareUpload(file: Express.Multer.File): PrepareResult {
  if (isZipUpload(file.originalname)) {
    const validation = validateQtiPackage(file.buffer)
    if (!validation.valid) return { ok: false, errors: validation.errors }
    return {
      ok: true,
      upload: {
        title: validation.title || path.parse(file.originalname).name,
        files: validation.files.map((f) => ({ relativePath: f.relativePath, fileData: f.content, mimeType: guessMimeType(f.relativePath) })),
      },
    }
  }

  const validation = validateQti3(file.buffer)
  if (!validation.valid) return { ok: false, errors: validation.errors }
  return {
    ok: true,
    upload: {
      title: validation.title || path.parse(file.originalname).name,
      // QUIZ-PACKAGE-STORAGE-001: a standalone upload is still stored as a
      // package — just a 1-row one, with no manifest, keyed by the
      // uploaded file's own name.
      files: [{ relativePath: file.originalname, fileData: file.buffer, mimeType: 'application/xml' }],
    },
  }
}

/**
 * `GET/POST /api/courses/:courseId/quizzes` (list — QUIZ-DASHBOARD-001;
 * create — QTI-22-IMPORT, extended by QUIZ-PACKAGE-STORAGE-001 to accept a
 * `.zip` package as well as a bare file), `DELETE .../quizzes/:quizId`
 * (QUIZ-DASHBOARD-001), and `PUT .../quizzes/:quizId/file`
 * (QUIZ-DASHBOARD-001 replace, no format validation change beyond what
 * create already gained).
 *
 * Every route first calls `courses.findByIdForTenant` — a course id that
 * doesn't exist and one that exists in a different tenant get the same
 * 404, so a caller can't use this to probe which course ids exist in
 * other tenants.
 */
export function createQuizzesRouter(courses: CourseRepository, quizzes: QuizRepository, sessionMiddleware: RequestHandler): Router {
  const router = Router()

  /**
   * 401 (no session) and 404 (course doesn't exist, or belongs to a
   * different tenant) are kept distinct — unlike the course-vs-tenant
   * case, "are you signed in at all" is not information worth hiding.
   *
   * ROUTE-ID-GUARD-001: the `findByIdForTenant` lookup is wrapped in its
   * own try/catch, not left to propagate — a malformed (non-UUID)
   * `:courseId` used to make Postgres raise an uncaught rejection here,
   * which crashed the whole server process for every tenant, not just the
   * caller who sent it. A malformed id is folded into the same 'not_found'
   * outcome as a genuinely missing course (same information-hiding
   * rationale as the tenant-mismatch case above); any other,
   * genuinely-unexpected error still surfaces as 'error' -> 500, not a
   * silent 404.
   */
  async function authorizeCourse(req: Request): Promise<'unauthenticated' | 'not_found' | 'error' | 'ok'> {
    if (!req.session.tenantId) return 'unauthenticated'
    try {
      const course = await courses.findByIdForTenant(req.params.courseId, req.session.tenantId)
      return course ? 'ok' : 'not_found'
    } catch (err) {
      if (isInvalidIdError(err)) return 'not_found'
      console.error('authorize course failed:', err)
      return 'error'
    }
  }

  function rejectIfUnauthorized(authResult: 'unauthenticated' | 'not_found' | 'error' | 'ok', res: Response): boolean {
    if (authResult === 'unauthenticated') {
      res.status(401).json({ error: 'not_signed_in' })
      return true
    }
    if (authResult === 'not_found') {
      res.status(404).json({ error: 'course_not_found' })
      return true
    }
    if (authResult === 'error') {
      res.status(500).json({ error: 'internal_error' })
      return true
    }
    return false
  }

  router.get('/api/courses/:courseId/quizzes', sessionMiddleware, async (req, res) => {
    if (rejectIfUnauthorized(await authorizeCourse(req), res)) return
    try {
      const rows = await quizzes.listByCourse(req.params.courseId)
      res.status(200).json(rows)
    } catch (err) {
      console.error('list quizzes failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  // QTI-22-IMPORT: format-checked before a row is ever created. A failing
  // upload returns every structural error found (line/element-level, per
  // the DoD), not just the first — a trainer fixing a file one round trip
  // at a time is a worse experience than seeing everything wrong at once.
  // QUIZ-PACKAGE-STORAGE-001: the same input now also accepts a `.zip`
  // package, validated and stored as one row per file (ADR-0010).
  router.post('/api/courses/:courseId/quizzes', sessionMiddleware, upload.single('file'), async (req, res) => {
    if (rejectIfUnauthorized(await authorizeCourse(req), res)) return
    if (!req.file) {
      res.status(400).json({ error: 'missing_file' })
      return
    }

    const prepared = prepareUpload(req.file)
    if (!prepared.ok) {
      res.status(400).json({ error: 'invalid_format', errors: prepared.errors })
      return
    }

    try {
      const created = await quizzes.create({
        courseId: req.params.courseId,
        title: prepared.upload.title,
        fileName: req.file.originalname,
        files: prepared.upload.files,
      })
      res.status(201).json(created)
    } catch (err) {
      console.error('create quiz failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  router.delete('/api/courses/:courseId/quizzes/:quizId', sessionMiddleware, async (req, res) => {
    if (rejectIfUnauthorized(await authorizeCourse(req), res)) return
    try {
      const deleted = await quizzes.delete(req.params.quizId, req.params.courseId)
      if (!deleted) {
        res.status(404).json({ error: 'quiz_not_found' })
        return
      }
      res.status(204).end()
    } catch (err) {
      console.error('delete quiz failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  router.put('/api/courses/:courseId/quizzes/:quizId/file', sessionMiddleware, upload.single('file'), async (req, res) => {
    if (rejectIfUnauthorized(await authorizeCourse(req), res)) return
    if (!req.file) {
      res.status(400).json({ error: 'missing_file' })
      return
    }
    // Mirrors QUIZ-DASHBOARD-001's original "replace has no format
    // validation" choice: still true, but the file is now a package as
    // well, so it still has to be split into files that make sense in the
    // `quiz_files` shape. A bare (non-zip) replacement is stored as a
    // 1-row package like a standalone create; a `.zip` is unzipped without
    // running validateQtiPackage's structural checks, matching PUT's
    // pre-existing "no validation" contract for replace.
    const files: NewQuizFile[] = isZipUpload(req.file.originalname)
      ? unpackWithoutValidation(req.file.buffer)
      : [{ relativePath: req.file.originalname, fileData: req.file.buffer, mimeType: 'application/xml' }]

    try {
      const updated = await quizzes.replaceFile(req.params.quizId, req.params.courseId, {
        fileName: req.file.originalname,
        files,
      })
      if (!updated) {
        res.status(404).json({ error: 'quiz_not_found' })
        return
      }
      res.status(200).json(updated)
    } catch (err) {
      console.error('replace quiz file failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  return router
}

// Best-effort unzip for PUT's unvalidated replace path — if the zip can't
// even be opened, fall back to storing it as a single opaque file rather
// than failing a route that has never format-validated its input.
function unpackWithoutValidation(buffer: Buffer): NewQuizFile[] {
  try {
    const entries = extractZipEntries(buffer)
    if (entries.length > 0) {
      return entries.map((f) => ({ relativePath: f.relativePath, fileData: f.content, mimeType: guessMimeType(f.relativePath) }))
    }
  } catch {
    // not a valid zip — fall through
  }
  return [{ relativePath: 'upload.zip', fileData: buffer, mimeType: 'application/zip' }]
}
