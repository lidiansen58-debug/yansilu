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
  assert.equal(result.sources[0].imported_from, "notebooklm");
  assert.equal(result.literature[0].notebook, "Research Notebook");
  assert.equal(result.literature[0].quote_text, "Notebook synthesis output");
});

test("buildExternalCandidates returns a warning for empty payloads", () => {
  const result = buildExternalCandidates("zotero", {});
  assert.deepEqual(result.sources, []);
  assert.deepEqual(result.literature, []);
  assert.equal(result.warnings[0].code, "IMPORT_EMPTY_PAYLOAD");
});
