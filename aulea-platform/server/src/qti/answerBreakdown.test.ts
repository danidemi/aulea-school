import { describe, it, expect } from 'vitest'
import { computeAnswerBreakdown } from './answerBreakdown.js'

// Covers QUIZ-CLASS-REVIEW-001's DoD
// (active_sprint/story_quiz_class_review.md): the per-item distribution
// computation, independent of the route/persistence layer.

const CHOICE_ITEM = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="single-choice-basic" title="Capital of France" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response><qti-value>choice_b</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>0</qti-value></qti-default-value></qti-outcome-declaration>
  <qti-item-body>
    <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" max-choices="1">
      <qti-simple-choice identifier="choice_a">Berlin</qti-simple-choice>
      <qti-simple-choice identifier="choice_b">Paris</qti-simple-choice>
      <qti-simple-choice identifier="choice_c">Rome</qti-simple-choice>
    </qti-choice-interaction>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`

// BUG-ANSWER-BREAKDOWN-MULTISELECT: a multi-select choice interaction
// (`cardinality="multiple"`, `max-choices="0"`), matching the real shape
// `qti3-player-react`'s `serialize()` produces and `scoreChoiceAnswer`
// (server/src/qti/scoreAnswer.ts) already parses: `{ RESPONSE: [...] }`.
const MULTI_SELECT_ITEM = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="multi-select-primes" title="Prime numbers" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier">
    <qti-correct-response>
      <qti-value>choice_a</qti-value>
      <qti-value>choice_c</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>0</qti-value></qti-default-value></qti-outcome-declaration>
  <qti-item-body>
    <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" max-choices="0">
      <qti-simple-choice identifier="choice_a">2</qti-simple-choice>
      <qti-simple-choice identifier="choice_b">4</qti-simple-choice>
      <qti-simple-choice identifier="choice_c">7</qti-simple-choice>
      <qti-simple-choice identifier="choice_d">9</qti-simple-choice>
    </qti-choice-interaction>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`

const TEXT_ITEM = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="text-entry-item" title="Capital of Italy">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
    <qti-correct-response><qti-value>Rome</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-item-body>
    <qti-text-entry-interaction response-identifier="RESPONSE"/>
  </qti-item-body>
</qti-assessment-item>`

describe('computeAnswerBreakdown (QUIZ-CLASS-REVIEW-001)', () => {
  it('buckets a qti-choice-interaction item by every offered option, marking the correct one', () => {
    // given: three students, two picking the correct option
    const responses = [{ RESPONSE: 'choice_b' }, { RESPONSE: 'choice_a' }, { RESPONSE: 'choice_b' }]

    // when
    const result = computeAnswerBreakdown(CHOICE_ITEM, responses)

    // then: every offered option is present, correct one marked, unpicked option at 0
    expect(result.buckets).toEqual([
      { label: 'Berlin', count: 1, isCorrect: false },
      { label: 'Paris', count: 2, isCorrect: true },
      { label: 'Rome', count: 0, isCorrect: false },
    ])
    expect(result.noAnswerCount).toBe(0)
    expect(result.respondentCount).toBe(3)
  })

  it('groups a non-choice item by exact raw text, with duplicates counted together', () => {
    // given: two identical answers and one distinct one
    const responses = [{ RESPONSE: 'Rome' }, { RESPONSE: 'Rome' }, { RESPONSE: 'Milan' }]

    // when
    const result = computeAnswerBreakdown(TEXT_ITEM, responses)

    // then: two distinct buckets, correct one marked, duplicate counted once with count 2
    expect(result.buckets).toEqual(
      expect.arrayContaining([
        { label: 'Rome', count: 2, isCorrect: true },
        { label: 'Milan', count: 1, isCorrect: false },
      ]),
    )
    expect(result.buckets).toHaveLength(2)
    expect(result.noAnswerCount).toBe(0)
  })

  it('counts a connection with no row for the item as a separate no-answer count, not a bucket', () => {
    // given: one real answer and one connection that never answered this item (undefined)
    const responses = [{ RESPONSE: 'choice_b' }, undefined]

    // when
    const result = computeAnswerBreakdown(CHOICE_ITEM, responses)

    // then: the no-answer connection is not folded into any bucket
    expect(result.noAnswerCount).toBe(1)
    expect(result.buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(1)
    // and: the connection with no row at all for this item doesn't count
    // as a respondent either — only the one real answer does
    expect(result.respondentCount).toBe(1)
  })

  it('carries the question text through from the interaction-level qti-prompt (how real quiz items author it)', () => {
    const withPrompt = CHOICE_ITEM.replace(
      '<qti-choice-interaction response-identifier="RESPONSE" shuffle="false" max-choices="1">',
      '<qti-choice-interaction response-identifier="RESPONSE" shuffle="false" max-choices="1"><qti-prompt>Which city is the capital of France?</qti-prompt>',
    )
    const result = computeAnswerBreakdown(withPrompt, [{ RESPONSE: 'choice_b' }])
    expect(result.prompt).toBe('Which city is the capital of France?')
  })
})

describe('computeAnswerBreakdown with a multi-select choice interaction (BUG-ANSWER-BREAKDOWN-MULTISELECT)', () => {
  it('counts each identifier in a multi-select response array as a pick of its own bucket', () => {
    // given: two students each picking both correct options, one picking one correct and one incorrect
    const responses = [{ RESPONSE: ['choice_a', 'choice_c'] }, { RESPONSE: ['choice_a', 'choice_c'] }, { RESPONSE: ['choice_a', 'choice_b'] }]

    // when
    const result = computeAnswerBreakdown(MULTI_SELECT_ITEM, responses)

    // then: every offered option is present with its real pick count, correct options marked
    expect(result.buckets).toEqual([
      { label: '2', count: 3, isCorrect: true },
      { label: '4', count: 1, isCorrect: false },
      { label: '7', count: 2, isCorrect: true },
      { label: '9', count: 0, isCorrect: false },
    ])
    expect(result.noAnswerCount).toBe(0)
    // and: the denominator is the number of respondents, not the sum of picks (which would be 6)
    expect(result.respondentCount).toBe(3)
  })

  it('counts an empty multi-select response array as no answer, not a dropped answer', () => {
    // given: one real multi-select answer and one connection that submitted picking nothing
    const responses = [{ RESPONSE: ['choice_a', 'choice_c'] }, { RESPONSE: [] }]

    // when
    const result = computeAnswerBreakdown(MULTI_SELECT_ITEM, responses)

    // then: the empty-array response is folded into no-answer, not silently dropped
    expect(result.noAnswerCount).toBe(1)
    expect(result.buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(2)
    expect(result.respondentCount).toBe(2)
  })

  it('leaves single-select behavior unchanged when the response is a plain string', () => {
    // given: a single-select-shaped response against a multi-select item's buckets
    const responses = [{ RESPONSE: 'choice_a' }]

    // when
    const result = computeAnswerBreakdown(MULTI_SELECT_ITEM, responses)

    // then: the string is still counted as a single pick, exactly as before this fix
    expect(result.buckets.find((bucket) => bucket.label === '2')).toEqual({ label: '2', count: 1, isCorrect: true })
    expect(result.noAnswerCount).toBe(0)
  })
})
