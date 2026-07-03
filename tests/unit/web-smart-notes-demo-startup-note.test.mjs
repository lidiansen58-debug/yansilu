import assert from "node:assert/strict";
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
