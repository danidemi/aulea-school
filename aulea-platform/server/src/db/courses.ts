import { and, asc, eq } from 'drizzle-orm'
import { createDb } from './client.js'
import { courses } from './schema.js'

export interface Course {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}

export interface NewCourse {
  tenantId: string
  title: string
}

export type CourseSort = 'title' | 'createdAt' | 'updatedAt'

/**
 * COURSE-001: tenant-scoped course list, sort, and create — no edit or
 * delete yet (out of scope, see the story's DoD).
 */
export interface CourseRepository {
  listByTenant(tenantId: string, sortBy: CourseSort): Promise<Course[]>
  create(course: NewCourse): Promise<Course>
  // QUIZ-DASHBOARD-001: authorizes a course-scoped request (list/delete/
  // replace a quiz) — returns null if the course doesn't exist *or*
  // belongs to a different tenant, the same "not found" either way so a
  // caller can't distinguish "wrong tenant" from "no such course".
  findByIdForTenant(courseId: string, tenantId: string): Promise<Course | null>
}

const SORT_COLUMN = {
  title: courses.title,
  createdAt: courses.createdAt,
  updatedAt: courses.updatedAt,
} as const

export function createCourseRepository(databaseUrl: string): CourseRepository {
  const { db } = createDb(databaseUrl)

  return {
    async listByTenant(tenantId, sortBy) {
      return db
        .select({ id: courses.id, title: courses.title, createdAt: courses.createdAt, updatedAt: courses.updatedAt })
        .from(courses)
        .where(eq(courses.tenantId, tenantId))
        .orderBy(asc(SORT_COLUMN[sortBy]))
    },

    async create(course) {
      const rows = await db
        .insert(courses)
        .values({ tenantId: course.tenantId, title: course.title })
        .returning({ id: courses.id, title: courses.title, createdAt: courses.createdAt, updatedAt: courses.updatedAt })
      return rows[0]
    },

    async findByIdForTenant(courseId, tenantId) {
      const rows = await db
        .select({ id: courses.id, title: courses.title, createdAt: courses.createdAt, updatedAt: courses.updatedAt })
        .from(courses)
        .where(and(eq(courses.id, courseId), eq(courses.tenantId, tenantId)))
        .limit(1)
      return rows[0] ?? null
    },
  }
}
