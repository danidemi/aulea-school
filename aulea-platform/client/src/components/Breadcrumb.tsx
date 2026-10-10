import { useEffect, useState } from 'react'
import { useLocation, matchPath } from 'react-router-dom'

interface BreadcrumbSegment {
  label: string
  href?: string
}

interface CourseInfo {
  title: string
}

interface QuizInfo {
  title: string
  courseId: string
  courseTitle: string
}

interface SessionInfo {
  quizId: string
  startedAt: string | null
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString()
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url)
  return response.status === 200 ? ((await response.json()) as T) : null
}

const COURSES_PATH = '/courses'
const COURSE_DETAIL_PATH = '/courses/:courseId'
const QUIZ_SESSIONS_PATH = '/quizzes/:quizId/sessions'
const QUIZ_SESSION_PATH = '/quiz-sessions/:sessionId'

async function buildSegments(pathname: string): Promise<BreadcrumbSegment[]> {
  if (matchPath(COURSES_PATH, pathname)) {
    return [{ label: 'Courses' }]
  }

  const courseMatch = matchPath(COURSE_DETAIL_PATH, pathname)
  if (courseMatch) {
    const course = await fetchJson<CourseInfo>(`/api/courses/${courseMatch.params.courseId}`)
    return [{ label: 'Courses', href: COURSES_PATH }, { label: course?.title ?? '…' }]
  }

  const sessionsMatch = matchPath(QUIZ_SESSIONS_PATH, pathname)
  if (sessionsMatch) {
    const quiz = await fetchJson<QuizInfo>(`/api/quizzes/${sessionsMatch.params.quizId}`)
    if (!quiz) return [{ label: 'Courses', href: COURSES_PATH }]
    return [
      { label: 'Courses', href: COURSES_PATH },
      { label: quiz.courseTitle, href: `/courses/${quiz.courseId}` },
      { label: quiz.title },
    ]
  }

  const sessionMatch = matchPath(QUIZ_SESSION_PATH, pathname)
  if (sessionMatch) {
    const session = await fetchJson<SessionInfo>(`/api/quiz-sessions/${sessionMatch.params.sessionId}`)
    if (!session) return [{ label: 'Courses', href: COURSES_PATH }]
    const quiz = await fetchJson<QuizInfo>(`/api/quizzes/${session.quizId}`)
    if (!quiz) return [{ label: 'Courses', href: COURSES_PATH }]
    return [
      { label: 'Courses', href: COURSES_PATH },
      { label: quiz.courseTitle, href: `/courses/${quiz.courseId}` },
      { label: quiz.title, href: `/quizzes/${session.quizId}/sessions` },
      { label: session.startedAt ? formatDateTime(session.startedAt) : 'Not started' },
    ]
  }

  return []
}

/**
 * BUG-BREADCRUMB-NAV: one shared, route-driven breadcrumb — matches the
 * current path against a small ordered config (`matchPath`, not
 * `useMatches`: `main.tsx` uses a plain `<BrowserRouter>`/`<Routes>`
 * table, not a data router) and fetches whatever that route needs to
 * label its own trail, so no page duplicates this logic.
 */
function Breadcrumb() {
  const location = useLocation()
  const [segments, setSegments] = useState<BreadcrumbSegment[]>([])

  useEffect(() => {
    let cancelled = false
    buildSegments(location.pathname).then((result) => {
      if (!cancelled) setSegments(result)
    })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  if (segments.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="border-b border-border px-6 py-3 text-sm text-ink/70">
      {segments.map((segment, index) => (
        <span key={index}>
          {index > 0 && <span aria-hidden="true"> &gt; </span>}
          {segment.href ? (
            <a href={segment.href} className="text-ink underline underline-offset-2 hover:text-brass">
              {segment.label}
            </a>
          ) : (
            segment.label
          )}
        </span>
      ))}
    </nav>
  )
}

export default Breadcrumb
