// Small graphs use generous hit circles. Reserve a distinct region for each node.
export function separateSmallGraphNodes(nodes, { width, height, fixedNoteId = "" }) {
  const hitRadius = node => Math.max(44, Number(node.radius || 0) + 6);
  const fixed = nodes.find(node => node.id === fixedNoteId);
  const placed = fixed ? [fixed] : [];
  for (const [index, node] of nodes.entries()) {
    if (node === fixed) continue;
    const inset = hitRadius(node) + 8;
    const x = Math.max(inset, Math.min(width - inset, node.x));
    const y = Math.max(inset, Math.min(height - inset, node.y));
    const available = (cx, cy) => cx >= inset && cx <= width - inset && cy >= inset && cy <= height - inset
      && placed.every(other => Math.hypot(cx - other.x, cy - other.y) >= hitRadius(node) + hitRadius(other) + 8);
    let point = available(x, y) ? { x, y } : null;
    // Search locally first; deterministic positions keep repeated renders stable.
    for (let radius = 16; !point && radius <= Math.hypot(width, height); radius += 16) {
      for (let slot = 0; slot < 24; slot++) {
        const angle = index * 2.399963 + slot * Math.PI / 12;
        const cx = x + Math.cos(angle) * radius, cy = y + Math.sin(angle) * radius;
        if (available(cx, cy)) { point = { x: cx, y: cy }; break; }
      }
    }
    if (point) { node.x = point.x; node.y = point.y; }
    placed.push(node);
  }
}
