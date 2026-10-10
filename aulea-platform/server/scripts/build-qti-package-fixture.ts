import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validPackageZip } from '../test-fixtures/qti-samples/buildPackage.js'

/**
 * QUIZ-PACKAGE-STORAGE-001: manual-UAT companion to QTI-UAT-SAMPLES-001.
 *
 * The loose sample files in test-fixtures/qti-samples/ can be uploaded
 * as-is for the standalone single-item path, but a human UAT-ing the
 * package upload path needs an actual `.zip` on disk to attach in the
 * browser. This assembles the same package the automated tests use
 * (buildPackage.ts) and writes it to a gitignored output directory.
 *
 * Run with: npm run build:qti-fixture
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '../test-fixtures/qti-samples/.generated')
const OUT_FILE = path.join(OUT_DIR, 'geography-quiz.zip')

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(OUT_FILE, validPackageZip())
console.log(`wrote ${OUT_FILE}`)
