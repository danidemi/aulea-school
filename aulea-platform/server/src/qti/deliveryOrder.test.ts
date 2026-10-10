import { describe, it, expect } from 'vitest'
import { parseQtiXml } from '@longsightgroup/qti3-core'
import { resolveQuizItems, type QuizFileInput } from './resolveQtiItems.js'
import { resolveDeliveryOrder, applyDeliveryOrder, reorderChoicesInXml } from './deliveryOrder.js'
import { shuffledPackageEntries } from '../../test-fixtures/qti-samples/buildPackage.js'

// Covers QUIZ-SESSION-PER-STUDENT-DELIVERY-001's DoD
// (active_sprint/task_quiz_session_per_student_delivery.md): the effective
// question/choice order for all four {force on, force off} x
// {shuffle="true", shuffle="false"} combinations, against the new
// shuffledPackageEntries fixture (ADR-0013) — the only fixture in this
// repo where the "off = follow authored XML" path has real test data.

function loadFiles(): QuizFileInput[] {
  const entries = shuffledPackageEntries()
  return Object.entries(entries)
    .filter(([relativePath]) => relativePath !== 'imsmanifest.xml')
    .map(([relativePath, fileData]) => ({ relativePath, fileData }))
}

function testXmlOf(files: QuizFileInput[]): string {
  const testFile = files.find((f) => f.relativePath === 'test.xml')
  if (!testFile) throw new Error('test.xml not found in fixture')
  return testFile.fileData.toString('utf-8')
}

// A never-shuffles / always-picks-first-permutation stand-in — Fisher-Yates
// with random() => 0 always swaps element i with element 0, which for a
// small fixed input is deterministic and (for n>=2) not the identity
// permutation, letting tests assert an exact resulting order instead of
// just "not always identity" (a real RNG's shuffle is the identity some of
// the time, especially for a 2-element array).
const DETERMINISTIC_RANDOM = () => 0

describe('resolveDeliveryOrder / applyDeliveryOrder (QUIZ-SESSION-PER-STUDENT-DELIVERY-001)', () => {
  it('question order: an authored shuffle="true" section is reordered even with force off', () => {
    // given: the shuffled section's two plain items, force off
    const items = resolveQuizItems(loadFiles())
    const testXml = testXmlOf(loadFiles())

    // when: resolving the order with force off, a non-identity RNG
    const order = resolveDeliveryOrder(items, testXml, false, false, DETERMINISTIC_RANDOM)

    // then: question-a/question-b (the shuffled section) are not in their
    // authored order
    const shuffledSlice = order.itemOrder.filter((id) => id === 'question-a' || id === 'question-b')
    expect(shuffledSlice).toEqual(['question-b', 'question-a'])
  })

  it('question order: an authored shuffle="false" section stays in authored order with force off', () => {
    const items = resolveQuizItems(loadFiles())
    const testXml = testXmlOf(loadFiles())

    const order = resolveDeliveryOrder(items, testXml, false, false, DETERMINISTIC_RANDOM)

    const fixedSlice = order.itemOrder.filter((id) => id === 'question-c' || id === 'question-d')
    expect(fixedSlice).toEqual(['question-c', 'question-d'])
  })

  it('question order: force on reorders an authored shuffle="false" section too', () => {
    const items = resolveQuizItems(loadFiles())
    const testXml = testXmlOf(loadFiles())

    const order = resolveDeliveryOrder(items, testXml, true, false, DETERMINISTIC_RANDOM)

    const fixedSlice = order.itemOrder.filter((id) => id === 'question-c' || id === 'question-d')
    expect(fixedSlice).toEqual(['question-d', 'question-c'])
  })

  it('question order: force on ALSO reorders an authored shuffle="true" section (the fourth combination)', () => {
    const items = resolveQuizItems(loadFiles())
    const testXml = testXmlOf(loadFiles())

    const order = resolveDeliveryOrder(items, testXml, true, false, DETERMINISTIC_RANDOM)

    const shuffledSlice = order.itemOrder.filter((id) => id === 'question-a' || id === 'question-b')
    expect(shuffledSlice).toEqual(['question-b', 'question-a'])
  })

  it('question order: force off leaves every section following its own attribute, sections in document order', () => {
    const items = resolveQuizItems(loadFiles())
    const testXml = testXmlOf(loadFiles())

    // given: a real RNG substitute that never actually permutes (identity)
    const order = resolveDeliveryOrder(items, testXml, false, false, () => 0.999)

    expect(order.itemOrder).toEqual(['question-a', 'question-b', 'choice-shuffle-true', 'question-c', 'question-d', 'choice-shuffle-false'])
  })

  it('choice order: authored shuffle="true" item is shuffled even with force off', () => {
    const items = resolveQuizItems(loadFiles())
    const order = resolveDeliveryOrder(items, null, false, false, DETERMINISTIC_RANDOM)

    expect(order.choiceOrder['choice-shuffle-true']).toEqual(['cst_choice_b', 'cst_choice_c', 'cst_choice_d', 'cst_choice_a'])
  })

  it('choice order: authored shuffle="false" item is NOT shuffled with force off (absent from choiceOrder, byte-identical XML)', () => {
    const items = resolveQuizItems(loadFiles())
    const order = resolveDeliveryOrder(items, null, false, false, DETERMINISTIC_RANDOM)

    expect(order.choiceOrder['choice-shuffle-false']).toBeUndefined()

    const applied = applyDeliveryOrder(items, order)
    const original = items.find((i) => i.identifier === 'choice-shuffle-false')!
    const served = applied.find((i) => i.identifier === 'choice-shuffle-false')!
    expect(served.xml).toBe(original.xml)
  })

  it('choice order: force on shuffles an authored shuffle="false" item too', () => {
    const items = resolveQuizItems(loadFiles())
    const order = resolveDeliveryOrder(items, null, false, true, DETERMINISTIC_RANDOM)

    expect(order.choiceOrder['choice-shuffle-false']).toEqual(['csf_choice_b', 'csf_choice_c', 'csf_choice_d', 'csf_choice_a'])
  })

  it('choice order: force on ALSO shuffles an authored shuffle="true" item (the fourth combination)', () => {
    const items = resolveQuizItems(loadFiles())
    const order = resolveDeliveryOrder(items, null, false, true, DETERMINISTIC_RANDOM)

    expect(order.choiceOrder['choice-shuffle-true']).toEqual(['cst_choice_b', 'cst_choice_c', 'cst_choice_d', 'cst_choice_a'])
  })

  it('choice order: force off + authored shuffle="false" leaves an unsupported/no-interaction item alone', () => {
    // given: a plain question item with shuffle="false"
    const items = resolveQuizItems(loadFiles())
    const order = resolveDeliveryOrder(items, null, false, false, DETERMINISTIC_RANDOM)

    expect(order.choiceOrder['question-a']).toBeUndefined()
  })

  it('is stable across repeated calls with the same RNG behavior, matching the "generate once, persist" contract', () => {
    const items = resolveQuizItems(loadFiles())
    const testXml = testXmlOf(loadFiles())
    const random = DETERMINISTIC_RANDOM

    const first = resolveDeliveryOrder(items, testXml, true, true, random)
    const second = resolveDeliveryOrder(items, testXml, true, true, random)

    expect(second).toEqual(first)
  })

  it("applyDeliveryOrder's reordered item still parses via parseQtiXml with the same identifier and the same set of choice identifiers, only order differs", () => {
    // given: the real choice-shuffle-true fixture, force on so it is
    // guaranteed to be shuffled with this deterministic RNG
    const items = resolveQuizItems(loadFiles())
    const original = items.find((i) => i.identifier === 'choice-shuffle-true')!
    const order = resolveDeliveryOrder(items, null, false, true, DETERMINISTIC_RANDOM)

    // when: applying the resolved order
    const applied = applyDeliveryOrder(items, order)
    const served = applied.find((i) => i.identifier === 'choice-shuffle-true')!

    // then: the served XML is different from the source, but still parses
    expect(served.xml).not.toBe(original.xml)
    const parsedOriginal = parseQtiXml(original.xml)
    const parsedServed = parseQtiXml(served.xml)
    expect(parsedServed.document?.item.identifier).toBe(parsedOriginal.document?.item.identifier)

    const originalChoiceIds = extractChoiceIdentifiers(original.xml)
    const servedChoiceIds = extractChoiceIdentifiers(served.xml)
    expect(new Set(servedChoiceIds)).toEqual(new Set(originalChoiceIds))
    expect(servedChoiceIds).not.toEqual(originalChoiceIds)
  })

  it('applyDeliveryOrder re-sequences items per itemOrder and tolerates a stored identifier no longer present', () => {
    const items = resolveQuizItems(loadFiles())
    const applied = applyDeliveryOrder(items, {
      itemOrder: ['question-b', 'stale-identifier-not-in-package', 'question-a'],
      choiceOrder: {},
    })

    // then: known identifiers come first, in the stored order; the
    // remaining real items are appended in their original order; the
    // dangling stored identifier is silently skipped
    const identifiers = applied.map((i) => i.identifier)
    expect(identifiers.slice(0, 2)).toEqual(['question-b', 'question-a'])
    expect(identifiers).toHaveLength(items.length)
    expect(new Set(identifiers)).toEqual(new Set(items.map((i) => i.identifier)))
  })

  it('reorderChoicesInXml leaves XML with no qti-choice-interaction unchanged', () => {
    const xml = '<qti-assessment-item identifier="x" title="x"><qti-item-body/></qti-assessment-item>'
    expect(reorderChoicesInXml(xml, ['a', 'b'])).toBe(xml)
  })

  it('with no test.xml (standalone single-item quiz), the item order is just that one item, never shuffled', () => {
    const files = loadFiles().filter((f) => f.relativePath === 'sample-shuffle-choice-shuffle-true.xml')
    const items = resolveQuizItems(files)
    const order = resolveDeliveryOrder(items, null, true, false, DETERMINISTIC_RANDOM)
    expect(order.itemOrder).toEqual(['choice-shuffle-true'])
  })
})

function extractChoiceIdentifiers(xml: string): string[] {
  const matches = xml.matchAll(/<qti-simple-choice[^>]*identifier="([^"]+)"/g)
  return Array.from(matches, (m) => m[1])
}
