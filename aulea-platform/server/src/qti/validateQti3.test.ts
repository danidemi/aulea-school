import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import AdmZip from 'adm-zip'
import { validateQti3, validateQtiPackage } from './validateQti3.js'
import { validPackageEntries, zipOf } from '../../test-fixtures/qti-samples/buildPackage.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SAMPLES_DIR = path.resolve(__dirname, '../../test-fixtures/qti-samples')

function readSample(name: string): Buffer {
  return readFileSync(path.join(SAMPLES_DIR, name))
}

// Covers QTI3-MIGRATION-001's DoD (active_sprint/story_qti3_migration.md):
// validates QTI 3.0 files with the same structural-check shape
// `validateQti22` used, plus rejecting a QTI 2.2 file post-cutover.

const VALID_ITEM = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="q1" title="Sample question">
  <qti-item-body>
    <p>What is 2 + 2?</p>
  </qti-item-body>
</qti-assessment-item>`

function buf(xml: string) {
  return Buffer.from(xml, 'utf-8')
}

describe('validateQti3 (QTI3-MIGRATION-001)', () => {
  it('accepts a well-formed, minimally-complete qti-assessment-item', () => {
    // given: a valid QTI 3.0 assessment item
    const result = validateQti3(buf(VALID_ITEM))

    // then: it is accepted, and the declared title is extracted
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.title).toBe('Sample question')
  })

  it('rejects malformed XML with a line number', () => {
    // given: XML with a mismatched closing tag
    const result = validateQti3(buf('<qti-assessment-item>\n<qti-item-body>\n</qti-assessment-item>'))

    // then: it is rejected, with an error pointing at a specific line
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].line).toBeGreaterThan(0)
  })

  it('rejects a document with the wrong root element', () => {
    // given: an XML file that isn't a QTI item or test at all
    const result = validateQti3(buf('<somethingElse identifier="x" title="y"/>'))

    // then: it is rejected, naming the actual root element found
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('somethingElse'))).toBe(true)
  })

  it('rejects a QTI 2.2 file as wrong root element, now that QTI 2.2 is unsupported', () => {
    // given: a well-formed, previously-valid QTI 2.2 assessmentItem
    const result = validateQti3(
      buf(
        '<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p2" identifier="q1" title="Old format"><itemBody/></assessmentItem>',
      ),
    )

    // then: it is rejected the same way any other wrong-root file is (ADR-0007 hard cutover)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('assessmentItem'))).toBe(true)
  })

  it('rejects a qti-assessment-item missing the required "identifier" attribute', () => {
    const result = validateQti3(
      buf('<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" title="No id"><qti-item-body/></qti-assessment-item>'),
    )

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('identifier'))).toBe(true)
  })

  it('rejects a qti-assessment-item missing the required "title" attribute', () => {
    const result = validateQti3(
      buf('<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="q1"><qti-item-body/></qti-assessment-item>'),
    )

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('title'))).toBe(true)
  })

  it('rejects a qti-assessment-item missing the required qti-item-body element', () => {
    const result = validateQti3(
      buf('<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="q1" title="No body"/>'),
    )

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('qti-item-body'))).toBe(true)
  })

  it('rejects a root element in the wrong namespace', () => {
    const result = validateQti3(
      buf('<qti-assessment-item xmlns="http://example.com/not-qti" identifier="q1" title="Wrong ns"><qti-item-body/></qti-assessment-item>'),
    )

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('namespace'))).toBe(true)
  })

  it('rejects an empty file', () => {
    const result = validateQti3(buf(''))

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('no root element'))).toBe(true)
  })

  it('accepts a qti-assessment-test root without requiring qti-item-body', () => {
    const result = validateQti3(
      buf('<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="t1" title="A test"/>'),
    )

    expect(result.valid).toBe(true)
  })

  it('collects multiple errors at once rather than stopping at the first', () => {
    // given: missing both identifier and title
    const result = validateQti3(buf('<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"><qti-item-body/></qti-assessment-item>'))

    expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })
})

// QTI-UAT-SAMPLES-001: the same fixed sample files used for manual UAT
// upload also exercise the real validator here, so a change to either
// the validator or the fixtures that breaks their intended outcome is
// caught automatically.
describe('validateQti3 against the QTI-UAT-SAMPLES-001 fixtures', () => {
  it.each([
    'sample-accept-single-choice-basic.xml',
    'sample-accept-multiple-choice-basic.xml',
    'sample-accept-multi-item-test.xml',
  ])('accepts %s', (fileName) => {
    const result = validateQti3(readSample(fileName))
    expect(result.valid).toBe(true)
  })

  it.each([
    'sample-reject-malformed-xml.xml',
    'sample-reject-wrong-root-element.xml',
    'sample-reject-missing-identifier.xml',
  ])('rejects %s', (fileName) => {
    const result = validateQti3(readSample(fileName))
    expect(result.valid).toBe(false)
  })
})

// Covers QUIZ-PACKAGE-STORAGE-001's DoD
// (active_sprint/story_qti_package_storage.md): a `.zip` package —
// imsmanifest.xml + test.xml + N item files — validates as a whole,
// closing the gap `sample-accept-multi-item-test.xml`'s own fixture
// comment flags for validateQti3 (dangling hrefs go unchecked there).

describe('validateQtiPackage (QUIZ-PACKAGE-STORAGE-001)', () => {
  it('accepts a well-formed package, returning every file to store', () => {
    // given: a zip with a manifest, test.xml, and both item files it references
    const result = validateQtiPackage(zipOf(validPackageEntries()))

    // then: it's accepted, with the test's own declared title and all 4 files
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.title).toBe('Geography quiz (multi-item test)')
    expect(result.files.map((f) => f.relativePath).sort()).toEqual(
      ['imsmanifest.xml', 'sample-accept-multiple-choice-basic.xml', 'sample-accept-single-choice-basic.xml', 'test.xml'].sort(),
    )
  })

  it('rejects a buffer that is not a valid zip archive', () => {
    const result = validateQtiPackage(Buffer.from('not a zip file at all'))

    expect(result.valid).toBe(false)
    expect(result.errors[0].message).toContain('not a valid zip archive')
    expect(result.files).toEqual([])
  })

  it('rejects a package missing imsmanifest.xml', () => {
    const { ['imsmanifest.xml']: _omit, ...rest } = validPackageEntries()
    const result = validateQtiPackage(zipOf(rest))

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.file === 'imsmanifest.xml')).toBe(true)
  })

  it('rejects a package missing test.xml', () => {
    const { ['test.xml']: _omit, ...rest } = validPackageEntries()
    const result = validateQtiPackage(zipOf(rest))

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.file === 'test.xml')).toBe(true)
  })

  it('rejects a package with a dangling item-ref href', () => {
    // given: test.xml references a second item file that isn't in the zip
    const entries = validPackageEntries()
    delete entries['sample-accept-multiple-choice-basic.xml']
    const result = validateQtiPackage(zipOf(entries))

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('sample-accept-multiple-choice-basic.xml') && e.message.includes('no such file'))).toBe(true)
  })

  it('rejects a package whose referenced item file is itself structurally invalid, naming the file', () => {
    // given: the referenced item is missing its required "identifier" attribute
    const entries = validPackageEntries()
    entries['sample-accept-single-choice-basic.xml'] = readSample('sample-reject-missing-identifier.xml')
    const result = validateQtiPackage(zipOf(entries))

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.file === 'sample-accept-single-choice-basic.xml' && e.message.includes('identifier'))).toBe(true)
  })

  it('rejects an empty zip archive', () => {
    const result = validateQtiPackage(new AdmZip().toBuffer())

    expect(result.valid).toBe(false)
    expect(result.errors[0].message).toContain('empty')
  })
})
