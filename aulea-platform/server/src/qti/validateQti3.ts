import sax from 'sax'
import AdmZip from 'adm-zip'

export interface QtiValidationError {
  line: number
  message: string
  // Present only for package-level errors (validateQtiPackage) — which
  // file inside the package the error belongs to, so a trainer fixing a
  // multi-file package knows where to look.
  file?: string
}

export interface QtiValidationResult {
  valid: boolean
  errors: QtiValidationError[]
  // Present only when valid — the root element's declared title, used as
  // the quiz's title (QTI-22-IMPORT's DoD, carried over unchanged by
  // QTI3-MIGRATION-001 — the file's own `title` attribute is the natural
  // source, since QTI 3.0 requires it too).
  title?: string
}

const QTI_3P0_NAMESPACE = 'http://www.imsglobal.org/xsd/imsqtiasi_v3p0'
const ROOT_ELEMENT_NAMES = new Set(['qti-assessment-item', 'qti-assessment-test'])

function localName(name: string): string {
  const colon = name.indexOf(':')
  return colon === -1 ? name : name.slice(colon + 1)
}

/**
 * QTI3-MIGRATION-001: structural validation of an uploaded QTI 3.0 file,
 * reporting line/element-level errors per the DoD.
 *
 * This replaces `validateQti22` (removed — ADR-0007's hard cutover, no
 * dual-format support). Same scope reduction as that module: NOT full XSD
 * schema validation against the official QTI 3.0 schema — this checks the
 * structural rules a trainer's mistake would actually violate: well-formed
 * XML, the correct root element and namespace, the root's two required
 * attributes (`identifier`, `title`), and — for a `qti-assessment-item` —
 * at least one `qti-item-body` (QTI 3.0's renamed `itemBody`).
 */
export function validateQti3(fileContent: Buffer): QtiValidationResult {
  const errors: QtiValidationError[] = []
  const parser = sax.parser(true)

  let rootSeen = false
  let rootIsAssessmentItem = false
  let sawItemBody = false
  let title: string | undefined

  parser.onerror = (err) => {
    errors.push({ line: parser.line + 1, message: err.message.split('\n')[0] })
    parser.resume()
  }

  parser.onopentag = (node) => {
    const name = localName(node.name)

    if (!rootSeen) {
      rootSeen = true
      if (!ROOT_ELEMENT_NAMES.has(name)) {
        errors.push({
          line: parser.line + 1,
          message: `root element must be <qti-assessment-item> or <qti-assessment-test>, found <${name}>`,
        })
        return
      }
      rootIsAssessmentItem = name === 'qti-assessment-item'

      const xmlns = typeof node.attributes['xmlns'] === 'string' ? node.attributes['xmlns'] : undefined
      if (xmlns !== undefined && xmlns !== QTI_3P0_NAMESPACE) {
        errors.push({
          line: parser.line + 1,
          message: `<${name}> has namespace "${xmlns}", expected "${QTI_3P0_NAMESPACE}" (QTI 3.0)`,
        })
      }

      const identifier = node.attributes['identifier']
      if (typeof identifier !== 'string' || identifier.trim().length === 0) {
        errors.push({ line: parser.line + 1, message: `<${name}> is missing the required "identifier" attribute` })
      }

      const titleAttr = node.attributes['title']
      if (typeof titleAttr !== 'string' || titleAttr.trim().length === 0) {
        errors.push({ line: parser.line + 1, message: `<${name}> is missing the required "title" attribute` })
      } else {
        title = titleAttr
      }
    }

    if (name === 'qti-item-body') sawItemBody = true
  }

  try {
    parser.write(fileContent.toString('utf-8')).close()
  } catch {
    // sax can still throw past onerror/resume() for unrecoverable states —
    // the errors array already has what was collected before that point.
  }

  if (!rootSeen) {
    errors.push({ line: 1, message: 'the file has no root element (is it empty?)' })
  } else if (rootIsAssessmentItem && !sawItemBody) {
    errors.push({ line: 1, message: '<qti-assessment-item> is missing the required <qti-item-body> element' })
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }
  return { valid: true, errors: [], title }
}

export interface QtiPackageFile {
  // Forward-slash, package-root-relative path, e.g. "imsmanifest.xml" or
  // "items/item-01.xml" — matches the href a `qti-assessment-item-ref`
  // uses, so QUIZ-TAKE-RENDER-001 can resolve one straight from `test.xml`.
  relativePath: string
  content: Buffer
}

export interface QtiPackageValidationResult {
  valid: boolean
  errors: QtiValidationError[]
  title?: string
  // Present only when valid — every non-directory entry found in the zip,
  // to be stored one row per file (ADR-0010's `quiz_files`).
  files: QtiPackageFile[]
}

function normalizeRelativePath(entryPath: string): string {
  return entryPath.replace(/\\/g, '/').replace(/^\.\//, '')
}

// Pulls every `qti-assessment-item-ref href="..."` out of a `test.xml`
// buffer — deliberately tolerant of the file otherwise being invalid
// (unlike validateQti3, this never raises a structural error itself;
// validateQti3 is run separately against the same buffer for that).
function extractItemRefHrefs(testXml: Buffer): string[] {
  const hrefs: string[] = []
  const parser = sax.parser(true)
  parser.onerror = () => parser.resume()
  parser.onopentag = (node) => {
    if (localName(node.name) !== 'qti-assessment-item-ref') return
    const href = node.attributes['href']
    if (typeof href === 'string' && href.trim().length > 0) hrefs.push(href)
  }
  try {
    parser.write(testXml.toString('utf-8')).close()
  } catch {
    // best-effort extraction — a malformed test.xml is already flagged by
    // the validateQti3 pass this function's caller also runs on it.
  }
  return hrefs
}

// PUT .../quizzes/:quizId/file (QUIZ-DASHBOARD-001) has never
// format-validated its input — replace intentionally keeps that contract.
// This is the unzip-only half of validateQtiPackage, with none of its
// structural checks, for that route to reuse instead of duplicating
// AdmZip/normalizeRelativePath here.
export function extractZipEntries(zipBuffer: Buffer): QtiPackageFile[] {
  const zip = new AdmZip(zipBuffer)
  return zip
    .getEntries()
    .filter((entry) => !entry.isDirectory)
    .map((entry) => ({ relativePath: normalizeRelativePath(entry.entryName), content: entry.getData() }))
}

/**
 * QUIZ-PACKAGE-STORAGE-001/ADR-0010: structural validation of an uploaded
 * QTI 3.0 *package* — a `.zip` containing `imsmanifest.xml`, `test.xml`
 * (a `qti-assessment-test`), and the item files it references via
 * `qti-assessment-item-ref href="..."`.
 *
 * Extends `validateQti3`'s item-level checks (run against `test.xml` and
 * every referenced item file) with package-level checks the single-file
 * validator has no way to make: the archive itself must open, the two
 * fixed-name required files must be present, and every href in `test.xml`
 * must resolve to a file actually in the zip — no dangling references, no
 * partial store on failure (every error is collected before any decision
 * to store is made by the caller).
 */
export function validateQtiPackage(zipBuffer: Buffer): QtiPackageValidationResult {
  let zip: AdmZip
  try {
    zip = new AdmZip(zipBuffer)
  } catch {
    return { valid: false, errors: [{ line: 1, message: 'the uploaded file is not a valid zip archive' }], files: [] }
  }

  const entries = zip.getEntries().filter((entry) => !entry.isDirectory)
  if (entries.length === 0) {
    return { valid: false, errors: [{ line: 1, message: 'the zip archive is empty' }], files: [] }
  }

  const byPath = new Map(entries.map((entry) => [normalizeRelativePath(entry.entryName), entry]))
  const errors: QtiValidationError[] = []

  const manifestEntry = byPath.get('imsmanifest.xml')
  if (!manifestEntry) {
    errors.push({ line: 1, message: 'missing required "imsmanifest.xml" at the package root', file: 'imsmanifest.xml' })
  }

  const testEntry = byPath.get('test.xml')
  if (!testEntry) {
    errors.push({ line: 1, message: 'missing required "test.xml" at the package root', file: 'test.xml' })
    // Nothing further can be checked without it (no item-refs to resolve).
    return { valid: false, errors, files: [] }
  }

  const testContent = testEntry.getData()
  const testValidation = validateQti3(testContent)
  for (const error of testValidation.errors) errors.push({ ...error, file: 'test.xml' })

  const hrefs = extractItemRefHrefs(testContent)
  const itemFiles: { relativePath: string; content: Buffer }[] = []
  for (const href of hrefs) {
    const relativePath = normalizeRelativePath(href)
    const entry = byPath.get(relativePath)
    if (!entry) {
      errors.push({ line: 1, message: `test.xml references "${href}" but no such file exists in the package`, file: 'test.xml' })
      continue
    }
    itemFiles.push({ relativePath, content: entry.getData() })
  }

  for (const item of itemFiles) {
    const itemValidation = validateQti3(item.content)
    for (const error of itemValidation.errors) errors.push({ ...error, file: item.relativePath })
  }

  if (errors.length > 0) {
    return { valid: false, errors, files: [] }
  }

  const files: QtiPackageFile[] = entries.map((entry) => ({
    relativePath: normalizeRelativePath(entry.entryName),
    content: entry.getData(),
  }))
  return { valid: true, errors: [], title: testValidation.title, files }
}
