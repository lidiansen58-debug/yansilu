import test from "node:test";
import assert from "node:assert/strict";
import { buildExternalCandidates } from "../../packages/connectors/src/index.mjs";

test("buildExternalCandidates maps Zotero items to Source and LiteratureNote candidates", () => {
  const result = buildExternalCandidates("zotero", {
    items: [
      {
        key: "ABC123",
        title: "A Zotero Article",
        text: "Important annotation",
        locator: "p. 42",
        tags: ["reading"]
      }
    ]
  });

  assert.equal(result.sources.length, 1);
  assert.equal(result.literature.length, 1);
  assert.equal(result.sources[0].source_type, "article");
  assert.equal(result.sources[0].imported_from, "zotero");
  assert.equal(result.literature[0].source_id, result.sources[0].id);
  assert.equal(result.literature[0].quote_text, "Important annotation");
  assert.equal(result.literature[0].locator, "p. 42");
});

test("buildExternalCandidates marks Readwise highlights as pending paraphrase", () => {
  const result = buildExternalCandidates("readwise", {
    highlights: [
      {
        id: "hl_1",
        title: "A Book",
        highlight: "Highlighted passage",
        tags: ["book"]
      }
    ]
  });

  assert.equal(result.sources.length, 1);
  assert.equal(result.literature.length, 1);
  assert.equal(result.sources[0].imported_from, "readwise");
  assert.ok(result.literature[0].tags.includes("pending_paraphrase"));
  assert.equal(result.literature[0].quote_text, "Highlighted passage");
});

test("buildExternalCandidates preserves NotebookLM notebook context", () => {
  const result = buildExternalCandidates("notebooklm", {
    notebookName: "Research Notebook",
    notes: [
      {
        id: "note_1",
        title: "Notebook note",
        content: "Notebook synthesis output"
      }
    ]
  });

  assert.equal(result.sources.length, 1);
  assert.equal(result.literature.length, 1);
  assert.equal(result.permanent.length, 0);
  assert.equal(result.sources[0].imported_from, "notebooklm");
  assert.equal(result.sources[0].notebook, "Research Notebook");
  assert.equal(result.sources[0].notebook_input_type, "note");
  assert.equal(result.sources[0].candidate_kind, "claim");
  assert.equal(result.literature[0].notebook, "Research Notebook");
  assert.equal(result.literature[0].notebook_input_type, "note");
  assert.equal(result.literature[0].candidate_kind, "claim");
  assert.equal(result.literature[0].external_id, "note_1");
  assert.equal(result.literature[0].quote_text, "Notebook synthesis output");
});

test("buildExternalCandidates expands NotebookLM generated sections into literature candidates", () => {
  const result = buildExternalCandidates("notebooklm", {
    notebookName: "Paper Notebook",
    summary: "Claim: retrieval practice improves retention.\n\nLimitation: sample size was small.",
    studyGuide: "- Method: compare rereading and retrieval groups.\n- Question: where might the effect fail?",
    qa: [
      {
        id: "qa_findings",
        question: "What did the study find?",
        answer: "Result: retrieval practice improved delayed recall.",
        tags: "paper"
      }
    ],
    notes: "Quote: participants reported effortful recall."
  });

  assert.equal(result.sources.length, 6);
  assert.equal(result.literature.length, 6);
  assert.deepEqual(result.permanent, []);
  assert.deepEqual(result.literature.map((item) => item.notebook_input_type), [
    "summary",
    "summary",
    "study_guide",
    "study_guide",
    "qa",
    "note"
  ]);
  assert.deepEqual(result.literature.map((item) => item.candidate_kind), [
    "claim",
    "limitation",
    "method",
    "question",
    "question",
    "quote"
  ]);
  assert.equal(result.literature[2].quote_text, "Method: compare rereading and retrieval groups.");
  assert.match(result.literature[4].quote_text, /Question: What did the study find\?/);
  assert.match(result.literature[4].quote_text, /Answer: Result: retrieval practice improved delayed recall\./);
  assert.ok(result.literature.every((item) => item.notebook === "Paper Notebook"));
});

test("buildExternalCandidates returns a warning for empty payloads", () => {
  const result = buildExternalCandidates("zotero", {});
  assert.deepEqual(result.sources, []);
  assert.deepEqual(result.literature, []);
  assert.equal(result.warnings[0].code, "IMPORT_EMPTY_PAYLOAD");
});
