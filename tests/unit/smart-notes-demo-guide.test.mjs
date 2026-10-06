import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildExplorerSidebarFlowState } from "../../apps/web/src/app-shell-sidebar-flow.js";

const demo = JSON.parse(fs.readFileSync("tests/fixtures/demo-smart-notes-product-thinking/demo.json", "utf8"));
test("operation notes are ordinary editable content and cover the normal software functions", () => {
  const notes = demo.guide_notes;
  assert.equal(notes.length, 8);
  assert.ok(notes.every(note => note.note_type === "permanent" && note.thesis && note.body));
  for (const title of ["记录与整理", "阅读材料", "编辑观点", "关联笔记", "组织主题", "继续写作", "导出文章"]) {
    assert.ok(notes.some(note => note.title.startsWith(title)), title);
  }
  assert.doesNotMatch(JSON.stringify(demo), /每一步都从上方练习按钮|进度才会推进|六步分别要求|GUIDE-SHORT-PRACTICE|WRITE-SHORT-PRACTICE|deferScaffold/);
});

test("operation and writing notes link only to actual imported content", () => {
  const all = [demo.sources, demo.fleeting_notes, demo.literature_notes, demo.permanent_notes, demo.guide_notes, demo.final_essays, demo.index_cards].flat();
  const targets = new Set(all.flatMap(note => [note.id, note.title]));
  for (const note of [...demo.guide_notes, ...demo.final_essays]) {
    for (const match of note.body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
      assert.ok(targets.has(match[1]), `${note.title}: missing ${match[1]}`);
    }
  }
});

test("imported and legacy demo identifiers do not override the ordinary sidebar flow", () => {
  const normal = buildExplorerSidebarFlowState({ rootId: "dir_original_default", originalNotes: [] });
  const demoState = buildExplorerSidebarFlowState({ rootId: "dir_original_default", originalNotes: [], allNotes: [...demo.guide_notes, { id: "GUIDE-SHORT-PRACTICE" }, { id: "GUIDE-SMART-NOTES-START" }] });
  assert.deepEqual(demoState, normal);
});
