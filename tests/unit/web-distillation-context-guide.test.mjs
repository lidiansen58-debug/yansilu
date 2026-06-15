import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");

function createPane() {
  return Object.assign(Object.create(EditorPane.prototype), {
    resolvedNoteType: () => "permanent",
    currentDistillationPrefill: () => ({
      draftVariants: [],
      selectedTemplateVariant: "",
      rememberedTemplateVariantLabel: "",
      boundaryDraft: ""
    }),
    renderRelationNetworkPrompt: () => "",
    noteAiSuggestionsSummaryLabel: () => "0 条",
    noteAiSuggestionsStateForNote: () => ({ items: [], loading: false, error: "" })
  });
}

test("permanent-note distillation surfaces the current next step in context", () => {
  const pane = createPane();
  const html = pane.renderPermanentNoteDistillationSection({
    id: "pn_missing_thesis",
    title: "还没有判断",
    body: "# 还没有判断",
    status: "active",
    distillationStatus: "missing"
  });

  assert.match(html, /data-note-distillation-next/);
  assert.match(html, /当前下一步/);
  assert.match(html, /先把这条笔记变成一句判断/);
  assert.match(html, /data-note-distillation-focus="thesis"/);
  assert.match(html, /思想提纯如何接入图谱和写作/);
  assert.match(html, /笔记内成观点/);
  assert.match(html, /图谱里补关系/);
  assert.match(html, /写作前看边界/);
  assert.match(html, /写成“我认为 X，因为 Y”/);
});

test("distillation next step moves from boundary to confirmation", () => {
  const pane = createPane();
  const summaryHtml = pane.renderPermanentNoteDistillationSection({
    id: "pn_needs_summary",
    title: "需要三句话",
    body: "# 需要三句话",
    status: "active",
    thesis: "稳定观点需要知道自己的反例。",
    threeLineSummary: ["观点要能被复用。"],
    distillationStatus: "draft"
  });
  const boundaryHtml = pane.renderPermanentNoteDistillationSection({
    id: "pn_needs_boundary",
    title: "需要边界",
    body: "# 需要边界",
    status: "active",
    thesis: "稳定观点需要知道自己的反例。",
    threeLineSummary: ["观点要能被复用。", "边界能防止误用。", "写作时可以提前处理反方。"],
    distillationStatus: "draft"
  });
  const confirmHtml = pane.renderPermanentNoteDistillationSection({
    id: "pn_needs_confirm",
    title: "需要确认",
    body: "# 需要确认",
    status: "active",
    thesis: "稳定观点需要知道自己的反例。",
    threeLineSummary: ["观点要能被复用。", "边界能防止误用。", "写作时可以提前处理反方。"],
    boundaryOrCounterpoint: "如果只是临时观察，就不能直接当作稳定判断。",
    distillationStatus: "draft"
  });

  assert.match(summaryHtml, /把判断压成三句话/);
  assert.match(summaryHtml, /<span class="is-current">笔记内成观点<\/span>/);
  assert.doesNotMatch(summaryHtml, /<span class="is-current">图谱里补关系<\/span>/);
  assert.match(boundaryHtml, /补边界或反例/);
  assert.match(boundaryHtml, /data-note-distillation-focus="boundary"/);
  assert.match(boundaryHtml, /<span class="is-current">写作前看边界<\/span>/);
  assert.doesNotMatch(boundaryHtml, /<span class="is-current">图谱里补关系<\/span>/);
  assert.match(confirmHtml, /确认这条观点/);
  assert.match(confirmHtml, /data-note-distillation-focus="confirm"/);
  assert.match(confirmHtml, /<span class="is-current">图谱里补关系<\/span>/);
});

test("distillation focus action is wired to field focus and existing confirm behavior", () => {
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/components-editor-pane.js"), "utf8");
  const start = source.indexOf('const distillationFocusButton = e.target.closest("[data-note-distillation-focus]")');
  const end = source.indexOf('const distillationConfirmButton = e.target.closest("[data-note-distillation-confirm]")', start);

  assert.ok(start >= 0 && end > start, "expected distillation focus handler");
  const handler = source.slice(start, end);

  assert.match(handler, /target === "confirm"/);
  assert.match(handler, /void this\.confirmDistillation\(\)/);
  assert.match(handler, /target === "relations"/);
  assert.match(handler, /textarea\[name="boundaryOrCounterpoint"\]/);
  assert.match(handler, /textarea\[name="\$\{target\}"\]/);
  assert.match(handler, /textarea\[name="thesis"\]/);
});
