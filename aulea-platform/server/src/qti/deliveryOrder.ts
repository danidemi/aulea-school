import sax from 'sax'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import type { Document, Element } from '@xmldom/xmldom'
import type { ResolvedQuizItem } from './resolveQtiItems.js'

/**
 * QUIZ-SESSION-PER-STUDENT-DELIVERY-001/ADR-0013: resolves and applies a
 * per-connection delivery order — the effective question order (from a
 * `test.xml`'s `qti-assessment-section`/`qti-ordering` shape) and, for each
 * shuffled `qti-choice-interaction` item, its effective choice order.
 *
 * "Effective" per ADR-0013's force-shuffle-override rule: a question/
 * choice-set is shuffled when the session's force-shuffle flag is `true`
 * OR the item/section's own authored `shuffle` attribute is `"true"` —
 * evaluated independently for question order and each item's choice order.
 * `qti-choice-interaction` only (ADR-0011's existing scope) — an
 * unsupported item is never reordered. A `qti-simple-choice fixed="true"`
 * choice is kept in its authored slot even under force-shuffle (no real
 * fixture exercises this — see ADR-0013's Scope note).
 */

export interface DeliveryOrder {
  // Item identifiers, in the order this connection should be served them.
  itemOrder: string[]
  // Item identifier -> its choices' identifiers, in the order this
  // connection should see them. Only present for an item that was actually
  // shuffled (supported, and force-or-authored shuffle applies) — an
  // unshuffled item is absent here and served byte-identical to
  // `resolveQuizItems`'s own output.
  choiceOrder: Record<string, string[]>
}

function localName(name: string): string {
  const colon = name.indexOf(':')
  return colon === -1 ? name : name.slice(colon + 1)
}

/**
 * Fisher-Yates, with an injectable RNG so tests can assert an exact
 * resulting permutation instead of "not always identity" (a 2-element
 * shuffle is the identity half the time with a real RNG).
 */
function shuffle<T>(items: T[], random: () => number): T[] {
  const result = items.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

interface SectionGroup {
  shuffle: boolean
  hrefs: string[]
}

// Walks test.xml's qti-assessment-section/qti-ordering/qti-assessment-item-ref
// shape (nesting-tolerant via a stack, same tolerant-of-otherwise-invalid-XML
// convention as resolveQtiItems.ts's own extractItemRefHrefs). Each
// section's own qti-ordering shuffle attribute (default false/absent) is
// captured against that section's own item-ref hrefs, in document order —
// sections themselves are never reordered relative to each other, only the
// item-refs within one section.
function extractSectionGroups(testXml: string): SectionGroup[] {
  const groups: SectionGroup[] = []
  const stack: SectionGroup[] = []
  const parser = sax.parser(true)
  parser.onerror = () => parser.resume()
  parser.onopentag = (node) => {
    const name = localName(node.name)
    if (name === 'qti-assessment-section') {
      const group: SectionGroup = { shuffle: false, hrefs: [] }
      groups.push(group)
      stack.push(group)
      return
    }
    const current = stack[stack.length - 1]
    if (!current) return
    if (name === 'qti-ordering') {
      current.shuffle = node.attributes['shuffle'] === 'true'
    } else if (name === 'qti-assessment-item-ref') {
      const href = node.attributes['href']
      if (typeof href === 'string' && href.trim().length > 0) current.hrefs.push(href)
    }
  }
  parser.onclosetag = (name) => {
    if (localName(name) === 'qti-assessment-section') stack.pop()
  }
  try {
    parser.write(testXml).close()
  } catch {
    // best-effort extraction, matching resolveQtiItems.ts's own convention
  }
  return groups
}

function resolveItemOrder(items: ResolvedQuizItem[], testXml: string | null, forceShuffle: boolean, random: () => number): string[] {
  const byPath = new Map(items.map((item) => [item.path, item]))
  if (!testXml) return items.map((item) => item.identifier)

  const groups = extractSectionGroups(testXml)
  if (groups.length === 0) return items.map((item) => item.identifier)

  const order: string[] = []
  for (const group of groups) {
    const groupItems = group.hrefs.map((href) => byPath.get(href.replace(/^\.\//, ''))).filter((item): item is ResolvedQuizItem => item !== undefined)
    const effective = groupItems.length > 0 && (forceShuffle || group.shuffle) ? shuffle(groupItems, random) : groupItems
    for (const item of effective) order.push(item.identifier)
  }
  return order
}

function elementChildren(node: Element | Document): Element[] {
  return Array.from(node.childNodes).filter((child): child is Element => child.nodeType === 1)
}

function findDescendantByLocalName(node: Element, name: string): Element | null {
  for (const el of elementChildren(node)) {
    if (localName(el.nodeName) === name) return el
    const found = findDescendantByLocalName(el, name)
    if (found) return found
  }
  return null
}

interface ChoiceInteractionInfo {
  interaction: Element
  shuffle: boolean
  choiceIdentifiers: string[]
}

// Parses an item's XML via xmldom (needed for the reorder step anyway) and
// locates its qti-choice-interaction, if any — the same "one choice
// interaction, ADR-0011 scope" assumption resolveQtiItems.ts's
// isSupportedItem makes.
function parseChoiceInteraction(doc: Document): ChoiceInteractionInfo | null {
  const root = doc.documentElement
  if (!root) return null
  const interaction = findDescendantByLocalName(root, 'qti-choice-interaction')
  if (!interaction) return null
  const choices = elementChildren(interaction).filter((el) => localName(el.nodeName) === 'qti-simple-choice')
  return {
    interaction,
    shuffle: interaction.getAttribute('shuffle') === 'true',
    choiceIdentifiers: choices.map((choice) => choice.getAttribute('identifier') ?? ''),
  }
}

function resolveChoiceOrderForItem(xml: string, forceShuffle: boolean, random: () => number): string[] | null {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const info = parseChoiceInteraction(doc)
  if (!info || info.choiceIdentifiers.length === 0) return null
  if (!(forceShuffle || info.shuffle)) return null

  // qti-simple-choice fixed="true" stays in its authored slot even under
  // force-shuffle (ADR-0013's Scope note) — only the non-fixed identifiers
  // are permuted amongst the remaining slots.
  const choiceElements = elementChildren(info.interaction).filter((el) => localName(el.nodeName) === 'qti-simple-choice')

  const fixedSlots = new Set<number>()
  choiceElements.forEach((choice, index) => {
    if (choice.getAttribute('fixed') === 'true') fixedSlots.add(index)
  })

  const movable = info.choiceIdentifiers.filter((_, index) => !fixedSlots.has(index))
  const shuffledMovable = shuffle(movable, random)
  let movableCursor = 0
  return info.choiceIdentifiers.map((identifier, index) => (fixedSlots.has(index) ? identifier : shuffledMovable[movableCursor++]))
}

/**
 * Generates the effective delivery order for one connection's attempt.
 * Pure function of the resolved items, that quiz's `test.xml` (if any,
 * `null` for a standalone single-item quiz), and the session's two
 * force-shuffle flags — no randomness escapes this call except through the
 * injected `random` (defaults to `Math.random`, overridden by tests for a
 * deterministic, assertable permutation).
 */
export function resolveDeliveryOrder(
  items: ResolvedQuizItem[],
  testXml: string | null,
  forceShuffleQuestions: boolean,
  forceShuffleAnswers: boolean,
  random: () => number = Math.random,
): DeliveryOrder {
  const itemOrder = resolveItemOrder(items, testXml, forceShuffleQuestions, random)
  const choiceOrder: Record<string, string[]> = {}
  for (const item of items) {
    if (!item.supported) continue
    const choices = resolveChoiceOrderForItem(item.xml, forceShuffleAnswers, random)
    if (choices) choiceOrder[item.identifier] = choices
  }
  return { itemOrder, choiceOrder }
}

// Slot-anchored reorder: for each original qti-simple-choice, remember the
// sibling node that immediately followed it (a whitespace text node or
// another element never itself being moved) *before* any mutation, then
// insertBefore the desired choice ahead of that same anchor. Anchors never
// move, so this is safe to apply in any order and never depends on where a
// choice element has already been relocated to — unlike a naive
// remove-then-append pass, which would clump inter-choice whitespace and
// disturb it relative to qti-prompt.
function reorderChoiceChildren(interaction: Element, choiceIdentifiers: string[]): void {
  const original = elementChildren(interaction).filter((el) => localName(el.nodeName) === 'qti-simple-choice')
  const anchors = original.map((el) => el.nextSibling)
  const byIdentifier = new Map(original.map((el) => [el.getAttribute('identifier') ?? '', el]))
  original.forEach((_, index) => {
    const target = byIdentifier.get(choiceIdentifiers[index])
    if (target) interaction.insertBefore(target, anchors[index])
  })
}

/**
 * Rewrites one item's served XML so its `qti-simple-choice` children appear
 * in `choiceIdentifiers`' order — parse -> mutate -> serialize via
 * `@xmldom/xmldom` (ADR-0013), never a string splice. Returns the input
 * unchanged if no `qti-choice-interaction` is found (defensive; callers
 * only invoke this for an item `resolveDeliveryOrder` already found one
 * in).
 */
export function reorderChoicesInXml(xml: string, choiceIdentifiers: string[]): string {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const root = doc.documentElement
  const interaction = root ? findDescendantByLocalName(root, 'qti-choice-interaction') : null
  if (!interaction) return xml
  reorderChoiceChildren(interaction, choiceIdentifiers)
  return new XMLSerializer().serializeToString(doc)
}

/**
 * Applies a persisted `DeliveryOrder` to a quiz's resolved items: returns
 * them re-sequenced per `itemOrder`, with each item in `choiceOrder`'s
 * `qti-simple-choice` children reordered in its served XML. An item/order
 * mismatch (the quiz package was replaced after this connection's order was
 * generated) is tolerated: any stored identifier with no matching item is
 * skipped, and any item with no stored position is appended in its
 * original (resolveQuizItems) order — this delivery-plumbing PBI does not
 * own re-validating a quiz mid-session, only not crashing on the drift.
 */
export function applyDeliveryOrder(items: ResolvedQuizItem[], order: DeliveryOrder): ResolvedQuizItem[] {
  const byIdentifier = new Map(items.map((item) => [item.identifier, item]))
  const seen = new Set<string>()
  const sequence: string[] = []
  for (const identifier of order.itemOrder) {
    if (byIdentifier.has(identifier) && !seen.has(identifier)) {
      sequence.push(identifier)
      seen.add(identifier)
    }
  }
  for (const item of items) {
    if (!seen.has(item.identifier)) {
      sequence.push(item.identifier)
      seen.add(item.identifier)
    }
  }

  return sequence.map((identifier) => {
    const item = byIdentifier.get(identifier)!
    const choiceIdentifiers = order.choiceOrder[identifier]
    if (!choiceIdentifiers) return item
    return { ...item, xml: reorderChoicesInXml(item.xml, choiceIdentifiers) }
  })
}
