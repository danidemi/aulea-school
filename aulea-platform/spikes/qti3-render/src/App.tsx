import { useMemo, useRef, useState } from 'react'
import { QtiAssessmentItemPlayer, type QtiAssessmentItemPlayerHandle } from '@longsightgroup/qti3-player-react'
import type { QtiAttemptStateV1, QtiScoreResult } from '@longsightgroup/qti3-player'
import { FIXTURES_BY_HREF, singleChoiceXml, testXml } from './fixtures'
import { parseTestItemRefs } from './testSequencer'

interface RecordedAnswer {
  identifier: string
  state: QtiAttemptStateV1 | undefined
  score: QtiScoreResult | undefined
}

// DoD sub-bullet: "a session on a standalone single-item quiz (no test
// wrapper) still works, rendering that one item" — no test.xml, no sequencer.
function StandaloneItemDemo() {
  const playerRef = useRef<QtiAssessmentItemPlayerHandle>(null)
  const [captured, setCaptured] = useState<RecordedAnswer | null>(null)

  function handleCapture() {
    const state = playerRef.current?.serialize()
    const score = playerRef.current?.scoreAttempt()
    setCaptured({ identifier: 'single-choice-basic', state, score })
  }

  return (
    <section data-testid="standalone-demo">
      <h2>Standalone single item (no test.xml)</h2>
      <QtiAssessmentItemPlayer ref={playerRef} xml={singleChoiceXml} />
      <button type="button" onClick={handleCapture} data-testid="standalone-capture">
        Capture response + score
      </button>
      {captured && <pre data-testid="standalone-result">{JSON.stringify(captured, null, 2)}</pre>}
    </section>
  )
}

// The test-sequencing shell the qti3 player explicitly leaves to the host
// (see testSequencer.ts). Proves the DoD's "one at a time, in order,
// Next/Submit through all N items" is a small amount of hand-written glue,
// not something qti3 provides.
function TestSequenceDemo() {
  const itemRefs = useMemo(() => parseTestItemRefs(testXml), [])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<RecordedAnswer[]>([])
  const [submitted, setSubmitted] = useState(false)
  const playerRef = useRef<QtiAssessmentItemPlayerHandle>(null)

  const currentRef = itemRefs[index]
  const currentXml = currentRef ? FIXTURES_BY_HREF[currentRef.href] : undefined
  const isLast = index === itemRefs.length - 1

  function captureCurrent(): RecordedAnswer {
    const state = playerRef.current?.serialize()
    const score = playerRef.current?.scoreAttempt()
    return { identifier: currentRef.identifier, state, score }
  }

  function handleNext() {
    const recorded = captureCurrent()
    setAnswers((prev) => [...prev, recorded])
    if (isLast) {
      setSubmitted(true)
    } else {
      setIndex((i) => i + 1)
    }
  }

  if (submitted) {
    return (
      <section data-testid="test-sequence-demo">
        <h2>Multi-item test.xml sequence</h2>
        <p data-testid="submitted-confirmation">Submitted — thanks!</p>
        <pre data-testid="test-sequence-result">{JSON.stringify(answers, null, 2)}</pre>
      </section>
    )
  }

  return (
    <section data-testid="test-sequence-demo">
      <h2>Multi-item test.xml sequence</h2>
      <p>
        Item {index + 1} of {itemRefs.length}: {currentRef?.identifier}
      </p>
      {currentXml ? (
        <QtiAssessmentItemPlayer key={currentRef.identifier} ref={playerRef} xml={currentXml} />
      ) : (
        <p>Unresolvable item href: {currentRef?.href}</p>
      )}
      <button type="button" onClick={handleNext} data-testid="test-sequence-next">
        {isLast ? 'Submit' : 'Next'}
      </button>
    </section>
  )
}

export default function App() {
  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>qti3-render spike (QUIZ-TAKE-RENDER-001)</h1>
      <TestSequenceDemo />
      <hr />
      <StandaloneItemDemo />
    </main>
  )
}
