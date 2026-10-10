import { and, eq } from 'drizzle-orm'
import { createDb } from './client.js'
import { quizSessionAnswers } from './schema.js'

export type GradingStatus = 'pending' | 'ungraded' | 'graded'

export interface QuizSessionAnswer {
  id: string
  connectionId: string
  itemIdentifier: string
  itemPath: string
  responses: unknown
  gradingStatus: GradingStatus
  maxScore: number
  score: number | null
}

export interface NewQuizSessionAnswer {
  connectionId: string
  itemIdentifier: string
  itemPath: string
  responses: unknown
  gradingStatus: GradingStatus
  maxScore: number
}

const SELECT_COLUMNS = {
  id: quizSessionAnswers.id,
  connectionId: quizSessionAnswers.connectionId,
  itemIdentifier: quizSessionAnswers.itemIdentifier,
  itemPath: quizSessionAnswers.itemPath,
  responses: quizSessionAnswers.responses,
  gradingStatus: quizSessionAnswers.gradingStatus,
  maxScore: quizSessionAnswers.maxScore,
  score: quizSessionAnswers.score,
}

/**
 * QUIZ-TAKE-RENDER-001 owns this table's shape (`create`) —
 * QUIZ-AUTO-EVAL-001 only ever reads a connection's rows and transitions a
 * `'pending'` one to `'graded'` (`markGraded`), never creating a row or
 * altering a column.
 */
export interface QuizSessionAnswerRepository {
  create(answer: NewQuizSessionAnswer): Promise<QuizSessionAnswer>
  listForConnection(connectionId: string): Promise<QuizSessionAnswer[]>
  markGraded(id: string, score: number): Promise<void>
}

export function createQuizSessionAnswerRepository(databaseUrl: string): QuizSessionAnswerRepository {
  const { db } = createDb(databaseUrl)

  return {
    async create(answer) {
      const rows = await db
        .insert(quizSessionAnswers)
        .values({
          connectionId: answer.connectionId,
          itemIdentifier: answer.itemIdentifier,
          itemPath: answer.itemPath,
          responses: answer.responses,
          gradingStatus: answer.gradingStatus,
          maxScore: answer.maxScore,
        })
        .returning(SELECT_COLUMNS)
      return rows[0] as QuizSessionAnswer
    },

    async listForConnection(connectionId) {
      const rows = await db.select(SELECT_COLUMNS).from(quizSessionAnswers).where(eq(quizSessionAnswers.connectionId, connectionId))
      return rows as QuizSessionAnswer[]
    },

    async markGraded(id, score) {
      await db
        .update(quizSessionAnswers)
        .set({ score, gradingStatus: 'graded' })
        .where(and(eq(quizSessionAnswers.id, id), eq(quizSessionAnswers.gradingStatus, 'pending')))
    },
  }
}
