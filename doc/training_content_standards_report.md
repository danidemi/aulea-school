# Structured Formats for Training Content: Quizzes, Exams, Exercises, Slides

## Summary

No single format covers slides, quizzes, and exercises uniformly. Standards split by function: question/test interoperability, activity tracking, metadata and course structure, and packaging.

## Quizzes and Exams

| Standard | Body | Defines |
|---|---|---|
| **QTI (Question and Test Interoperability)** | 1EdTech (formerly IMS Global) | XML schema for individual questions (`assessmentItem`), tests (`assessmentTest`), item banks, feedback, scoring. Current version: QTI 3.0 (2022), which integrates APIP for accessibility and adopts web-friendly markup.<sup>[1]</sup> |
| **GIFT** | Moodle | Plain-text format for quick question authoring (multiple choice, true/false, matching, short answer), no XML overhead. |
| **Aiken** | — | Even simpler plain-text format, multiple choice only; often used as an intermediate step toward other formats. |
| **Moodle XML** | Moodle | Proprietary format that is a de facto standard given the platform's wide adoption. |

QTI is the only end-to-end interoperability standard for authoring, delivery, scoring, and reporting of online tests, and most LMSs (Moodle, Canvas, Blackboard) import/export QTI, with varying levels of vendor conformance.<sup>[2]</sup>

## Learning Activity Tracking

| Standard | Body | Notes |
|---|---|---|
| **SCORM** | ADL (Advanced Distributed Learning) | A reference model (not a standard built from scratch) that combines existing specs for packaging and runtime communication via a JavaScript API. Requires content and LMS to share the same domain; data collection limited to a fixed set of elements.<sup>[3]</sup> No longer maintained by ADL. |
| **xAPI (Experience API / Tin Can)** | ADL | Actor-verb-object model sent to a Learning Record Store (LRS); tracks activity outside the LMS too (mobile, simulations, offline). Very flexible but unconstrained, which leads organizations to develop non-interoperable "dialects."<sup>[4]</sup> |
| **cmi5** | ADL / formerly AICC | An xAPI profile that constrains it to the "LMS launches the content" use case: defines launch, session, course structure (a `cmi5.xml` file replacing the SCORM manifest), and reporting. Released in 2016, and indicated by the US Department of Defense as SCORM's successor.<sup>[5]</sup> |

## Metadata and Course Structure

- **LOM (Learning Object Metadata, IEEE 1484.12.1)**: describes learning resources (author, difficulty, objectives, prerequisites) for cataloguing and search.
- **IMS Common Cartridge** (1EdTech): packages an entire course (readings, discussions, quizzes) for portability between LMSs; often embeds QTI for the assessment portion.
- **LTI (Learning Tools Interoperability)** (1EdTech): not a content format, but a standard for plugging external tools (e.g., a quiz engine) into an LMS with SSO and grade passback.

## Slides

There is no genuine interoperable pedagogical standard for slides: this space is mostly governed by file-format standards (OOXML for .pptx, ODF for .odp), with no encoding of learning objectives or question banks. The closest things to a cross-cutting standard are:

- **H5P**: open-source framework with structured JSON content types (interactive slides, branching scenarios, drag-and-drop, embedded quizzes), exported as an `.h5p` package; solid interoperability with Moodle and WordPress.
- **Markdown-based slide tools** (reveal.js, Marp): not formal standards, but a common convention for text-authored, Git-versionable slides.

## Practical Recommendation

To unify slides, quizzes, and exercises into a single pipeline, **H5P** is the most pragmatic option: one JSON format spanning interactive slides, quizzes, and exercises, with Moodle/WordPress interoperability. For rigorous, formal interoperability with exam systems, **QTI 3.0** remains the reference standard for assessment items.

## References

1. 1EdTech, *Question and Test Interoperability (QTI) v3.0 – Overview*, https://www.imsglobal.org/spec/qti/v3p0/oview
2. 1EdTech, *Question & Test Interoperability*, https://www.1edtech.org/standards/qti
3. Rustici Software, *SCORM Explained*, https://scorm.com/scorm-explained/
4. ADL, *Overview and Application of xAPI, cmi5, and xAPI Profiles*, https://www.adlnet.gov/assets/uploads/Overview%20and%20Application%20of%20xAPI%20cmi5%20and%20xAPI%20Profiles.pdf
5. The cmi5 Project, https://aicc.github.io/CMI-5_Spec_Current/
