import test from "node:test";
import assert from "node:assert/strict";
import { captureImportPreviewFocus, restoreImportPreviewFocus, handleImportResultDialogKey, createImportResultDialogController, captureImportResultDisclosures, restoreImportResultDisclosures } from "../../apps/web/src/import-result-focus.js";

test("receipt disclosures remain open on pagination and selected skip reasons reveal candidates", () => {
  const sections = { "result-candidates-detail": { open: true }, "result-skip-detail": { open: true }, "result-json": { open: false } };
  const root = { querySelector: selector => sections[selector.slice(1)] };
  const state = captureImportResultDisclosures(root);
  assert.deepEqual(state, ["result-candidates-detail", "result-skip-detail"]);
  sections["result-candidates-detail"].open = false;
  sections["result-skip-detail"].open = false;
  restoreImportResultDisclosures(root, state);
  assert.equal(sections["result-candidates-detail"].open, true);
  assert.equal(sections["result-skip-detail"].open, true);
  assert.equal(sections["result-json"].open, false);
  sections["result-candidates-detail"].open = false;
  restoreImportResultDisclosures(root, [], { focusCandidates: true });
  assert.equal(sections["result-candidates-detail"].open, true);
});

test("a disabled next-page button returns keyboard focus to the page selector", () => {
  let focused = false;
  const button = { disabled: true, tagName: "BUTTON", getAttribute: () => "next", focus: () => assert.fail("Disabled focus") };
  const root = { querySelectorAll: () => [button], querySelector: () => ({ focus: () => { focused = true; } }) };
  restoreImportPreviewFocus(root, { attribute: "data-candidate-page", value: "next", tagName: "BUTTON" });
  assert.equal(focused, true);
});

test("clearing receipt focus restores a visible candidate navigation control", () => {
  let focused = false;
  const root = { querySelectorAll: () => [], querySelector: selector => selector === '[data-candidate-page-select]' ? { focus: () => { focused = true; } } : null };
  restoreImportPreviewFocus(root, { attribute: "data-clear-candidate-focus", value: "1", tagName: "BUTTON" });
  assert.equal(focused, true);
});

test("preview refresh restores the same checkbox identifier, including quoted identifiers", () => {
  const value = 'note-"quoted"';
  let focused = false;
  const original = { tagName: "INPUT", hasAttribute: name => name === "data-candidate-id", getAttribute: () => value };
  const replacement = { tagName: "INPUT", getAttribute: () => value, focus: options => { focused = options.preventScroll; } };
  const root = { ownerDocument: { activeElement: original }, contains: node => node === original, querySelectorAll: () => [replacement] };
  restoreImportPreviewFocus(root, captureImportPreviewFocus(root));
  assert.equal(focused, true);
  root.contains = () => false;
  assert.equal(captureImportPreviewFocus(root), null);
});

function keyboardHarness() {
  let hidden = false;
  let focused = "";
  let dismissed = false;
  let prevented = false;
  let stopped = false;
  const control = id => ({ id, tabIndex: 0, getClientRects: () => [1], focus: () => { focused = id; } });
  const first = control("first");
  const last = control("last");
  const invisible = { ...control("hidden"), getClientRects: () => [] };
  const modal = { classList: { contains: () => hidden }, ownerDocument: { activeElement: last }, querySelectorAll: () => [first, invisible, last] };
  return {
    first, last, modal, setHidden: () => { hidden = true; },
    key: overrides => handleImportResultDialogKey({
      key: "Tab", preventDefault: () => { prevented = true; }, stopImmediatePropagation: () => { stopped = true; }, ...overrides
    }, modal, () => { dismissed = true; }),
    result: () => ({ focused, dismissed, prevented, stopped })
  };
}

test("preview dialog traps Tab and Shift+Tab around visible controls only", () => {
  const h = keyboardHarness();
  h.key({});
  assert.equal(h.result().focused, "first");
  h.modal.ownerDocument.activeElement = h.first;
  h.key({ shiftKey: true });
  assert.equal(h.result().focused, "last");
});

test("Escape dismisses the dialog without propagating to the underlying workspace", () => {
  const h = keyboardHarness();
  h.key({ key: "Escape" });
  assert.deepEqual(h.result(), { focused: "", dismissed: true, prevented: true, stopped: true });
});

for (const [label, options] of [
  ["composition", { key: "Escape", isComposing: true }],
  ["handled event", { key: "Escape", defaultPrevented: true }],
  ["nested dialog", { key: "Escape", target: { closest: () => ({}) } }],
  ["browser shortcut", { key: "Tab", ctrlKey: true }]
]) {
  test(`preview keyboard handling does not interfere with ${label}`, () => {
    const h = keyboardHarness();
    h.key(options);
    assert.equal(h.result().dismissed, false);
    assert.equal(h.result().prevented, false);
  });
}

test("a hidden result dialog does not handle keyboard events", () => {
  const h = keyboardHarness();
  h.setHidden();
  h.key({ key: "Escape" });
  assert.equal(h.result().dismissed, false);
});

function resultDialogHarness() {
  const doc = { activeElement: null };
  const hidden = new Set(["hidden"]);
  const focusable = id => ({ id, isConnected: true, focus: () => { doc.activeElement = elements[id]; } });
  const elements = {
    importOperationResultModal: { ownerDocument: doc, classList: {
      contains: value => hidden.has(value), add: value => hidden.add(value), remove: value => hidden.delete(value)
    } },
    importOperationResultTitle: {}, importResult: {}, exportResult: {}, importPreviewActions: {},
    btnImportPreview: focusable("btnImportPreview"), btnExportMarkdown: focusable("btnExportMarkdown"),
    btnCloseImportOperationResult: focusable("btnCloseImportOperationResult"), customEntry: focusable("customEntry")
  };
  const importState = {};
  return { doc, elements, importState, controller: createImportResultDialogController({ getElement: id => elements[id], importState }) };
}

test("result dialog opens the correct mode and a refresh preserves its original return focus", () => {
  const h = resultDialogHarness();
  h.doc.activeElement = h.elements.customEntry;
  h.controller.show("export", "导出结果");
  assert.equal(h.importState.operationResultVisible, true);
  assert.equal(h.importState.operationResultMode, "export");
  assert.equal(h.elements.importOperationResultTitle.textContent, "导出结果");
  assert.equal(h.elements.importResult.hidden, true);
  assert.equal(h.elements.exportResult.hidden, false);
  assert.equal(h.elements.importPreviewActions.hidden, true);
  assert.equal(h.doc.activeElement, h.elements.btnCloseImportOperationResult);
  h.controller.show("export", "导出完成");
  h.controller.hide();
  assert.equal(h.importState.operationResultVisible, false);
  assert.equal(h.doc.activeElement, h.elements.customEntry);
});

test("result dialog returns to the current entry button when the original was replaced", () => {
  const h = resultDialogHarness();
  h.doc.activeElement = h.elements.customEntry;
  h.controller.show("import");
  h.elements.customEntry.isConnected = false;
  h.controller.hide();
  assert.equal(h.doc.activeElement, h.elements.btnImportPreview);
  h.doc.activeElement = h.elements.customEntry;
  h.controller.show("export");
  h.controller.hide();
  assert.equal(h.doc.activeElement, h.elements.btnExportMarkdown);
});

for (const original of ["BODY", "HTML", "disabled"]) {
  test(`result dialog does not return focus to ${original} after a pending read`, () => {
    const h = resultDialogHarness();
    h.doc.activeElement = { tagName: original, disabled: original === "disabled", isConnected: true,
      focus: () => assert.fail("non-actionable return target") };
    h.controller.show("import");
    h.controller.hide();
    assert.equal(h.doc.activeElement, h.elements.btnImportPreview);
  });
}
