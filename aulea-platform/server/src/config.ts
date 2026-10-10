/**
 * The base URL for links meant to leave the browser/server and be opened
 * elsewhere — originally SIGN-UP-001's confirmation-link emails
 * (`{APP_BASE_URL}/api/confirm?token=...`), now also
 * QUIZ-SESSION-CONTROL-001's student-facing session URL (a QR code scanned
 * by a different device, which can't resolve a browser's own
 * `window.location.origin`). Deliberately not derived from request
 * context — decided during SIGN-UP-001's sprint planning (2026-08-21),
 * reaffirmed for the QR code case at QUIZ-SESSION-CONTROL-001's sprint
 * planning (2026-08-23, ADR-0008 revision).
 *
 * Read per-call, not captured at module load, so a test can set it
 * per-case.
 */
export function appBaseUrl(): string {
  return process.env.APP_BASE_URL ?? 'http://localhost:3000'
}
