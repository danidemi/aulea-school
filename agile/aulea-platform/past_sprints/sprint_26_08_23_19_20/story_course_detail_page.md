ID: COURSE-DETAIL-001

As:
a `trainer`

I want to:
click a course in the courses list and land on a course detail page for it, showing that
course's components (quizzes now; more later)

So that:
there is one consistent place to work on everything belonging to a selected course

Definition of Done:
* clicking a course row navigates directly to a course detail page (no intermediate
  "selected course" state or "View quizzes" link on the list page itself)
* breadcrumb reads `Courses > <selected course name>`; the courses list page's own breadcrumb
  goes back to always reading `Courses > (no course selected)`
* the detail page shows the course's quizzes (QUIZ-DASHBOARD-001's UI) as one section

Implemented (sprint, 2026-08-23):
* `server/src/routes/courses.ts` gained `GET /api/courses/:courseId`; `QuizDashboardPage.tsx`'s
  logic moved unchanged into `client/src/components/QuizzesSection.tsx` (courseId as a prop);
  new `client/src/CourseDetailPage.tsx` at `/courses/:courseId`; `CourseDashboardPage.tsx` lost
  its selection state/highlighting/"View quizzes" link, a row click is now a plain navigation
* 89/89 server tests, 50/50 client tests; both builds clean
* manual verification: two courses each scoped their own quiz list correctly
* discovered, not fixed here (scoped into its own story, ROUTE-ID-GUARD-001): a malformed
  course id in `quizzes.ts`'s `authorizeCourse` (no try/catch) crashes the whole server
  process — pre-existing, not introduced by this story; this story's own new
  `GET /api/courses/:courseId` route already guards correctly
