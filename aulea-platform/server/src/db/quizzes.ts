import { and, eq } from 'drizzle-orm'
import { createDb } from './client.js'
import { quizzes, quizFiles, courses } from './schema.js'

export interface Quiz {
  id: string
  title: string
  fileName: string
  status: string
  createdAt: Date
  updatedAt: Date
}

/**
 * QUIZ-PACKAGE-STORAGE-001/ADR-0010: one file belonging to a package —
 * `mimeType` is optional, since not every caller (e.g. a bare single-item
 * legacy upload) has a meaningful one to give.
 */
export interface NewQuizFile {
  relativePath: string
  fileData: Buffer
  mimeType?: string | null
}

export interface QuizFile {
  id: string
  relativePath: string
  fileData: Buffer
  mimeType: string | null
}

export interface NewQuiz {
  courseId: string
  title: string
  fileName: string
  files: NewQuizFile[]
}

export interface QuizFileUpdate {
  fileName: string
  files: NewQuizFile[]
}

/** BUG-BREADCRUMB-NAV: enough to render `Courses > <course> > <quiz>`. */
export interface QuizWithCourse {
  id: string
  title: string
  courseId: string
  courseTitle: string
}

/**
 * QUIZ-DASHBOARD-001: list/delete/replace-file, all scoped to a course
 * (never global — `courses.findByIdForTenant` is what proves the caller's
 * tenant owns that course before any of these run, see
 * `server/src/routes/quizzes.ts`). `create` has no route of its own in
 * this story — QTI-22-IMPORT calls it after its own format validation
 * passes.
 *
 * QUIZ-PACKAGE-STORAGE-001/ADR-0010: every quiz is now backed by one or
 * more `quiz_files` rows instead of a single `fileData` column — `create`
 * and `replaceFile` write the quiz row and its files together (one
 * transaction, so a package is never left half-stored), and `getFiles`
 * reads them back, tenant-scoped the same way every other lookup here is.
 */
export interface QuizRepository {
  listByCourse(courseId: string): Promise<Quiz[]>
  create(quiz: NewQuiz): Promise<Quiz>
  delete(quizId: string, courseId: string): Promise<boolean>
  replaceFile(quizId: string, courseId: string, file: QuizFileUpdate): Promise<Quiz | null>
  getFiles(quizId: string, courseId: string): Promise<QuizFile[]>
  // QUIZ-TAKE-RENDER-001: no tenant — resolving a running session's item
  // XML for the anonymous take page has no course/tenant to scope by
  // (only a sessionId, itself already the student's only credential).
  getFilesByQuizId(quizId: string): Promise<QuizFile[]>
  // BUG-BREADCRUMB-NAV: bare quizId (no courseId in the URL), tenant-scoped
  // via the quiz's own course instead — same information-hiding rationale
  // as every other tenant-scoped lookup here (unknown id and cross-tenant
  // id both resolve to `null`).
  findByIdWithCourseForTenant(quizId: string, tenantId: string): Promise<QuizWithCourse | null>
}

const SELECT_COLUMNS = {
  id: quizzes.id,
  title: quizzes.title,
  fileName: quizzes.fileName,
  status: quizzes.status,
  createdAt: quizzes.createdAt,
  updatedAt: quizzes.updatedAt,
}

const FILE_SELECT_COLUMNS = {
  id: quizFiles.id,
  relativePath: quizFiles.relativePath,
  fileData: quizFiles.fileData,
  mimeType: quizFiles.mimeType,
}

function toFileRow(quizId: string, file: NewQuizFile) {
  return { quizId, relativePath: file.relativePath, fileData: file.fileData, mimeType: file.mimeType ?? null }
}

export function createQuizRepository(databaseUrl: string): QuizRepository {
  const { db } = createDb(databaseUrl)

  return {
    async listByCourse(courseId) {
      return db.select(SELECT_COLUMNS).from(quizzes).where(eq(quizzes.courseId, courseId))
    },

    async create(quiz) {
      return db.transaction(async (tx) => {
        const rows = await tx
          .insert(quizzes)
          .values({ courseId: quiz.courseId, title: quiz.title, fileName: quiz.fileName })
          .returning(SELECT_COLUMNS)
        const created = rows[0]
        if (quiz.files.length > 0) {
          await tx.insert(quizFiles).values(quiz.files.map((file) => toFileRow(created.id, file)))
        }
        return created
      })
    },

    async delete(quizId, courseId) {
      return db.transaction(async (tx) => {
        // Confirm this quiz belongs to the caller's course *before* touching
        // quiz_files — otherwise a malformed/foreign quizId would delete
        // another tenant's files with no quizzes row ever removed.
        const existing = await tx
          .select({ id: quizzes.id })
          .from(quizzes)
          .where(and(eq(quizzes.id, quizId), eq(quizzes.courseId, courseId)))
          .limit(1)
        if (existing.length === 0) return false
        // No FK cascade on quiz_files (same "no action" convention as
        // quiz_sessions) — children are deleted explicitly, before the
        // parent row, so the FK constraint never blocks this delete.
        await tx.delete(quizFiles).where(eq(quizFiles.quizId, quizId))
        await tx.delete(quizzes).where(eq(quizzes.id, quizId))
        return true
      })
    },

    async replaceFile(quizId, courseId, file) {
      return db.transaction(async (tx) => {
        const rows = await tx
          .update(quizzes)
          .set({ fileName: file.fileName, updatedAt: new Date() })
          .where(and(eq(quizzes.id, quizId), eq(quizzes.courseId, courseId)))
          .returning(SELECT_COLUMNS)
        const updated = rows[0]
        if (!updated) return null
        await tx.delete(quizFiles).where(eq(quizFiles.quizId, quizId))
        if (file.files.length > 0) {
          await tx.insert(quizFiles).values(file.files.map((f) => toFileRow(quizId, f)))
        }
        return updated
      })
    },

    async getFiles(quizId, courseId) {
      const rows = await db
        .select(FILE_SELECT_COLUMNS)
        .from(quizFiles)
        .innerJoin(quizzes, eq(quizFiles.quizId, quizzes.id))
        .where(and(eq(quizFiles.quizId, quizId), eq(quizzes.courseId, courseId)))
      return rows
    },

    async getFilesByQuizId(quizId) {
      return db.select(FILE_SELECT_COLUMNS).from(quizFiles).where(eq(quizFiles.quizId, quizId))
    },

    async findByIdWithCourseForTenant(quizId, tenantId) {
      const rows = await db
        .select({ id: quizzes.id, title: quizzes.title, courseId: quizzes.courseId, courseTitle: courses.title })
        .from(quizzes)
        .innerJoin(courses, eq(quizzes.courseId, courses.id))
        .where(and(eq(quizzes.id, quizId), eq(courses.tenantId, tenantId)))
        .limit(1)
      return rows[0] ?? null
    },
  }
}
