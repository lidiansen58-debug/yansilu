import test from "node:test";
import assert from "node:assert/strict";

import {
  createWritingBookRuntime,
  writingBookPlainText,
  writingBookShortText
} from "../../apps/web/src/writing-book-runtime.js";

function selector(values) {
  return (id) => ({ value: values[id] || "" });
}

test("writing book runtime derives project fields from current writing state and form values", () => {
  const formValues = {
    writingTitle: "Input Title",
    writingGoal: "Input Goal",
    writingAudience: "Input Audience"
  };
  const writingState = {
    project: {
      title: "Project Title",
      goal: "",
      audience: "Project Audience"
    }
  };
  const runtime = createWritingBookRuntime({
    $: selector(formValues),
    writingState,
    writingBasketEntries: () => []
  });

  assert.equal(runtime.writingBookProjectGoal(), "Input Goal");
  assert.equal(runtime.writingBookProjectAudience(), "Project Audience");

  writingState.project = null;

  assert.equal(runtime.writingBookProjectGoal(), "Input Goal");
  assert.equal(runtime.writingBookProjectAudience(), "Input Audience");
});

test("writing book runtime builds design and local ideas from the current basket", () => {
  const note = {
    id: "n1",
    title: "Decision note",
    thesis: "A clear claim",
    boundaryOrCounterpoint: "A useful boundary",
    body: "案例 and 风险"
  };
  const writingState = {
    project: null,
    scaffold: null,
    localBookIdeas: [{ title: "Local direction", noteIds: ["n1"] }]
  };
  const runtime = createWritingBookRuntime({
    $: selector({ writingTitle: "Runtime Title" }),
    writingState,
    writingBasketEntries: () => [note]
  });

  const design = runtime.deriveWritingBookDesign();
  const ideas = runtime.deriveWritingLocalBookIdeas();
  const structure = runtime.currentWritingBookStructure();

  assert.ok(design.parts.length > 0);
  assert.equal(ideas.length, 3);
  assert.equal(structure.direction_ideas.some((item) => item.title === "Local direction"), true);
});

test("writing book runtime re-exports stable note text helpers", () => {
  assert.match(writingBookPlainText({ title: "Title", body: "Body" }), /Body/);
  assert.equal(writingBookShortText("alpha beta", 5), "alpha...");
});

test("book structure normalization and local direction updates preserve chapter draft bindings", () => {
  const project = {
    book_structure: {
      schema_version: 1,
      parts: [{ id: "part_1", chapters: [
        { id: "chapter_1", title: "First", draftNoteId: " pn_first ", evidence_note_ids: ["source_1"] },
        { id: "chapter_2", title: "Second", draft_note_id: "pn_second" },
        { id: "chapter_3", title: "Unwritten" }
      ] }]
    }
  };
  const runtime = createWritingBookRuntime({ writingState: { project, localBookIdeas: [{ title: "A direction" }] } });
  const chapters = runtime.currentWritingBookStructure().parts[0].chapters;
  assert.equal(chapters[0].draft_note_id, "pn_first");
  assert.deepEqual(chapters[0].evidence_note_ids, ["source_1"]);
  assert.equal(chapters[1].draft_note_id, "pn_second");
  assert.equal(Object.hasOwn(chapters[2], "draft_note_id"), false);
  assert.deepEqual(runtime.normalizeWritingBookStructure(runtime.currentWritingBookStructure()).parts[0].chapters, chapters);
});
