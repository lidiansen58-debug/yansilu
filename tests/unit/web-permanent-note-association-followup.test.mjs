import test from "node:test";
import assert from "node:assert/strict";
import { PermanentNoteAssociationFollowup, renderPermanentNoteAssociationFollowup } from "../../apps/web/src/permanent-note-association-followup.js";
import { PermanentNoteDistillationController } from "../../apps/web/src/permanent-note-distillation-controller.js";

const savedNote = () => ({ id: "p1", thesis: "我的判断", distillationStatus: "confirmed" });

test("followup appears only after an explicit successful offer, not when opening an old note", () => {
  const next = new PermanentNoteAssociationFollowup();
  const note = savedNote();
  assert.equal(next.current(note, "a"), null);
  assert.equal(next.offer(note, "a"), true);
  const entry = next.current(note, "a");
  assert.equal(entry.thesis, "我的判断");
  const html = renderPermanentNoteAssociationFollowup(note, entry);
  assert.match(html, /观点已保存|先不关联|继续修改观点/);
  assert.equal((html.match(/class="mini-btn primary"/g) || []).length, 1);
  assert.doesNotMatch(html, /<form|role="dialog"|保存当前观点/);
});

test("skip is remembered for this judgment, while a changed judgment can offer a new next step", () => {
  const next = new PermanentNoteAssociationFollowup();
  const note = savedNote();
  next.offer(note, "a");
  const first = next.current(note, "a");
  assert.equal(next.dismiss(note, "a", first.token), true);
  assert.equal(next.offer(note, "a"), false);
  assert.equal(next.current(note, "a"), null);
  note.thesis = "更明确的判断";
  assert.equal(next.offer(note, "a"), true);
  assert.notEqual(next.current(note, "a").token, first.token);
  assert.equal(next.dismiss(note, "a", first.token), false);
});

test("another note, a draft, or another vault cannot inherit the saved next step", () => {
  const next = new PermanentNoteAssociationFollowup();
  const note = savedNote();
  next.offer(note, "a");
  assert.equal(next.current({ ...note, id: "other" }, "a"), null);
  assert.equal(next.current({ ...note, distillationStatus: "draft" }, "a"), null);
  assert.equal(next.current(note, "b"), null);
  assert.equal(next.current(note, "a"), null);
});

function controllerFixture({ open = true } = {}) {
  const note = savedNote();
  const calls = [];
  let scope = "a";
  const host = {
    activeNote: () => note,
    vaultScope: () => scope,
    openPermanentRelationWorkspace: (options) => { calls.push(["open", options]); return open; },
    renderRelated: () => calls.push(["render"]),
    setInspectorVisible: (visible) => calls.push(["inspector", visible]),
    jumpToInspectorSection: (...args) => calls.push(["edit", ...args]),
    onStatus: (...args) => calls.push(["status", ...args])
  };
  const controller = new PermanentNoteDistillationController(host);
  controller.associationFollowup.offer(note, scope);
  return { controller, note, calls, setScope: (value) => { scope = value; } };
}

test("association next step opens only the shared composer without invented targets or reasons", () => {
  const { controller, note, calls } = controllerFixture();
  const entry = controller.associationFollowup.current(note, "a");
  assert.equal(controller.handleAssociationNext("associate", note.id, entry.token), true);
  assert.deepEqual(calls, [["open", { noteId: note.id, mode: "manual" }], ["render"]]);
  assert.equal(controller.associationFollowup.current(note, "a"), null);
  assert.equal(controller.handleAssociationNext("associate", note.id, entry.token), false);
});

test("failure to open keeps the optional next step retryable and the judgment unchanged", () => {
  const { controller, note, calls } = controllerFixture({ open: false });
  const entry = controller.associationFollowup.current(note, "a");
  assert.equal(controller.handleAssociationNext("associate", note.id, entry.token), false);
  assert.equal(controller.associationFollowup.current(note, "a"), entry);
  assert.equal(note.thesis, "我的判断");
  assert.match(calls[1][1], /观点已保存，可以重试/);
});

test("skip closes existing inspector and does not open a composer or write note data", () => {
  const { controller, note, calls } = controllerFixture();
  const entry = controller.associationFollowup.current(note, "a");
  assert.equal(controller.handleAssociationNext("skip", note.id, entry.token), true);
  assert.deepEqual(calls, [["render"], ["inspector", false]]);
  assert.equal(controller.associationFollowup.offer(note, "a"), false);
});

test("stale UI actions from another vault or note do nothing", () => {
  const { controller, note, calls, setScope } = controllerFixture();
  const entry = controller.associationFollowup.current(note, "a");
  assert.equal(controller.handleAssociationNext("skip", "other", entry.token), false);
  setScope("b");
  assert.equal(controller.handleAssociationNext("associate", note.id, entry.token), false);
  assert.deepEqual(calls, []);
});

test("editing a saved judgment returns to the existing thesis form without opening a composer", () => {
  const { controller, note, calls } = controllerFixture();
  const entry = controller.associationFollowup.current(note, "a");
  assert.equal(controller.handleAssociationNext("edit", note.id, entry.token), true);
  assert.deepEqual(calls, [["render"], ["edit", "[data-note-distillation-section]", {
    focus: true, focusSelector: '[data-note-distillation-form] textarea[name="thesis"]'
  }]]);
  assert.equal(controller.associationFollowup.current(note, "a"), null);
  assert.equal(note.thesis, "我的判断");
});
