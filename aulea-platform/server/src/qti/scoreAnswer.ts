import { parseQtiXml, createItemSession } from '@longsightgroup/qti3-core'
import type { QtiValue } from '@longsightgroup/qti3-core'

/**
 * QUIZ-AUTO-EVAL-001: authoritative server-side scoring for a
 * `qti-choice-interaction` answer, per the spike's §5 finding — no
 * hand-written matching against `qti-correct-response` needed.
 * `responses` is a `quiz_session_answers.responses` value: the raw
 * `responses` record qti3's `serialize()` produces (e.g.
 * `{ RESPONSE: "choice_b" }` or `{ RESPONSE: ["choice_a", "choice_c"] }`),
 * keyed by the item's own response identifier — not assumed to be
 * `"RESPONSE"` literally, though every fixture in this repo uses that name.
 * Returns `0` for anything that fails to parse or has no interaction to
 * score against, rather than throwing — a malformed stored row should
 * never abort scoring the rest of a connection's answers.
 */
export function scoreChoiceAnswer(itemXml: string, responses: unknown): number {
  const parsed = parseQtiXml(itemXml)
  if (!parsed.document) return 0

  const interaction = parsed.document.item.interactions[0]
  const responseIdentifier = interaction?.responseIdentifier
  if (!responseIdentifier) return 0

  const session = createItemSession(parsed.document)
  if (responses && typeof responses === 'object') {
    const value = (responses as Record<string, unknown>)[responseIdentifier]
    if (value !== undefined && value !== null) {
      session.respond(responseIdentifier, value as QtiValue)
    }
  }

  const score = session.score().outcomes.SCORE
  return typeof score === 'number' ? score : 0
}
