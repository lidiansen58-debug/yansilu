const CONTROL_SELECTOR = 'button, input, textarea, select, summary, a[href], [tabindex]';
const IDENTITY_ATTRIBUTES = [
  "id", "name", "data-permanent-workspace-tab", "data-relation-action",
  "data-relation-id", "data-relation-tab", "data-preview-note", "data-note-association-next"
];

export function captureWorkspaceFocus(workspace) {
  const focused = workspace?.ownerDocument?.activeElement;
  if (!focused || !workspace.contains(focused)) return null;
  const identity = IDENTITY_ATTRIBUTES
    .map(name => [name, focused.getAttribute(name)])
    .filter(([, value]) => value !== null);
  if (["checkbox", "radio"].includes(focused.type)) identity.push(["value", focused.getAttribute("value")]);
  return {
    tag: focused.tagName,
    identity,
    index: [...workspace.querySelectorAll(CONTROL_SELECTOR)].indexOf(focused),
    start: focused.selectionStart,
    end: focused.selectionEnd,
    direction: focused.selectionDirection,
    scrollTop: workspace.closest("#resultArea")?.scrollTop
  };
}

export function restoreWorkspaceFocus(workspace, snapshot) {
  if (!workspace || !snapshot || !workspace.getClientRects().length) return;
  const controls = [...workspace.querySelectorAll(CONTROL_SELECTOR)];
  const target = controls.find((control, index) => control.tagName === snapshot.tag &&
    (snapshot.identity.length ? snapshot.identity.every(([name, value]) => control.getAttribute(name) === value) : index === snapshot.index) &&
    !control.disabled && control.getClientRects().length);
  const fallback = workspace.querySelector('[data-permanent-workspace-tab][aria-selected="true"]') ||
    controls.find(control => !control.disabled && control.getClientRects().length);
  (target || fallback)?.focus({ preventScroll: true });
  if (target && Number.isInteger(snapshot.start) && typeof target.setSelectionRange === "function") {
    target.setSelectionRange(snapshot.start, snapshot.end, snapshot.direction || "none");
  }
  const scroller = workspace.closest("#resultArea");
  if (scroller && Number.isFinite(snapshot.scrollTop)) scroller.scrollTop = snapshot.scrollTop;
}
