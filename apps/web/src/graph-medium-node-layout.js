// Keep the saved graph intact while reserving space for two-line note titles.
export function spaceMediumGraphNodes(nodes, { width, height, fixedNoteId = "" }) {
  height = Math.max(height, Math.ceil(nodes.length / 5) * 96 + 120);
  const fixed = nodes.find(node => node.id === fixedNoteId);
  if (fixed) {
    fixed.x = width / 2;
    fixed.y = height / 2;
  }
  const placed = fixed ? [fixed] : [];
  const available = (x, y) => x >= 112 && x <= width - 112 && y >= 92 && y <= height - 76
    && placed.every(other => Math.abs(x - other.x) >= 196 || Math.abs(y - other.y) >= 92);
  for (const [index, node] of nodes.entries()) {
    if (node === fixed) continue;
    const x = Math.max(112, Math.min(width - 112, node.x));
    const y = Math.max(92, Math.min(height - 76, node.y));
    let point = available(x, y) ? { x, y } : null;
    for (let radius = 12; !point && radius <= Math.hypot(width, height); radius += 12) {
      for (let slot = 0; slot < 32; slot++) {
        const angle = index * 2.399963 + slot * Math.PI / 16;
        const cx = x + Math.cos(angle) * radius;
        const cy = y + Math.sin(angle) * radius;
        if (available(cx, cy)) {
          point = { x: cx, y: cy };
          break;
        }
      }
    }
    if (!point) {
      height += 96;
      point = { x: width / 2, y: height - 76 };
    }
    node.x = point.x;
    node.y = point.y;
    placed.push(node);
  }
  return { width, height };
}
