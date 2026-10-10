import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App'
import SignUpPage from './SignUpPage'
import LoginPage from './LoginPage'
import CourseDashboardPage from './CourseDashboardPage'
import CourseDetailPage from './CourseDetailPage'
import QuizSessionMonitorPage from './QuizSessionMonitorPage'
import QuizSessionTakePage from './QuizSessionTakePage'
import QuizSessionHistoryPage from './QuizSessionHistoryPage'

// Router + route table live here, not in App.tsx, so App.tsx keeps
// rendering standalone (no <Router> ancestor needed) for App.test.tsx —
// decided during SIGNUP-EXPEDITE-001 development, see ADR-0004.
//
// `/confirm-result` is retired (AUTH-UX-001): `GET /api/confirm` now
// redirects to `/?status=...` and the home page (App.tsx) renders the
// outcome as a dismissible banner instead.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/courses" element={<CourseDashboardPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/quizzes/:quizId/sessions" element={<QuizSessionHistoryPage />} />
        <Route path="/quiz-sessions/:sessionId" element={<QuizSessionMonitorPage />} />
        <Route path="/quiz-sessions/:sessionId/take" element={<QuizSessionTakePage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
