import { describe, it, expect } from 'vitest'
import { scoreChoiceAnswer } from './scoreAnswer.js'

// BUG-ANSWER-BREAKDOWN-MULTISELECT: ties the multi-select response shape
// used by answerBreakdown.test.ts's fixture (`{ RESPONSE: [...] }`) to
// what the real scorer actually accepts, instead of trusting this file's
// own doc comment.

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

describe('scoreChoiceAnswer with a multi-select choice interaction', () => {
  it('scores full credit when the response array matches every correct identifier, in the qti3-player-react serialize() shape', () => {
    // given: the exact response shape qti3-player-react's serialize() produces for a multi-select pick
    const responses = { RESPONSE: ['choice_a', 'choice_c'] }

    // when
    const score = scoreChoiceAnswer(MULTI_SELECT_ITEM, responses)

    // then: both correct identifiers picked, full credit
    expect(score).toBe(1)
  })

  it('scores no credit when the response array does not match the correct identifiers', () => {
    // given: one correct, one incorrect identifier picked
    const responses = { RESPONSE: ['choice_a', 'choice_b'] }

    // when
    const score = scoreChoiceAnswer(MULTI_SELECT_ITEM, responses)

    // then: match_correct requires an exact set match, so this scores 0
    expect(score).toBe(0)
  })

  it('scores no credit for an empty response array', () => {
    // given: a respondent who picked nothing
    const responses = { RESPONSE: [] }

    // when
    const score = scoreChoiceAnswer(MULTI_SELECT_ITEM, responses)

    // then
    expect(score).toBe(0)
  })
})
