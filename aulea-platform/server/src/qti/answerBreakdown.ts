import { parseQtiXml } from '@longsightgroup/qti3-core'

export interface AnswerBucket {
  label: string
  count: number
  isCorrect: boolean
}

export interface ItemAnswerBreakdown {
  prompt: string | undefined
  buckets: AnswerBucket[]
  noAnswerCount: number
  respondentCount: number
}

function stringifyResponse(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function isCorrectMatch(candidate: string, correctResponse: unknown): boolean {
  if (correctResponse === undefined || correctResponse === null) return false
  if (Array.isArray(correctResponse)) return correctResponse.some((entry) => stringifyResponse(entry) === candidate)
  return stringifyResponse(correctResponse) === candidate
}

/**
 * QUIZ-CLASS-REVIEW-001: turns one item's XML plus every submitted
 * connection's raw response for it into the per-question answer
 * distribution the trainer sees. `responses` is one entry per submitted
 * connection — `undefined` when that connection has no
 * `quiz_session_answers` row at all for this item (abandoned partway).
 * A row whose stored `responses` can't yield a readable value for this
 * item's response identifier (e.g. an unsupported item, whose row always
 * stores `null` per QUIZ-TAKE-RENDER-001) is folded into `noAnswerCount`
 * too — there's nothing to display either way. Correct-answer marking
 * reads `qti-correct-response` directly, independent of the item's
 * `supported`/auto-grading status (this story's scope, unlike
 * QUIZ-AUTO-EVAL-001's).
 */
export function computeAnswerBreakdown(itemXml: string, responses: (unknown | undefined)[]): ItemAnswerBreakdown {
  const parsed = parseQtiXml(itemXml)
  const item = parsed.document?.item
  if (!item) return { prompt: undefined, buckets: [], noAnswerCount: responses.length, respondentCount: 0 }

  const interaction = item.interactions[0]
  const prompt = interaction?.prompt ?? item.prompt
  const responseIdentifier = interaction?.responseIdentifier
  const correctResponse = responseIdentifier ? item.responseDeclarations.find((decl) => decl.identifier === responseIdentifier)?.correctResponse : undefined

  const rawValues: unknown[] = []
  let noAnswerCount = 0
  // QUIZ-CLASS-REVIEW-001 / BUG-ANSWER-BREAKDOWN-MULTISELECT: `respondentCount`
  // is the number of submitted connections that actually have a
  // `quiz_session_answers` row for this item — `response !== undefined` —
  // as opposed to `noAnswerCount`, which also folds in rows whose value
  // resolves to nothing displayable (null, or an empty multi-select array).
  let respondentCount = 0
  for (const response of responses) {
    if (response !== undefined) respondentCount += 1
    const raw = response && typeof response === 'object' && responseIdentifier ? (response as Record<string, unknown>)[responseIdentifier] : undefined
    if (raw === undefined || raw === null) {
      noAnswerCount += 1
    } else {
      rawValues.push(raw)
    }
  }

  if (interaction?.type === 'choice' && interaction.choices.length > 0) {
    const buckets = interaction.choices.map((choice) => ({
      label: choice.text,
      count: 0,
      isCorrect: isCorrectMatch(choice.identifier, correctResponse),
    }))
    const byIdentifier = new Map(interaction.choices.map((choice, index) => [choice.identifier, index]))
    for (const value of rawValues) {
      // BUG-ANSWER-BREAKDOWN-MULTISELECT: a multi-select
      // (`cardinality="multiple"`) qti-choice-interaction stores its
      // response as an array of identifiers (e.g.
      // `{ RESPONSE: ["choice_a", "choice_c"] }`, per qti3-player-react's
      // `serialize()` and `scoreChoiceAnswer`'s own handling). Each
      // identifier in the array is a pick of its own bucket; an empty
      // array means the respondent picked nothing, so it counts as
      // no-answer instead of being dropped.
      if (Array.isArray(value)) {
        if (value.length === 0) {
          noAnswerCount += 1
          continue
        }
        for (const entry of value) {
          if (typeof entry !== 'string') continue
          const index = byIdentifier.get(entry)
          if (index !== undefined) buckets[index].count += 1
        }
        continue
      }
      if (typeof value !== 'string') continue
      const index = byIdentifier.get(value)
      if (index !== undefined) buckets[index].count += 1
    }
    return { prompt, buckets, noAnswerCount, respondentCount }
  }

  const buckets: AnswerBucket[] = []
  const byLabel = new Map<string, AnswerBucket>()
  for (const value of rawValues) {
    const label = stringifyResponse(value)
    const existing = byLabel.get(label)
    if (existing) {
      existing.count += 1
    } else {
      const bucket = { label, count: 1, isCorrect: isCorrectMatch(label, correctResponse) }
      byLabel.set(label, bucket)
      buckets.push(bucket)
    }
  }
  return { prompt, buckets, noAnswerCount, respondentCount }
}
