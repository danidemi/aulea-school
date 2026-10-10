// The qti3 player renders one qti-assessment-item at a time and explicitly
// does not resolve qti-assessment-test item-refs or manage Next/Submit
// (see @longsightgroup/qti3-player README). This is the hand-written shell
// the story's "one item at a time, in order" DoD actually needs — the spike
// question is how small this shell is, not whether the library provides it.
export interface ResolvedItemRef {
  identifier: string
  href: string
}

export function parseTestItemRefs(testXml: string): ResolvedItemRef[] {
  const doc = new DOMParser().parseFromString(testXml, 'application/xml')
  const refs = Array.from(doc.getElementsByTagName('qti-assessment-item-ref'))
  return refs.map((el) => ({
    identifier: el.getAttribute('identifier') ?? '',
    href: el.getAttribute('href') ?? '',
  }))
}
