import testXml from './fixtures/sample-accept-multi-item-test.xml?raw'
import singleChoiceXml from './fixtures/sample-accept-single-choice-basic.xml?raw'
import multipleChoiceXml from './fixtures/sample-accept-multiple-choice-basic.xml?raw'

// Copied from server/test-fixtures/qti-samples/ (tracked in git) rather than
// unzipping server/test-fixtures/qti-samples/.generated/geography-quiz.zip,
// which is gitignored (build output) and wouldn't exist for anyone else who
// checks out this spike without running the zip-generating script first.
export const FIXTURES_BY_HREF: Record<string, string> = {
  './sample-accept-single-choice-basic.xml': singleChoiceXml,
  './sample-accept-multiple-choice-basic.xml': multipleChoiceXml,
}

export { testXml, singleChoiceXml, multipleChoiceXml }
