function defaultHash(value = "") {
  return String(value || "").split("").reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 100000, 7);
}

function defaultEscapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function graphClusterAnchorAngles(count = 0) {
  const total = Math.max(0, Number(count || 0));
  if (total <= 0) return [];
  if (total === 1) return [-Math.PI / 2];
  if (total === 2) return [-(Math.PI * 0.84), Math.PI * 0.12];
  if (total === 3) return [-(Math.PI * 0.82), -(Math.PI * 0.14), Math.PI * 0.42];
  if (total === 4) return [-(Math.PI * 0.86), -(Math.PI * 0.28), Math.PI * 0.18, Math.PI * 0.68];
  return Array.from({ length: total }, (_, index) => -Math.PI / 2 + ((Math.PI * 2) / total) * index);
}

export function renderGraphStarfieldView(layoutWidth = 0, layoutHeight = 0, seed = "", { hash = defaultHash } = {}) {
  const width = Math.max(960, Number(layoutWidth || 0));
  const height = Math.max(520, Number(layoutHeight || 0));
  const count = Math.max(96, Math.round((width * height) / 9000));
  return Array.from({ length: count }, (_, index) => {
    const base = hash(`${seed}:${index}`);
    const x = 24 + (base % Math.max(1, width - 48));
    const y = 20 + ((base * 17) % Math.max(1, height - 40));
    const tier = base % 17 === 0 ? " is-bright" : base % 5 === 0 ? " is-soft" : base % 3 === 0 ? " is-faint" : "";
    const radius = tier === " is-bright"
      ? 1.3 + ((base % 8) / 10)
      : tier === " is-soft"
        ? 0.9 + ((base % 10) / 10) * 1.6
        : 0.35 + ((base % 9) / 10) * 1.1;
    const opacity = tier === " is-bright"
      ? 0.66 + ((base % 5) / 10) * 0.22
      : tier === " is-faint"
        ? 0.12 + ((base % 7) / 10) * 0.12
        : 0.18 + ((base % 9) / 10) * 0.34;
    return `<circle class="graph-map-star${tier}" cx="${x}" cy="${y}" r="${radius.toFixed(1)}" opacity="${opacity.toFixed(2)}"></circle>`;
  }).join("");
}

export function renderGraphNebulaFieldView(layoutWidth = 0, layoutHeight = 0, seed = "", { hash = defaultHash, escapeHtml = defaultEscapeHtml } = {}) {
  const width = Math.max(960, Number(layoutWidth || 0));
  const height = Math.max(520, Number(layoutHeight || 0));
  const specs = [
    { x: 0.2, y: 0.26, rx: 0.22, ry: 0.16, className: "is-teal" },
    { x: 0.74, y: 0.2, rx: 0.18, ry: 0.15, className: "is-sky" },
    { x: 0.58, y: 0.72, rx: 0.24, ry: 0.18, className: "is-mist" },
    { x: 0.35, y: 0.58, rx: 0.12, ry: 0.09, className: "is-bridge" },
    { x: 0.88, y: 0.62, rx: 0.16, ry: 0.12, className: "is-sky" },
    { x: 0.14, y: 0.78, rx: 0.18, ry: 0.14, className: "is-teal" }
  ];
  return specs.map((spec, index) => {
    const base = hash(`${seed}:nebula:${index}`);
    const cx = Math.round(width * spec.x + ((base % 23) - 11) * 4);
    const cy = Math.round(height * spec.y + ((base % 19) - 9) * 4);
    const rx = Math.round(width * spec.rx + (base % 17) * 2);
    const ry = Math.round(height * spec.ry + (base % 13) * 2);
    const rotation = ((base % 17) - 8) * 3;
    const opacity = (0.3 + (base % 7) * 0.035).toFixed(2);
    return `<ellipse class="graph-map-nebula ${escapeHtml(spec.className)}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" opacity="${opacity}" transform="rotate(${rotation} ${cx} ${cy})"></ellipse>`;
  }).join("");
}

export function renderGraphClusterGlowView(
  clusterMeta = [],
  { escapeHtml = defaultEscapeHtml, formatSummaryLabel = (title) => `View cluster summary: ${title}` } = {}
) {
  const items = Array.isArray(clusterMeta) ? clusterMeta.filter(Boolean) : [];
  return items
    .map((cluster) => {
      const tone = String(cluster.tone || "teal").trim();
      const clusterKey = String(cluster.clusterKey || "").trim();
      const title = String(cluster.title || "").trim() || "Untitled cluster";
      const attrs = clusterKey
        ? ` data-graph-select-cluster="${escapeHtml(clusterKey)}" tabindex="0" role="button" aria-label="${escapeHtml(formatSummaryLabel(title))}"`
        : "";
      return `<ellipse class="graph-map-cluster-glow is-${escapeHtml(tone)}" cx="${cluster.cx}" cy="${cluster.cy}" rx="${cluster.rx}" ry="${cluster.ry}" opacity="${Number(cluster.opacity || 0.18).toFixed(2)}" transform="rotate(${cluster.rotation || 0} ${cluster.cx} ${cluster.cy})"${attrs}></ellipse>`;
    })
    .join("");
}
