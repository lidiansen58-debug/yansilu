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
    noteAiSuggestionsSummaryLabel: () => "0",
    noteAiSuggestionsStateForNote: () => ({ items: [], loading: false, error: "" })
  });
}

test("permanent-note distillation shows one next action and a compact readiness checklist", () => {
  const pane = createPane();
  const html = pane.renderPermanentNoteDistillationSection({
    id: "pn_missing_thesis",
    title: "Needs viewpoint",
    body: "# Needs viewpoint",
    status: "active",
    distillationStatus: "missing"
  });

  assert.match(html, /data-note-distillation-next/);
  assert.match(html, /data-note-distillation-focus="thesis"/);
  assert.match(html, /data-note-distillation-readiness/);
  assert.match(html, /完成条件/);
  assert.match(html, /待提纯/);
  assert.match(html, /一句话判断/);
  assert.match(html, /三句话压缩/);
  assert.match(html, /边界或反方/);
  assert.match(html, /用户确认/);
  assert.match(html, />保存草稿</);
  assert.match(html, />确认观点</);
  assert.doesNotMatch(html, /distillation-path-strip/);
  assert.doesNotMatch(html, /证据 \/ 来源/);
  assert.doesNotMatch(html, /写作可用性/);
  assert.doesNotMatch(html, />missing</);
});

test("distillation next action moves through summary, boundary, confirmation, and relations", () => {
  const pane = createPane();
  const summaryHtml = pane.renderPermanentNoteDistillationSection({
    id: "pn_needs_summary",
    title: "Needs summary",
    body: "# Needs summary",
    status: "active",
    thesis: "稳定观点需要知道自己的反例。",
    threeLineSummary: ["观点要能被复用。"],
    distillationStatus: "draft"
  });
  const boundaryHtml = pane.renderPermanentNoteDistillationSection({
    id: "pn_needs_boundary",
    title: "Needs boundary",
    body: "# Needs boundary",
    status: "active",
    thesis: "稳定观点需要知道自己的反例。",
    threeLineSummary: ["观点要能被复用。", "边界能防止误用。", "写作时可以提前处理反方。"],
    distillationStatus: "draft"
  });
  const confirmHtml = pane.renderPermanentNoteDistillationSection({
    id: "pn_needs_confirm",
    title: "Needs confirm",
    body: "# Needs confirm",
    status: "active",
    thesis: "稳定观点需要知道自己的反例。",
    threeLineSummary: ["观点要能被复用。", "边界能防止误用。", "写作时可以提前处理反方。"],
    boundaryOrCounterpoint: "如果只是临时观察，就不能直接当作稳定判断。",
    distillationStatus: "draft"
  });
  const relationsHtml = pane.renderPermanentNoteDistillationSection({
    id: "pn_confirmed",
    title: "Confirmed",
    body: "# Confirmed",
    status: "active",
    thesis: "稳定观点需要知道自己的反例。",
    threeLineSummary: ["观点要能被复用。", "边界能防止误用。", "写作时可以提前处理反方。"],
    boundaryOrCounterpoint: "如果只是临时观察，就不能直接当作稳定判断。",
    distillationStatus: "confirmed"
  });

  assert.match(summaryHtml, /data-note-distillation-focus="summary2"/);
  assert.match(boundaryHtml, /data-note-distillation-focus="boundary"/);
  assert.match(confirmHtml, /data-note-distillation-focus="confirm"/);
  assert.match(relationsHtml, /data-note-distillation-focus="relations"/);
  assert.match(relationsHtml, /4\/4/);
});

test("distillation focus action switches to the relations tab before jumping to relations", () => {
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/components-editor-pane.js"), "utf8");
  const start = source.indexOf('const distillationFocusButton = e.target.closest("[data-note-distillation-focus]")');
  const end = source.indexOf('const distillationConfirmButton = e.target.closest("[data-note-distillation-confirm]")', start);

  assert.ok(start >= 0 && end > start, "expected distillation focus handler");
  const handler = source.slice(start, end);

  assert.match(handler, /target === "confirm"/);
  assert.match(handler, /void this\.confirmDistillation\(\)/);
  assert.match(handler, /target === "relations"/);
  assert.match(handler, /this\.activatePermanentWorkspaceTab\("relations"\)/);
  assert.match(handler, /textarea\[name="boundaryOrCounterpoint"\]/);
  assert.match(handler, /textarea\[name="\$\{target\}"\]/);
  assert.match(handler, /textarea\[name="thesis"\]/);
});
