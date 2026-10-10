import sax from 'sax'
import { parseQtiXml } from '@longsightgroup/qti3-core'

export interface QuizFileInput {
  relativePath: string
  fileData: Buffer
}

export interface ResolvedQuizItem {
  // The item's own root `identifier` (not a `qti-assessment-item-ref`
  // identifier — a standalone single-item quiz has no ref to take one
  // from). QUIZ-AUTO-EVAL-001 re-derives the same value from the same
  // item XML, so a `quiz_session_answers` row's `itemIdentifier` always
  // matches what this function would produce for that item.
  identifier: string
  // `quiz_files.relativePath` — persisted on `quiz_session_answers` so
  // QUIZ-AUTO-EVAL-001 can re-fetch this exact item's XML to score
  // against, without this module or the answers table needing to know
  // about `test.xml` item-refs at all.
  path: string
  xml: string
  // This story's scope is `qti-choice-interaction` only (ADR-0011) — an
  // item with any other/no interaction is unsupported, driving both the
  // client's placeholder render and the `gradingStatus: 'ungraded'` write.
  supported: boolean
}

function localName(name: string): string {
  const colon = name.indexOf(':')
  return colon === -1 ? name : name.slice(colon + 1)
}

// Deliberately tolerant of an otherwise-invalid test.xml, same convention
// as `qti/validateQti3.ts`'s own `extractItemRefHrefs` — structural
// validity was already checked at upload time (QUIZ-PACKAGE-STORAGE-001).
function extractItemRefHrefs(testXml: string): string[] {
  const hrefs: string[] = []
  const parser = sax.parser(true)
  parser.onerror = () => parser.resume()
  parser.onopentag = (node) => {
    if (localName(node.name) !== 'qti-assessment-item-ref') return
    const href = node.attributes['href']
    if (typeof href === 'string' && href.trim().length > 0) hrefs.push(href)
  }
  try {
    parser.write(testXml).close()
  } catch {
    // best-effort extraction, matching validateQti3.ts's own convention
  }
  return hrefs
}

// `parsed.ok` is qti3-core's own full-compliance check (e.g. it requires
// `time-dependent`, which `validateQti3.ts`'s upload-time validation
// doesn't) — not used as the gate here, since an item this repo already
// accepted at upload can still parse its interactions correctly despite
// failing that fuller check. `document` presence is what actually matters:
// whether `registryStatus` could be determined at all.
function isSupportedItem(xml: string): boolean {
  const parsed = parseQtiXml(xml)
  if (!parsed.document) return false
  const interactions = parsed.document.item.interactions
  return interactions.length > 0 && interactions.every((interaction) => interaction.type === 'choice' && interaction.registryStatus === 'supported')
}

function toResolvedItem(file: QuizFileInput): ResolvedQuizItem {
  const xml = file.fileData.toString('utf-8')
  const parsed = parseQtiXml(xml)
  return {
    identifier: parsed.document?.item.identifier ?? file.relativePath,
    path: file.relativePath,
    xml,
    supported: isSupportedItem(xml),
  }
}

/**
 * QUIZ-TAKE-RENDER-001: turns a quiz's stored `quiz_files` rows into the
 * ordered list of items a take-attempt renders. A `test.xml` present means
 * a multi-item test — item order comes from its `qti-assessment-item-ref`
 * hrefs, resolved against the same files (ADR-0010's existing convention,
 * client never parses `test.xml` itself). Its absence means a standalone
 * single-item upload (the DoD's "no test wrapper" sub-bullet) — the one
 * non-manifest file *is* the item.
 */
export function resolveQuizItems(files: QuizFileInput[]): ResolvedQuizItem[] {
  const byPath = new Map(files.map((f) => [f.relativePath, f]))
  const testFile = byPath.get('test.xml')

  if (testFile) {
    const hrefs = extractItemRefHrefs(testFile.fileData.toString('utf-8'))
    return hrefs
      .map((href) => byPath.get(href.replace(/^\.\//, '')))
      .filter((f): f is QuizFileInput => f !== undefined)
      .map(toResolvedItem)
  }

  const itemFile = files.find((f) => f.relativePath !== 'imsmanifest.xml')
  return itemFile ? [toResolvedItem(itemFile)] : []
}
