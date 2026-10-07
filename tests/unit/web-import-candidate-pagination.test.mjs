import test from "node:test";
import assert from "node:assert/strict";
import { importCandidatePage, importPreviewPageForState, changeImportPreviewPage } from "../../apps/web/src/import-candidate-pagination.js";
import { renderCandidatePreview } from "../../apps/web/src/import-candidate-preview-panel.js";

const items = (prefix, length, type) => Array.from({ length }, (_, index) => ({ id: `${prefix}_${index}`, title: `${prefix} ${index}`, type }));
const preview = { literatureNotes: items("ln", 8, "LiteratureNote"), permanentNotes: items("pn", 20, "PermanentNote"), sources: items("src", 3, "Source") };

test("pages cover all candidates exactly once in note-first order and never alter selection", () => {
  const summary = { selectedIds: new Set(["pn_13"]), totalCount: 31, selectedCount: 1, excludedCount: 30 };
  const seen = [];
  for (let page = 1; page <= 3; page += 1) {
    const model = importCandidatePage(preview, { interactive: true, page, summary });
    const ids = model.groups.flatMap(group => group.items.map(item => item.id));
    seen.push(...ids);
    assert.ok(ids.length <= 12);
    assert.equal(model.pageCount, 3);
    const html = renderCandidatePreview(preview, { interactive: true, page, summary });
    assert.equal((html.match(/class="candidate-checkbox"/g) || []).length, ids.length);
    assert.match(html, /data-candidate-page-select/);
  }
  assert.deepEqual(seen, [...preview.literatureNotes, ...preview.permanentNotes, ...preview.sources].map(item => item.id));
  assert.deepEqual([...summary.selectedIds], ["pn_13"]);
});

test("risk filters include later pages and returned receipts reveal every skipped note", () => {
  const data = { permanentNotes: items("pn", 30, "PermanentNote").map((item, index) => ({
    ...item, originalityStatus: index >= 15 ? "blocked" : "pass"
  })) };
  const blocked = importCandidatePage(data, { interactive: true, focusReason: "blocked", page: 2 });
  assert.equal(blocked.total, 15);
  assert.deepEqual(blocked.groups[0].items.map(item => item.id), ["pn_27", "pn_28", "pn_29"]);
  const receipt = importCandidatePage(data, { focusCandidateIds: ["pn_29"] });
  assert.deepEqual(receipt.groups[0].items.map(item => item.id), ["pn_29"]);
  const receiptHtml = renderCandidatePreview(data, { focusCandidateIds: ["pn_29"], focusReason: "invalid" });
  assert.match(receiptHtml, /data-candidate-id="pn_29"/);
  assert.doesNotMatch(receiptHtml, /data-candidate-id="pn_0"/);
});

test("pages clamp after selection or filter changes and reset only for a changed context", () => {
  const state = {};
  const context = { importRecordId: "imp_1", stage: "preview", focusReason: "" };
  assert.equal(importPreviewPageForState(state, context), 1);
  changeImportPreviewPage(state, "next");
  assert.equal(importPreviewPageForState(state, context), 2);
  changeImportPreviewPage(state, 999);
  const model = importCandidatePage(preview, { page: state.candidatePage });
  assert.equal(model.page, 3);
  state.candidatePage = model.page;
  changeImportPreviewPage(state, "previous");
  assert.equal(state.candidatePage, 2);
  for (const changed of [{ focusReason: "excluded" }, { importRecordId: "imp_2" }, { stage: "confirm" }]) {
    changeImportPreviewPage(state, 3);
    assert.equal(importPreviewPageForState(state, { ...context, ...changed }), 1);
  }
  assert.equal(importCandidatePage(null).total, 0);
  assert.equal(importCandidatePage(preview, { page: NaN }).page, 1);
  assert.equal(importCandidatePage(preview, { page: -99 }).page, 1);
});

test("large preview keeps candidate DOM bounded and counts global selection", () => {
  const data = { permanentNotes: items("pn", 1000, "PermanentNote") };
  const html = renderCandidatePreview(data, { interactive: true, page: 84,
    summary: { selectedIds: new Set(data.permanentNotes.map(item => item.id)), selectedCount: 1000, totalCount: 1000, excludedCount: 0 } });
  assert.equal((html.match(/class="candidate-checkbox"/g) || []).length, 4);
  assert.match(html, /已选 1000\/1000/);
  assert.match(html, /data-candidate-id="pn_999"/);
  assert.match(html, /data-candidate-page="next"[^>]* disabled/);
});
