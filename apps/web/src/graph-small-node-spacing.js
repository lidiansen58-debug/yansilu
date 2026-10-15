export function graphSmallLabelHalfWidth(node = {}) {
  return Math.max(44, Number(node.radius || 0) + 6, Math.min(16, String(node.title || node.id || "").trim().length) * 13 + 6);
}

// Reserve mobile titles as well as hit circles; titles remain clickable.
export function separateSmallGraphNodes(nodes, { width, height, fixedNoteId = "" }) {
  const hitRadius = node => Math.max(44, Number(node.radius || 0) + 6);
  const labelHalfWidth = graphSmallLabelHalfWidth;
  // The 26px mobile title can appear above or below a node and is translated
  // vertically. Reserve both positions so spacing does not depend on edge order.
  const labelHeight = node => Number(node.radius || 0) + 56;
  const fixed = nodes.find(node => node.id === fixedNoteId);
  const placed = fixed ? [fixed] : [];
  const original = new Map(nodes.map(node => [node, { x: node.x, y: node.y }]));
  const available = (node, cx, cy) => {
    const inset = hitRadius(node) + 8;
    return cx >= inset && cx <= width - inset && cy >= inset && cy <= height - inset
      && placed.every(other => Math.hypot(cx - other.x, cy - other.y) >= hitRadius(node) + hitRadius(other) + 8
        && (Math.abs(cx - other.x) >= Math.max(labelHalfWidth(node) + hitRadius(other), labelHalfWidth(other) + hitRadius(node)) + 8
          || Math.abs(cy - other.y) >= Math.max(labelHeight(node) + hitRadius(other), labelHeight(other) + hitRadius(node)) + 8));
  };
  let complete = true;
  for (const [index, node] of nodes.entries()) {
    if (node === fixed) continue;
    const inset = hitRadius(node) + 8;
    const x = Math.max(inset, Math.min(width - inset, node.x));
    const y = Math.max(inset, Math.min(height - inset, node.y));
    let point = available(node, x, y) ? { x, y } : null;
    // Search locally first; deterministic positions keep repeated renders stable.
    for (let radius = 16; !point && radius <= Math.hypot(width, height); radius += 16) {
      for (let slot = 0; slot < 24; slot++) {
        const angle = index * 2.399963 + slot * Math.PI / 12;
        const cx = x + Math.cos(angle) * radius, cy = y + Math.sin(angle) * radius;
        if (available(node, cx, cy)) { point = { x: cx, y: cy }; break; }
      }
    }
    if (!point) { complete = false; break; }
    node.x = point.x; node.y = point.y;
    placed.push(node);
  }
  if (complete) return;
  // Local moves can leave an unusable gap for the last note. Repack all mobile
  // regions on a deterministic grid, preserving a selected anchor exactly.
  const maxHit = Math.max(...nodes.map(hitRadius)), margin = maxHit + 8;
  const stepX = Math.max(...nodes.map(labelHalfWidth)) + maxHit + 8;
  const stepY = Math.max(...nodes.map(labelHeight)) + maxHit + 8;
  const countX = Math.max(1, Math.floor((width - margin * 2) / stepX) + 1);
  const countY = Math.max(1, Math.floor((height - margin * 2) / stepY) + 1);
  const grid = Array.from({ length: countX * countY }, (_, i) => ({
    x: countX === 1 ? width / 2 : margin + i % countX * (width - margin * 2) / (countX - 1),
    y: countY === 1 ? height / 2 : margin + Math.floor(i / countX) * (height - margin * 2) / (countY - 1)
  }));
  placed.length = 0;
  if (fixed) placed.push(fixed);
  for (const node of nodes) {
    if (node === fixed) continue;
    const before = original.get(node);
    const distance = point => Math.hypot(point.x - before.x, point.y - before.y);
    const point = grid.filter(point => available(node, point.x, point.y)).sort((a, b) => distance(a) - distance(b))[0];
    if (!point) return;
    node.x = point.x; node.y = point.y;
    placed.push(node);
  }
}
