import test from "node:test";
import assert from "node:assert/strict";
import { renderWritingMaterials } from "../../apps/web/src/writing-materials-panel.js";
import { writingNoteExcerpt } from "../../apps/web/src/writing-note-summary.js";
import { escapeHtml } from "../../apps/web/src/editor-render-utils.js";
import { syncWritingManualThemeView } from "../../apps/web/src/writing-manual-theme-view.js";

function fixture(notes) {
  const nodes = new Map(["writingBasketList", "writingCandidateList", "writingCandidateSummary", "writingCandidateDetails", "btnWritingAddVisible"].map(id => [id, { innerHTML: "", textContent: "", open: true }]));
  const deps = { $: id => nodes.get(id), writingState: {}, parseWritingBasketIds: () => ["selected"],
    writingMaterialNotes: () => notes, isWritingEligibleNote: note => note.status === "active", escapeHtml, writingNoteExcerpt };
  const render = () => renderWritingMaterials(deps, { selectedNote: null, candidates: [], relatedEntries: notes.filter(note => note.id === "selected"), candidateFocusPlan: { usingFocusedScope: false } });
  return { deps, nodes, render };
}

test("pending notes can be confirmed in the same list and selected materials are not repeated", () => {
  const f = fixture([
    { id: "selected", title: "Already chosen", status: "active" },
    { id: "pn_pending", title: "自己的观点", thesis: "**清楚的判断** <!-- yansilu:metadata -->", status: "draft" },
    { id: "ready", title: "Ready", status: "active" }
  ]);
  f.render();
  const candidates = f.nodes.get("writingCandidateList").innerHTML;
  assert.doesNotMatch(candidates, /Already chosen/);
  assert.match(candidates, /data-writing-action="prepare" data-writing-note-id="pn_pending"/);
  assert.match(candidates, /确认并加入相关笔记/);
  assert.match(candidates, /data-writing-action="add" data-writing-note-id="ready"/);
  const visible = candidates.replace(/<[^>]*>/g, "");
  assert.doesNotMatch(visible, /pn_pending|yansilu:|\*\*|待加入主题/);
  assert.match(visible, /清楚的判断/);
  assert.doesNotMatch(f.nodes.get("writingBasketList").innerHTML, /尚未用于章节/);
});

test("the article being edited cannot become its own material", () => {
  const f = fixture([{ id: "draft", title: "Current article", status: "draft" }]);
  f.deps.writingState.project = { draft_note_id: "draft" };
  f.render();
  assert.equal(f.nodes.get("writingCandidateList").innerHTML, "");
});

test("an optional material read failure is distinguished from an empty library", () => {
  const f = fixture([]); f.deps.writingState.materialsError = "笔记暂未读取成功，请重新打开写作重试。";
  f.render();
  assert.match(f.nodes.get("writingCandidateSummary").textContent, /暂未读取成功/);
  assert.equal(f.nodes.get("writingCandidateList").innerHTML, "");
});

test("manual writing exposes outline navigation only when an actual outline exists", () => {
  const tab = {}, shell = { dataset: { writingActiveTab: "outline" }, querySelector: () => tab, querySelectorAll: () => [] };
  const writingState = { project: { id: "p", entry_mode: "manual" } };
  const deps = { $: id => id === "writingPanel" ? { querySelector: () => shell } : null, writingState };
  syncWritingManualThemeView(deps);
  assert.equal(tab.hidden, true); assert.equal(shell.dataset.writingActiveTab, "draft");
  writingState.project.scaffold_id = "outline";
  syncWritingManualThemeView(deps); assert.equal(tab.hidden, false);
  writingState.project = { id: "material-theme" };
  syncWritingManualThemeView(deps); assert.equal(tab.hidden, false);
});

test("material summaries prefer the judgment and strip body formatting and internal comments", () => {
  assert.equal(writingNoteExcerpt({ thesis: "自己的**判断**", body: "Ignore this body" }), "自己的判断");
  assert.equal(writingNoteExcerpt({ body: "# Title\n\n## Heading\n\n<!-- internal -->- See [[pn_abc|原笔记]] and [资料](https://example.com)." }), "See 原笔记 and 资料.");
  assert.equal(writingNoteExcerpt({ body: "参见 [[pn_123]]。" }), "参见 相关笔记。");
});
