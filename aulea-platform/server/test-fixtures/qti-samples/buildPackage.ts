import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import AdmZip from 'adm-zip'

// QUIZ-PACKAGE-STORAGE-001: single source of truth for the "valid multi-item
// QTI package" fixture, assembled from the loose QTI-UAT-SAMPLES-001 files
// rather than a `.zip` committed to git. Shared by validateQti3.test.ts,
// quizzes.test.ts, and scripts/build-qti-package-fixture.ts (the manual-UAT
// CLI wrapper) so all three agree on what "the valid package fixture" is.

const SAMPLES_DIR = path.dirname(fileURLToPath(import.meta.url))

function readSample(name: string): Buffer {
  return readFileSync(path.join(SAMPLES_DIR, name))
}

export const PACKAGE_MANIFEST = '<?xml version="1.0" encoding="UTF-8"?><manifest xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"/>'

export function validPackageEntries(): Record<string, Buffer> {
  return {
    'imsmanifest.xml': Buffer.from(PACKAGE_MANIFEST, 'utf-8'),
    'test.xml': readSample('sample-accept-multi-item-test.xml'),
    'sample-accept-single-choice-basic.xml': readSample('sample-accept-single-choice-basic.xml'),
    'sample-accept-multiple-choice-basic.xml': readSample('sample-accept-multiple-choice-basic.xml'),
  }
}

export function zipOf(entries: Record<string, Buffer | string>): Buffer {
  const zip = new AdmZip()
  for (const [entryName, content] of Object.entries(entries)) {
    zip.addFile(entryName, Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8'))
  }
  return zip.toBuffer()
}

export function validPackageZip(): Buffer {
  return zipOf(validPackageEntries())
}

// QUIZ-SESSION-PER-STUDENT-DELIVERY-001/ADR-0013: the "off = follow
// authored XML" fixture — every fixture above uses shuffle="false"
// everywhere and no fixture has qti-ordering at all, so this is the only
// package in this repo where the delivery-order module's authored-shuffle
// path (as opposed to the force-shuffle path) has real data to run
// against. See sample-shuffle-test.xml's own header comment for the shape.
export function shuffledPackageEntries(): Record<string, Buffer> {
  return {
    'imsmanifest.xml': Buffer.from(PACKAGE_MANIFEST, 'utf-8'),
    'test.xml': readSample('sample-shuffle-test.xml'),
    'sample-shuffle-question-a.xml': readSample('sample-shuffle-question-a.xml'),
    'sample-shuffle-question-b.xml': readSample('sample-shuffle-question-b.xml'),
    'sample-shuffle-question-c.xml': readSample('sample-shuffle-question-c.xml'),
    'sample-shuffle-question-d.xml': readSample('sample-shuffle-question-d.xml'),
    'sample-shuffle-choice-shuffle-true.xml': readSample('sample-shuffle-choice-shuffle-true.xml'),
    'sample-shuffle-choice-shuffle-false.xml': readSample('sample-shuffle-choice-shuffle-false.xml'),
  }
}
