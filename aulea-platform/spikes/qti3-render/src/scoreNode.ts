// Server-side scoring, no browser. The player docs warn browser-side
// scoreAttempt() is "local preview/convenience only" and that high-stakes
// scoring must be recomputed server-side — this proves @longsightgroup/qti3-core
// can do that recompute directly from the item XML already in quiz_files
// (ADR-0010), with no player/DOM involved. Informs QUIZ-AUTO-EVAL-001.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createItemSession, parseQtiXml } from '@longsightgroup/qti3-core'

function fixturePath(name: string): string {
  return fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))
}

function scoreItem(fileName: string, responses: Record<string, string[]>) {
  const xml = readFileSync(fixturePath(fileName), 'utf-8')
  const parsed = parseQtiXml(xml)
  const session = createItemSession(parsed.document)
  for (const [identifier, values] of Object.entries(responses)) {
    session.respond(identifier, values.length === 1 ? values[0] : values)
  }
  const score = session.score()
  console.log(fileName, '->', JSON.stringify(score))
}

// Correct answer for single-choice-basic is choice_b (Paris).
scoreItem('sample-accept-single-choice-basic.xml', { RESPONSE: ['choice_b'] })
// Wrong answer, to confirm scoring actually discriminates.
scoreItem('sample-accept-single-choice-basic.xml', { RESPONSE: ['choice_a'] })
// Correct answer for multiple-choice-basic is {choice_a, choice_c} (2, 7).
scoreItem('sample-accept-multiple-choice-basic.xml', { RESPONSE: ['choice_a', 'choice_c'] })
// Partial/wrong answer.
scoreItem('sample-accept-multiple-choice-basic.xml', { RESPONSE: ['choice_a', 'choice_b'] })
