import test from "node:test";
import assert from "node:assert/strict";

import {
  hasRequiredLiteratureCitation,
  literatureQueueLaneForNote,
  preferredLiteratureQueueNoteId,
  rankedLiteratureQueueNotes
} from "../../apps/web/src/prototype-literature-queue.js";

const normalizeFieldText = (value) => String(value || "").trim();
const sectionLabels = () => ["stub"];
const parseFields = (fields) => () => fields;
const depsFor = (fields) => ({
  literatureTemplateSectionLabelCandidates: sectionLabels,
  normalizeFieldText,
  parseLiteratureWorkspace: parseFields(fields)
});

test("prototype literature queue helper validates required citation fields", () => {
  assert.equal(hasRequiredLiteratureCitation({
    sourceTitle: "Title",
    authors: "Author",
    year: "2026",
    locator: "p.1",
    identifier: "doi"
  }, { normalizeFieldText }), true);
  assert.equal(hasRequiredLiteratureCitation({ sourceTitle: "Title" }, { normalizeFieldText }), false);
});

test("prototype literature queue helper classifies note lanes", () => {
  assert.equal(literatureQueueLaneForNote({}, depsFor({ originalText: "", citation: {} })), "refine");
  assert.equal(literatureQueueLaneForNote({}, depsFor({
    originalText: "quote",
    citation: { sourceTitle: "T", authors: "A", year: "Y", locator: "L", identifier: "I" }
  })), "pending");
  assert.equal(literatureQueueLaneForNote({}, depsFor({
    originalText: "quote",
    paraphrase: "para",
    citation: { sourceTitle: "T", authors: "A", year: "Y", locator: "L", identifier: "I" }
  })), "refine");
  assert.equal(literatureQueueLaneForNote({}, depsFor({
    originalText: "quote",
    paraphrase: "para",
    question: "q",
    citation: { sourceTitle: "T", authors: "A", year: "Y", locator: "L", identifier: "I" }
  })), "ready");
});

test("prototype literature queue helper ranks by lane, time, and title", () => {
  const laneById = new Map([
    ["ready", "ready"],
    ["pending-old", "pending"],
    ["pending-new", "pending"]
  ]);
  const ranked = rankedLiteratureQueueNotes([
    { id: "ready", body: "ready", title: "Ready", updatedAt: "2026-01-03" },
    { id: "pending-old", body: "pending-old", title: "Old", updatedAt: "2026-01-01" },
    { id: "pending-new", body: "pending-new", title: "New", updatedAt: "2026-01-02" }
  ], {
    literatureTemplateSectionLabelCandidates: sectionLabels,
    normalizeFieldText,
    parseLiteratureWorkspace: (_body, _options) => {
      const id = _body;
      return laneById.get(id) === "ready"
        ? {
            originalText: "quote",
            paraphrase: "para",
            question: "q",
            citation: { sourceTitle: "T", authors: "A", year: "Y", locator: "L", identifier: "I" }
          }
        : {
            originalText: "quote",
            citation: { sourceTitle: "T", authors: "A", year: "Y", locator: "L", identifier: "I" }
          };
    }
  });

  assert.deepEqual(ranked.map((item) => item.note.id), ["pending-new", "pending-old", "ready"]);
});

test("prototype literature queue helper picks preferred note id", () => {
  const notes = new Map([
    ["a", { id: "a" }],
    ["b", { id: "b" }]
  ]);
  assert.equal(preferredLiteratureQueueNoteId(["a", "b"], { targetLane: "ready" }, {
    writingNoteById: (id) => notes.get(id),
    rankedLiteratureQueueNotes: () => [
      { note: notes.get("a"), lane: "pending" },
      { note: notes.get("b"), lane: "ready" }
    ]
  }), "b");
});
