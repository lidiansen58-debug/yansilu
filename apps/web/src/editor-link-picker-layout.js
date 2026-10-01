// A filtered/painted editor can be the containing block of a fixed picker.
// Fit its actual bounds to the visible editor instead of assuming viewport coordinates.
export function fitLinkPickerToEditor(panel) {
  const viewport = window.visualViewport;
  const viewportLeft = viewport?.offsetLeft || 0;
  const viewportRight = viewportLeft + (viewport?.width || window.innerWidth);
  const parent = panel.parentElement?.getBoundingClientRect();
  const left = Math.max(viewportLeft, parent?.left || 0) + 12;
  const right = Math.min(viewportRight, parent?.right || viewportRight) - 12;
  const width = Math.max(0, right - left);
  const current = panel.getBoundingClientRect();
  panel.style.setProperty("width", `${Math.min(current.width, width)}px`, "important");
  const fitted = panel.getBoundingClientRect();
  const desiredLeft = Math.max(left, Math.min(fitted.left, right - fitted.width));
  panel.style.left = `${(Number.parseFloat(panel.style.left) || 0) + desiredLeft - fitted.left}px`;
}
