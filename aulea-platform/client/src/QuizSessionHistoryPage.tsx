import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import AppHeader from './components/AppHeader'
import Breadcrumb from './components/Breadcrumb'
import { Button } from './components/ui/button'
import { Checkbox } from './components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from './components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './components/ui/table'
import { useSignedInUser } from './lib/session'

type SessionStatus = 'closed' | 'running' | 'stopped'

interface QuizSessionSummary {
  id: string
  status: SessionStatus
  startedAt: string | null
  stoppedAt: string | null
  joinedCount: number
  submittedCount: number
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString()
}

/**
 * `/quizzes/:quizId/sessions` (QUIZ-SESSION-HISTORY-001): every session
 * ever created for one quiz, newest first, each row linking to its
 * existing `QuizSessionMonitorPage` — no new per-session UI, no
 * editing/deleting past sessions, no cross-session aggregate reporting
 * (see the story's grooming notes for what's explicitly out of scope).
 * SESSION-DELETE-001 adds a checkbox column and a "Delete selected"
 * button; a `running` session cannot be selected.
 *
 * Reached from `QuizzesSection`'s new "Sessions" action per quiz row.
 */
function QuizSessionHistoryPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const { user, logout } = useSignedInUser()
  const [sessions, setSessions] = useState<QuizSessionSummary[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [reloadCount, setReloadCount] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [counts, setCounts] = useState<{ sessionCount: number; answerCount: number } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!quizId) return
    let cancelled = false
    fetch(`/api/quizzes/${quizId}/sessions`).then(async (response) => {
      if (cancelled) return
      if (response.status === 200) {
        setSessions(await response.json())
        setLoadError(false)
      } else {
        setSessions(null)
        setLoadError(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [quizId, reloadCount])

  function toggle(sessionId: string, checked: boolean) {
    setSelected((current) => (checked ? [...current, sessionId] : current.filter((id) => id !== sessionId)))
  }

  function postDelete(dryRun: boolean) {
    return fetch(`/api/quizzes/${quizId}/sessions/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionIds: selected, dryRun }),
    })
  }

  async function openDeleteDialog() {
    setDeleteError(null)
    setCounts(null)
    setDialogOpen(true)
    const response = await postDelete(true)
    if (response.status === 200) {
      setCounts(await response.json())
    } else {
      setDeleteError('Could not prepare the deletion. Reload the page and try again.')
    }
  }

  async function confirmDelete() {
    const response = await postDelete(false)
    if (response.status === 200) {
      setDialogOpen(false)
      setSelected([])
      setReloadCount((n) => n + 1)
    } else {
      setDeleteError('Could not delete the selected sessions. Reload the page and try again.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <AppHeader user={user} onLogout={logout} />

      <Breadcrumb />

      <main className="flex-1 px-6 py-section-gap">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-ink">Sessions</h1>
          {user && sessions && sessions.length > 0 && (
            <Button variant="outline" size="sm" disabled={selected.length === 0} onClick={openDeleteDialog}>
              Delete selected
            </Button>
          )}
        </div>

        {!user ? (
          <p className="text-ink/70">
            <a href="/login" className="text-ink underline underline-offset-2 hover:text-brass">
              Sign in
            </a>{' '}
            to view this quiz&apos;s sessions.
          </p>
        ) : loadError ? (
          <p className="text-sm text-error">Could not load the sessions for this quiz. Try reloading the page.</p>
        ) : sessions === null ? (
          <p className="text-ink/70">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <p className="text-ink/70">No sessions yet for this quiz.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Stopped</TableHead>
                <TableHead>Joined / Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id} className="cursor-pointer hover:bg-brass-50" onClick={() => window.location.assign(`/quiz-sessions/${session.id}`)}>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      aria-label={`Select session ${session.id}`}
                      disabled={session.status === 'running'}
                      checked={selected.includes(session.id)}
                      onCheckedChange={(checked) => toggle(session.id, checked === true)}
                    />
                  </TableCell>
                  <TableCell className="text-ink">{session.status}</TableCell>
                  <TableCell className="text-ink/70">{session.startedAt ? formatDateTime(session.startedAt) : 'not started yet'}</TableCell>
                  <TableCell className="text-ink/70">{session.stoppedAt ? formatDateTime(session.stoppedAt) : '—'}</TableCell>
                  <TableCell className="text-ink/70">
                    {session.joinedCount} / {session.submittedCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogTitle>Delete sessions</DialogTitle>
          <DialogDescription>
            {counts
              ? `This permanently deletes ${counts.sessionCount} ${counts.sessionCount === 1 ? 'session' : 'sessions'} and ${counts.answerCount} ${counts.answerCount === 1 ? 'answer' : 'answers'} from all their connections. This cannot be undone.`
              : deleteError ?? 'Counting what will be deleted…'}
          </DialogDescription>
          {counts && deleteError && <p className="mt-2 text-sm text-error">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!counts} onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default QuizSessionHistoryPage
