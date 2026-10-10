import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import AppHeader from './components/AppHeader'
import Breadcrumb from './components/Breadcrumb'
import QuizzesSection from './components/QuizzesSection'
import { useSignedInUser } from './lib/session'

/**
 * `/courses/:courseId` (COURSE-DETAIL-001): the "one consistent place"
 * for everything belonging to a selected course. Shows the shared
 * `Breadcrumb` (BUG-BREADCRUMB-NAV, `Courses > <course name>`) and the
 * course's quizzes as one section (`QuizzesSection`, extracted from the
 * former standalone `QuizDashboardPage`) — didactic materials and other
 * components are future sections, per this story's own scope.
 *
 * Reached by a direct click on a `CourseDashboardPage` row (no
 * intermediate "selected course" state there any more, per this story's
 * grooming decision) — the course id travels via the route param only,
 * same as before.
 */
function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user, logout } = useSignedInUser()
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!courseId) return
    let cancelled = false
    fetch(`/api/courses/${courseId}`).then((response) => {
      if (!cancelled) setLoadError(response.status !== 200)
    })
    return () => {
      cancelled = true
    }
  }, [courseId])

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <AppHeader user={user} onLogout={logout} />

      <Breadcrumb />

      <main className="flex-1 px-6 py-section-gap">
        {!user ? (
          <p className="text-ink/70">
            <a href="/login" className="text-ink underline underline-offset-2 hover:text-brass">
              Sign in
            </a>{' '}
            to view this course.
          </p>
        ) : loadError ? (
          <p className="text-sm text-error">Could not load this course. Try reloading the page.</p>
        ) : (
          <div className="flex flex-col gap-section-gap">
            {courseId && <QuizzesSection courseId={courseId} />}
          </div>
        )}
      </main>
    </div>
  )
}

export default CourseDetailPage
