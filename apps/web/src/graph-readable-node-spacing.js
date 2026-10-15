// Reserve titles, metadata and hit areas without changing graph membership.
export function spaceReadableGraphNodes(nodes, { width, height }) {
  width = Math.ceil(width * 1.6); height = Math.ceil(height * 2);
  const cells = new Map();
  const column = x => Math.floor(x / 240), row = y => Math.floor(y / 80);
  const available = (x, y) => {
    if (x < 132 || x > width - 132 || y < 32 || y > height - 64) return false;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      for (const other of cells.get(`${column(x) + dx}:${row(y) + dy}`) || []) {
        if (Math.abs(x - other.x) < 240 && Math.abs(y - other.y) < 80) return false;
      }
    }
    return true;
  };
  for (const [index, node] of nodes.entries()) {
    const x = Math.max(132, Math.min(width - 132, node.x * 1.6));
    const y = Math.max(32, Math.min(height - 64, node.y * 2));
    let point = available(x, y) ? { x, y } : null;
    // Closest free space retains the original neighborhood and stable ordering.
    for (let radius = 16; !point && radius <= Math.hypot(width, height); radius += 16) {
      for (let slot = 0; slot < 32; slot++) {
        const angle = index * 2.399963 + slot * Math.PI / 16;
        const cx = x + Math.cos(angle) * radius, cy = y + Math.sin(angle) * radius;
        if (available(cx, cy)) { point = { x: cx, y: cy }; break; }
      }
    }
    if (!point) {
      point = { x, y: height + 32 };
      height += 112;
    }
    node.x = point.x; node.y = point.y;
    const key = `${column(node.x)}:${row(node.y)}`;
    const cell = cells.get(key) || []; cell.push(node); cells.set(key, cell);
  }
  return { width, height };
}
