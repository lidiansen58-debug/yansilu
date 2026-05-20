import test from "node:test";
import assert from "node:assert/strict";

import {
  relationCreateDefaultTypeForNote,
  relationTypeGuidance,
  sortRelationTargetCandidatesForNote
} from "../../apps/web/src/components-editor-pane.js";

test("relation guidance defaults to counterexample when note body signals a counterexample", () => {
  const note = {
    body: "# Note\n\n这个反例说明原判断并不总成立。"
  };

  assert.equal(relationCreateDefaultTypeForNote(note), "counterexample_to");
});

test("relation guidance defaults to qualifies when note carries a boundary signal", () => {
  const note = {
    body: "# Note\n\n这里需要说明适用条件。",
    boundaryOrCounterpoint: "只在样本足够大时成立。"
  };

  assert.equal(relationCreateDefaultTypeForNote(note), "qualifies");
  const guidance = relationTypeGuidance("qualifies");
  assert.match(guidance.rationalePlaceholder, /边界|条件|例外/);
  assert.match(guidance.questionPlaceholder, /条件/);
});

test("relation guidance defaults to example_of when note body reads like an example", () => {
  const note = {
    body: "# Note\n\n例如，这条笔记提供了一个具体场景。"
  };

  assert.equal(relationCreateDefaultTypeForNote(note), "example_of");
  const guidance = relationTypeGuidance("example_of");
  assert.match(guidance.rationalePlaceholder, /具体例子|例子/);
});

test("relation guidance defaults to same_topic when note already contains links or tags", () => {
  const withLink = {
    body: "# Note\n\n[[Linked Note]]"
  };
  const withTag = {
    body: "# Note\n\n#主题"
  };

  assert.equal(relationCreateDefaultTypeForNote(withLink), "same_topic");
  assert.equal(relationCreateDefaultTypeForNote(withTag), "same_topic");
  const guidance = relationTypeGuidance("same_topic");
  assert.match(guidance.rationaleHint, /共享的是哪个主题|标签相同/);
});

test("relation guidance falls back to supports when no stronger signal exists", () => {
  const note = {
    body: "# Note\n\nThis is a plain claim without stronger relation hints."
  };

  assert.equal(relationCreateDefaultTypeForNote(note), "supports");
  const guidance = relationTypeGuidance("supports");
  assert.match(guidance.rationalePlaceholder, /因为/);
  assert.match(guidance.questionPlaceholder, /新问题/);
  assert.doesNotMatch(guidance.questionHint, /\$\{/);
  assert.match(guidance.questionHint, /最值得验证的疑问/);
});

test("relation target sorting prioritizes linked notes over tag-only and plain candidates", () => {
  const note = {
    folderId: "dir_original_default",
    body: "# Note\n\n[[Linked Note]] #topic"
  };
  const candidates = [
    {
      id: "plain",
      title: "Plain Note",
      folderId: "dir_original_default",
      body: "# Plain\n\nNo shared signals."
    },
    {
      id: "tagged",
      title: "Tagged Note",
      folderId: "dir_original_default",
      body: "# Tagged\n\n#topic"
    },
    {
      id: "linked",
      title: "Linked Note",
      folderId: "dir_original_default",
      body: "# Linked\n\nSome text."
    }
  ];

  const sorted = sortRelationTargetCandidatesForNote(candidates, note);
  assert.deepEqual(
    sorted.map((item) => item.id),
    ["linked", "tagged", "plain"]
  );
});

test("relation target sorting favors same-folder notes with thesis over weaker equal-score candidates", () => {
  const note = {
    folderId: "dir_original_method",
    body: "# Note\n\nNo explicit links or tags here."
  };
  const candidates = [
    {
      id: "same-folder-thesis",
      title: "Same Folder Thesis",
      folderId: "dir_original_method",
      thesis: "A reusable judgment."
    },
    {
      id: "other-folder",
      title: "Other Folder",
      folderId: "dir_original_default"
    }
  ];

  const sorted = sortRelationTargetCandidatesForNote(candidates, note);
  assert.deepEqual(
    sorted.map((item) => item.id),
    ["same-folder-thesis", "other-folder"]
  );
});
