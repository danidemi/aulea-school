import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from './ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table'

interface Quiz {
  id: string
  title: string
  fileName: string
  status: string
  createdAt: string
  updatedAt: string
}

interface QtiValidationError {
  line: number
  message: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString()
}

/**
 * The quizzes section of a course detail page (QUIZ-DASHBOARD-001, plus
 * the "Upload quiz" action from QTI-22-IMPORT/QTI3-MIGRATION-001): lists
 * the quizzes belonging to one course, with upload (format-validated
 * server-side), delete, and replace-file (not format-validated — see
 * `quizzes.ts`'s comment).
 *
 * Extracted from the former standalone `QuizDashboardPage`
 * (`/courses/:courseId/quizzes`) by COURSE-DETAIL-001, so it can be
 * rendered as one section of `CourseDetailPage` instead of an entire
 * page — takes `courseId` as a prop instead of reading it via
 * `useParams` itself, so it has no route/router dependency of its own.
 *
 * Also the entry point for QUIZ-SESSION-CONTROL-001's "create a quiz
 * session" action (per quiz row) — navigates straight to the new
 * session's Quiz Session Monitor page, same direct-navigation pattern
 * `CourseDashboardPage` already uses for its own rows. QUIZ-SESSION-
 * HISTORY-001 adds a "Sessions" action alongside it, to reach any past
 * session again via `QuizSessionHistoryPage` — always shown, even with
 * zero sessions yet (that page renders its own empty state).
 */
function QuizzesSection({ courseId }: { courseId: string }) {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [uploadErrors, setUploadErrors] = useState<QtiValidationError[] | null>(null)
  const replaceInputRef = useRef<HTMLInputElement | null>(null)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [replacingQuizId, setReplacingQuizId] = useState<string | null>(null)

  const loadQuizzes = useCallback(async () => {
    const response = await fetch(`/api/courses/${courseId}/quizzes`)
    if (response.status === 200) {
      setQuizzes(await response.json())
      setLoadError(false)
    } else {
      setQuizzes([])
      setLoadError(true)
    }
  }, [courseId])

  useEffect(() => {
    loadQuizzes()
  }, [loadQuizzes])

  async function handleDelete(quizId: string) {
    setActionError(null)
    const response = await fetch(`/api/courses/${courseId}/quizzes/${quizId}`, { method: 'DELETE' })
    if (response.status === 204) {
      await loadQuizzes()
    } else {
      setActionError('Could not delete the quiz. Try again.')
    }
  }

  async function handleUploadFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setActionError(null)
    setUploadErrors(null)
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`/api/courses/${courseId}/quizzes`, { method: 'POST', body: formData })
    if (response.status === 201) {
      await loadQuizzes()
      return
    }
    const body = await response.json()
    if (response.status === 400 && body.error === 'invalid_format') {
      setUploadErrors(body.errors)
    } else {
      setActionError('Could not upload the quiz. Try again.')
    }
  }

  function startReplace(quizId: string) {
    setReplacingQuizId(quizId)
    replaceInputRef.current?.click()
  }

  async function handleCreateSession(quizId: string) {
    setActionError(null)
    const response = await fetch(`/api/quizzes/${quizId}/sessions`, { method: 'POST' })
    if (response.status === 201) {
      const created = await response.json()
      window.location.assign(`/quiz-sessions/${created.id}`)
    } else {
      setActionError('Could not create a quiz session. Try again.')
    }
  }

  async function handleReplaceFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    const quizId = replacingQuizId
    event.target.value = ''
    setReplacingQuizId(null)
    if (!file || !quizId) return

    setActionError(null)
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`/api/courses/${courseId}/quizzes/${quizId}/file`, { method: 'PUT', body: formData })
    if (response.status === 200) {
      await loadQuizzes()
    } else {
      setActionError('Could not replace the file. Try again.')
    }
  }

  return (
    <div className="flex flex-col gap-group-gap">
      <input ref={replaceInputRef} type="file" className="hidden" onChange={handleReplaceFileChosen} data-testid="replace-file-input" />
      <input ref={uploadInputRef} type="file" className="hidden" onChange={handleUploadFileChosen} data-testid="upload-file-input" />

      <div>
        <Button type="button" onClick={() => uploadInputRef.current?.click()}>
          Upload quiz
        </Button>
      </div>

      {loadError && <p className="text-sm text-error">Could not load the quizzes for this course. Try reloading the page.</p>}
      {actionError && <p className="text-sm text-error">{actionError}</p>}
      {uploadErrors && (
        <div className="rounded border border-error/30 bg-error-50 px-4 py-3 text-sm text-error">
          <p className="font-medium">This file isn&apos;t valid QTI 3.0:</p>
          <ul className="mt-1 list-disc pl-5">
            {uploadErrors.map((err, index) => (
              <li key={index}>
                Line {err.line}: {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {quizzes === null ? (
        <p className="text-ink/70">Loading quizzes…</p>
      ) : quizzes.length === 0 ? (
        <p className="text-ink/70">No quizzes uploaded to this course yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quizzes.map((quiz) => (
              <TableRow key={quiz.id}>
                <TableCell className="text-ink">{quiz.title}</TableCell>
                <TableCell className="text-ink/70">{formatDate(quiz.createdAt)}</TableCell>
                <TableCell className="text-ink/70">{quiz.status}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => handleCreateSession(quiz.id)}>
                      Create session
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => window.location.assign(`/quizzes/${quiz.id}/sessions`)}>
                      Sessions
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => startReplace(quiz.id)}>
                      Replace file
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleDelete(quiz.id)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

export default QuizzesSection
