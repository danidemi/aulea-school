import { pgTable, uuid, text, timestamp, varchar, json, jsonb, integer, boolean, doublePrecision, index, uniqueIndex, customType } from 'drizzle-orm/pg-core'

/**
 * Postgres `bytea` — drizzle-orm/pg-core has no built-in binary column
 * type, so this is the minimal `customType` needed for it. Used by
 * `quizzes.fileData` (QUIZ-DASHBOARD-001/QTI-22-IMPORT): the raw QTI file
 * itself, not just a filename, per ADR-0002's "raw QTI files are stored in
 * PostgreSQL binary fields" decision.
 */
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea'
  },
})

/**
 * TENANT-001: the `tenants`/`users` schema ADR-0002 calls for. The columns
 * were originally sketched by DB-MIGRATIONS-001 ahead of TENANT-001 being
 * groomed; TENANT-001's own development confirmed this shape is enough —
 * one tenant per registered user (created lazily on first login, see
 * `server/src/db/tenants.ts`), not a multi-user-per-tenant membership
 * model. The DB-MIGRATIONS-001/ORM-SELECTION-001 spike table
 * (`spike_items`) that used to sit here is dropped as of this story's
 * migration — its job (prove the Drizzle+pg+Postgres path works) is done,
 * and this schema is now doing that job for real.
 */
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  // Nullable: a newly registered user is not associated to any tenant yet
  // (TENANT-001's "if I'm not associated to any tenant, create one").
  currentTenantId: uuid('current_tenant_id').references(() => tenants.id),
  // Nullable: Google-OAuth users (LOGIN-001) never set a password.
  // SIGNUP-EXPEDITE-001/SIGN-UP-001 set this on email/password sign-up.
  passwordHash: text('password_hash'),
  // Nullable: null until the account is confirmed. SIGNUP-EXPEDITE-001 sets
  // this immediately on signup; SIGN-UP-001 leaves it null until the
  // confirmation-link flow runs.
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * SIGN-UP-001: one row per confirmation-link email sent. Only the SHA-256
 * digest of the raw token is stored (`token_hash`) — the raw token lives
 * only in the emailed link, so a database leak alone doesn't yield usable
 * tokens (see `server/src/auth/tokens.ts`). `expires_at` is set 24h ahead
 * at creation; `used_at` is set once the link has been visited, so a
 * second visit is rejected as `status=used` rather than re-confirming.
 */
export const confirmationTokens = pgTable('confirmation_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * COURSE-001: courses belong to exactly one tenant from the start
 * (`tenant_id`, per ADR-0002's tenancy-before-courses decision) —
 * "all courses" in this story's DoD never means courses outside the
 * caller's tenant. `courses_tenant_id_title_unique` gives the DoD's
 * "two courses in the same tenant cannot share the same name" a
 * database-level guarantee (scoped to the tenant, not global — two
 * different tenants can both have a course named "Intro to Python").
 * `updatedAt` exists now even though this story never updates a course
 * after creation (no edit action in scope) — it's part of the DoD's own
 * sort criteria ("last update date"), so the column has to exist even
 * before anything sets it to something other than its creation value.
 */
export const courses = pgTable(
  'courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    title: text('title').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('courses_tenant_id_title_unique').on(table.tenantId, table.title)],
)

/**
 * QUIZ-DASHBOARD-001: quizzes belong to exactly one course (`course_id`,
 * per that story's dependency on COURSE-001 — "quizzes are scoped to a
 * current course"). `status` is a plain text label, not an enum — nothing
 * in either QUIZ-DASHBOARD-001 or QTI-22-IMPORT's DoD produces more than
 * one value yet (every stored row got there by passing QTI-22-IMPORT's
 * synchronous format check, so it's always "uploaded"); a real state
 * machine can replace this column's meaning later without a shape change.
 * No `create` route ships in QUIZ-DASHBOARD-001 itself — `QuizRepository
 * .create` exists for QTI-22-IMPORT to call (that story owns the only
 * user-facing way to add a quiz row: format-validated upload).
 *
 * QUIZ-PACKAGE-STORAGE-001/ADR-0010: `fileData` moved off this row and
 * onto `quizFiles` below (one row per file) — every quiz is now "a
 * package", a standalone single-item upload being a 1-row package with no
 * manifest, not a special case. `fileName` stays here as the trainer-facing
 * label (the originally uploaded file's name, `.zip` or bare `.xml`).
 */
export const quizzes = pgTable('quizzes', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id),
  title: text('title').notNull(),
  fileName: text('file_name').notNull(),
  status: text('status').notNull().default('uploaded'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * QUIZ-PACKAGE-STORAGE-001/ADR-0010: one row per file belonging to a
 * quiz's uploaded package — `imsmanifest.xml`, `test.xml`, and each
 * `items/item-NN.xml`, all tied to the same `quizzes` row via `quizId`.
 * No `tenantId` column here, same as `quizSessions`/`quizSessionConnections`
 * below — tenancy is proven by joining `quizId -> quizzes.courseId ->
 * courses.tenantId`, not denormalized onto this table.
 */
export const quizFiles = pgTable('quiz_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  quizId: uuid('quiz_id')
    .notNull()
    .references(() => quizzes.id),
  relativePath: text('relative_path').notNull(),
  fileData: bytea('file_data').notNull(),
  mimeType: text('mime_type'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * QUIZ-SESSION-CONTROL-001: an occurrence of a quiz being taken. A quiz
 * can have several sessions over time (a retake), all kept — this table
 * never overwrites a row for the "current" session the way, say, a
 * single-row-per-quiz design would.
 *
 * No `status` column on purpose (see `server/src/routes/quizSessions.ts`'s
 * `deriveStatus`) — `closed` / `running` / `stopped` is computed on every
 * read from `startedAt`/`closesAt`/`stoppedAt`, including the "auto-close
 * once `closesAt` has passed" case, so there's no separate background job
 * needed to flip a stored value at the deadline (consistent with
 * ADR-0009's "no new server infrastructure" reasoning for this feature).
 * Tenancy is proven by joining `quizId -> quizzes.courseId ->
 * courses.tenantId`, not a denormalized `tenantId` column here.
 */
export const quizSessions = pgTable('quiz_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  quizId: uuid('quiz_id')
    .notNull()
    .references(() => quizzes.id),
  // Nullable: a time limit is optional (the DoD's "optionally with a time
  // limit"). Set on start/reopen, not on creation.
  timeLimitSeconds: integer('time_limit_seconds'),
  // Nullable: unset while `closed`. Re-set (to "now") on every start,
  // including a reopen — a reopen is a full restart of the deadline, not
  // a resume of the old one.
  startedAt: timestamp('started_at', { withTimezone: true }),
  // Nullable: unset if no time limit was given at start/reopen time.
  // Computed as `startedAt + timeLimitSeconds` when a limit is set.
  closesAt: timestamp('closes_at', { withTimezone: true }),
  // Nullable: unset until an explicit Stop. Cleared again on reopen.
  stoppedAt: timestamp('stopped_at', { withTimezone: true }),
  // QUIZ-SESSION-PER-STUDENT-DELIVERY-001/ADR-0013: force-shuffle override,
  // set via `POST /start`'s body alongside `timeLimitSeconds`. `false`
  // (the default) means "honor each item/section's own authored `shuffle`
  // attribute"; `true` means "shuffle regardless of that attribute". See
  // `qti/deliveryOrder.ts` for how these combine with the authored XML.
  forceShuffleQuestions: boolean('force_shuffle_questions').notNull().default(false),
  forceShuffleAnswers: boolean('force_shuffle_answers').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * QUIZ-SESSION-LIVE-STATUS-001: one row per placeholder-page load — an
 * anonymous student's "join" signal, since no real student identity or
 * quiz-taking flow exists yet (the QR/URL target is a placeholder, per
 * QUIZ-SESSION-CONTROL-001). A page reload creates a second row, and
 * therefore counts as a second join — an accepted limitation of a
 * load-registers-presence model (see this story's Notes on why Block #2
 * says "joined", not "connected now"). No tenant/session check applies
 * to creating or updating a row here (`routes/quizSessions.ts`'s connect/
 * submit endpoints) — a student's phone has no login of any kind.
 */
export const quizSessionConnections = pgTable('quiz_session_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => quizSessions.id),
  connectedAt: timestamp('connected_at', { withTimezone: true }).defaultNow().notNull(),
  // Nullable: unset until the stub "submit" action is used. Nothing ever
  // resets this to null — reopening a session (QUIZ-SESSION-CONTROL-001)
  // never touches this table, which is exactly how "keeps accumulating
  // rather than resetting" is satisfied without extra logic.
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  // QUIZ-SESSION-PER-STUDENT-DELIVERY-001/ADR-0013: this connection's
  // persisted effective delivery order, generated lazily once on its first
  // items fetch (`qti/deliveryOrder.ts`), not re-derived per request. Null
  // until generated. `itemOrder` is an array of item identifiers (the
  // question order); `choiceOrder` maps an item identifier to its array of
  // choice identifiers, present only for items that were actually
  // shuffled. Both are written together, atomically, by
  // `ConnectionRepository.setOrderIfUnset` — see that method's doc comment
  // for why (a double-fired mount effect must not race two permutations).
  itemOrder: jsonb('item_order').$type<string[]>(),
  choiceOrder: jsonb('choice_order').$type<Record<string, string[]>>(),
})

/**
 * QUIZ-TAKE-RENDER-001: one row per answered (or skipped-unsupported) item
 * per attempt (`connectionId` — a new connection per attempt already, so
 * no separate "attempt" concept is needed here). `itemPath` is the item's
 * `quiz_files.relativePath`, not a `test.xml` item-ref href — a standalone
 * single-item quiz has no `test.xml` to derive one from, and this is what
 * lets QUIZ-AUTO-EVAL-001 re-fetch the same item's XML to score against
 * without this table's shape changing (that story only ever transitions
 * `gradingStatus`/`score`, per its own plan). `gradingStatus` is a plain
 * text column, not a Postgres enum: `'pending' | 'ungraded' | 'graded'`,
 * all three declared now even though this story only ever writes the
 * first two (see the interaction-type gate in `routes/quizSessions.ts`);
 * QUIZ-AUTO-EVAL-001 is the only story that ever writes `'graded'`,
 * needing no migration of its own since the value already exists here.
 * `maxScore` is `1` for a normal (`pending`) answer, `0` for an
 * `'ungraded'` one, so an unsupported item never inflates a connection's
 * scoring denominator. `score` stays null until QUIZ-AUTO-EVAL-001 sets
 * it. `responses` is nullable jsonb — null for an `'ungraded'` row (no
 * response was captured), otherwise the raw `responses.RESPONSE` shape
 * from qti3's `serialize()` (spike finding: its `outcomes` are always
 * unscored zeros, deliberately not persisted here).
 */
export const quizSessionAnswers = pgTable('quiz_session_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectionId: uuid('connection_id')
    .notNull()
    .references(() => quizSessionConnections.id),
  itemIdentifier: text('item_identifier').notNull(),
  itemPath: text('item_path').notNull(),
  responses: jsonb('responses'),
  gradingStatus: text('grading_status').notNull(),
  maxScore: doublePrecision('max_score').notNull(),
  score: doublePrecision('score'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * AUTH-UX-001 / ADR-0005: session store for `express-session`, managed by
 * `connect-pg-simple`. Column names/types (`sid`/`sess`/`expire`) and the
 * `expire` index match `connect-pg-simple`'s own expected schema exactly —
 * this table is created by this Drizzle migration instead of the library's
 * `createTableIfMissing` option, per ADR-0005 and the sprint's DON'T about
 * migrations happening outside the one applied-at-startup path
 * (`reference/do_and_donts.md`). `connect-pg-simple` is configured with
 * `createTableIfMissing: false` accordingly (`server/src/auth/session.ts`).
 */
export const sessions = pgTable(
  'session',
  {
    sid: varchar('sid').primaryKey(),
    sess: json('sess').notNull(),
    expire: timestamp('expire', { precision: 6 }).notNull(),
  },
  (table) => [index('IDX_session_expire').on(table.expire)],
)
