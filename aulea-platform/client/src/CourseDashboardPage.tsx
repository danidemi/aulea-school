import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import AppHeader from './components/AppHeader'
import Breadcrumb from './components/Breadcrumb'
import { Button } from './components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './components/ui/table'
import { Card } from './components/ui/card'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import { useSignedInUser } from './lib/session'

interface Course {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

type SortBy = 'title' | 'createdAt' | 'updatedAt'
type SortDirection = 'asc' | 'desc'

const COLUMNS: { value: SortBy; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'createdAt', label: 'Created' },
  { value: 'updatedAt', label: 'Last updated' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString()
}

function compareCourses(a: Course, b: Course, column: SortBy, direction: SortDirection) {
  const result = a[column].localeCompare(b[column])
  return direction === 'asc' ? result : -result
}

/**
 * `/courses` (COURSE-001): lists the signed-in trainer's tenant's
 * courses, with a "+ New course" action. No edit/delete/upload — out of
 * scope per the DoD; those are future stories' jobs.
 *
 * Sorting is column-header click-to-sort, computed client-side over the
 * already-loaded (unpaginated) course list: clicking a header cycles
 * ascending → descending → unsorted, with an arrow marking the active
 * column's direction. Unsorted falls back to whatever order `GET
 * /api/courses` returns (its own default, title ascending) — reworked at
 * sprint review (2026-08-23) to replace an earlier "Sort by" dropdown.
 *
 * Clicking a course row navigates directly to that course's detail page
 * (`/courses/:courseId`, COURSE-DETAIL-001) — decided at that story's
 * grooming (2026-08-23) to remove the earlier in-memory "selected
 * course" state and "View quizzes" link this page used to have. Nothing
 * is ever "selected" on this page any more, so the shared `Breadcrumb`
 * (BUG-BREADCRUMB-NAV) just shows `Courses`, with no placeholder segment.
 */
function CourseDashboardPage() {
  const { user, logout } = useSignedInUser()
  const [courses, setCourses] = useState<Course[] | null>(null)
  const [sortColumn, setSortColumn] = useState<SortBy | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)

  const loadCourses = useCallback(async () => {
    const response = await fetch('/api/courses')
    if (response.status === 200) {
      setCourses(await response.json())
      setLoadError(false)
    } else {
      setCourses([])
      setLoadError(true)
    }
  }, [])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  const sortedCourses = useMemo(() => {
    if (courses === null || sortColumn === null) return courses
    return [...courses].sort((a, b) => compareCourses(a, b, sortColumn, sortDirection))
  }, [courses, sortColumn, sortDirection])

  function handleHeaderClick(column: SortBy) {
    if (sortColumn !== column) {
      setSortColumn(column)
      setSortDirection('asc')
      return
    }
    if (sortDirection === 'asc') {
      setSortDirection('desc')
      return
    }
    setSortColumn(null)
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setCreateError(null)
    const response = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    })
    if (response.status === 201) {
      setShowCreateForm(false)
      setNewTitle('')
      await loadCourses()
      return
    }
    const body = await response.json()
    setCreateError(
      body.error === 'title_taken'
        ? 'A course with this name already exists in your tenant.'
        : 'Could not create the course. Check the name and try again.',
    )
  }

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
            to view your courses.
          </p>
        ) : (
          <div className="flex flex-col gap-group-gap">
            <div className="flex items-center justify-between gap-group-gap">
              <Button type="button" onClick={() => setShowCreateForm(true)}>
                + New course
              </Button>
            </div>

            {loadError && <p className="text-sm text-error">Could not load your courses. Try reloading the page.</p>}

            {sortedCourses === null ? (
              <p className="text-ink/70">Loading your courses…</p>
            ) : sortedCourses.length === 0 ? (
              <p className="text-ink/70">No courses yet — create one to get started.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {COLUMNS.map((column) => (
                      <TableHead key={column.value}>
                        <button
                          type="button"
                          onClick={() => handleHeaderClick(column.value)}
                          className="flex items-center gap-1 font-medium hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
                        >
                          {column.label}
                          {sortColumn === column.value && (
                            <span aria-hidden="true">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </button>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCourses.map((course) => (
                    <TableRow
                      key={course.id}
                      onClick={() => window.location.assign(`/courses/${course.id}`)}
                      className="cursor-pointer hover:bg-brass-50"
                    >
                      <TableCell className="text-ink">{course.title}</TableCell>
                      <TableCell className="text-ink/70">{formatDate(course.createdAt)}</TableCell>
                      <TableCell className="text-ink/70">{formatDate(course.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </main>

      {showCreateForm && (
        <div role="dialog" aria-modal="true" aria-labelledby="new-course-title" className="fixed inset-0 flex items-center justify-center bg-ink/40 px-6">
          <Card className="w-full max-w-sm">
            <h2 id="new-course-title" className="mb-group-gap font-display text-xl font-semibold text-ink">
              New course
            </h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-group-gap">
              <div>
                <Label htmlFor="course-name">Course name</Label>
                <Input id="course-name" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} required />
              </div>
              {createError && <p className="text-sm text-error">{createError}</p>}
              <div className="flex gap-group-gap">
                <Button type="submit">Create</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false)
                    setCreateError(null)
                    setNewTitle('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

export default CourseDashboardPage
