export function captureImportPreviewFocus(root) {
  const active = root?.ownerDocument?.activeElement;
  if (!active || !root.contains(active)) return null;
  const attribute = ["data-candidate-action", "data-candidate-filter", "data-candidate-id", "data-candidate-page", "data-candidate-page-select", "data-clear-candidate-focus", "data-skip-focus"]
    .find(name => active.hasAttribute(name));
  return attribute ? { attribute, value: active.getAttribute(attribute), tagName: active.tagName } : null;
}

export function restoreImportPreviewFocus(root, focus) {
  if (!focus) return;
  const replacement = [...root.querySelectorAll(`[${focus.attribute}]`)]
    .find(node => node.tagName === focus.tagName && node.getAttribute(focus.attribute) === focus.value);
  const fallback = !replacement || replacement.disabled
    ? root.querySelector?.('[data-candidate-page-select]') || root.querySelector?.('.result-candidates-detail summary') : null;
  (replacement && !replacement.disabled ? replacement : fallback)?.focus({ preventScroll: true });
}

const resultDisclosureClasses = ["result-candidates-detail", "result-skip-detail", "result-writing-detail", "result-json"];
export function captureImportResultDisclosures(root) {
  return resultDisclosureClasses.filter(name => root?.querySelector?.(`.${name}`)?.open);
}

export function restoreImportResultDisclosures(root, classes = [], { focusCandidates = false } = {}) {
  for (const name of new Set([...classes, ...(focusCandidates ? ["result-candidates-detail"] : [])])) {
    const disclosure = root?.querySelector?.(`.${name}`);
    if (disclosure) disclosure.open = true;
  }
}

export function handleImportResultDialogKey(event, modal, dismiss) {
  if (!modal || modal.classList.contains("hidden") || event.defaultPrevented || event.isComposing) return;
  const dialog = event.target?.closest?.('[role="dialog"], [role="alertdialog"]');
  if (dialog && dialog !== modal) return;
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopImmediatePropagation();
    dismiss();
    return;
  }
  if (event.key !== "Tab" || event.ctrlKey || event.metaKey || event.altKey) return;
  const controls = [...modal.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary, [tabindex]")]
    .filter(node => node.tabIndex >= 0 && node.getClientRects().length > 0);
  if (!controls.length) return;
  const active = modal.ownerDocument.activeElement;
  const outside = !controls.includes(active);
  if (outside || (event.shiftKey ? active === controls[0] : active === controls.at(-1))) {
    event.preventDefault();
    (event.shiftKey ? controls.at(-1) : controls[0]).focus();
  }
}
export function createImportResultDialogController({ getElement, importState }) {
  let returnFocus = null;
  let returnButtonId = "btnImportPreview";
  function show(mode = "import", title = "操作结果") {
    importState.operationResultVisible = true;
    importState.operationResultMode = mode;
    const modal = getElement("importOperationResultModal");
    const titleEl = getElement("importOperationResultTitle");
    const importResult = getElement("importResult");
    const exportResult = getElement("exportResult");
    if (!modal) return;
    const opening = modal.classList.contains("hidden");
    if (opening) {
      returnFocus = modal.ownerDocument?.activeElement;
      if (["BODY", "HTML"].includes(returnFocus?.tagName) || returnFocus?.disabled) returnFocus = null;
      returnButtonId = mode === "export" ? "btnExportMarkdown" : "btnImportPreview";
    }
    if (titleEl) titleEl.textContent = title;
    if (importResult) importResult.hidden = mode !== "import";
    if (exportResult) exportResult.hidden = mode !== "export";
    if (mode !== "import") {
      const actions = getElement("importPreviewActions");
      if (actions) actions.hidden = true;
    }
    modal.classList.remove("hidden");
    if (opening) getElement("btnCloseImportOperationResult")?.focus?.({ preventScroll: true });
  }
  function hide() {
    importState.operationResultVisible = false;
    getElement("importOperationResultModal")?.classList.add("hidden");
    const target = returnFocus?.isConnected ? returnFocus : getElement(returnButtonId);
    target?.focus?.({ preventScroll: true });
    returnFocus = null;
  }
  return { show, hide };
}
