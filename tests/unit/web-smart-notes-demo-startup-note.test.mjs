import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  smartNotesDemoStartupNoteId
} from "../../apps/web/src/smart-notes-demo-startup-note.js";

test("smart notes demo startup prefers the returned guide note when it exists", () => {
  assert.equal(smartNotesDemoStartupNoteId({
    result: { firstNoteId: "guide-00" },
    notes: [{ id: "guide-00", title: "00 从这里开始：10 分钟走完研思录" }]
  }), "guide-00");
});

test("smart notes demo startup falls back to the 00 guide title", () => {
  assert.equal(smartNotesDemoStartupNoteId({
    result: { firstNoteId: "missing" },
    notes: [
      { id: "n1", title: "普通笔记" },
      { id: "guide-00", title: "00 从这里开始：10 分钟走完研思录" }
    ]
  }), "guide-00");
});

test("smart notes demo import reopens the guide after the final render", () => {
  const source = fs.readFileSync("apps/web/src/prototype-app.js", "utf8");

  assert.match(source, /renderAll\(\);\s*if \(firstNoteId\) \{\s*state\.selectedFileId = firstNoteId;\s*openNoteById\(firstNoteId, \{ preferTitleSelection: false \}\);/);
});

test("smart notes demo startup falls back to an existing guide when seed is locked", () => {
  const source = fs.readFileSync("apps/web/src/prototype-app.js", "utf8");

  assert.match(source, /await syncDirectoriesFromApi\(\);/);
  assert.match(source, /await syncNotesForDirectory\(demoFolder\.id\);/);
  assert.match(source, /const fallbackNoteId = smartNotesDemoStartupNoteId\(\{ result: \{\}, notes: state\.notes \}\);/);
  assert.match(source, /openNoteById\(fallbackNoteId, \{ preferTitleSelection: false \}\);/);
});
