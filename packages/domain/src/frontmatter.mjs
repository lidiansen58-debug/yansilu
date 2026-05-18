const FRONTMATTER_BOUNDARY = "---";

function parseScalar(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item));
    } catch {}
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => item.trim().replace(/^["']|["']$/g, ""));
  }
  return trimmed.replace(/^["']|["']$/g, "");
}

function serializeScalar(value) {
  if (Array.isArray(value)) return `[${value.map((item) => JSON.stringify(String(item))).join(", ")}]`;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value);
  return /[:#[\]{},"'\n\r]/.test(text) ? JSON.stringify(text) : text;
}

export function parseMarkdownWithFrontmatter(markdown) {
  const text = String(markdown ?? "");
  const normalized = text.replace(/^\uFEFF/, "");
  if (!normalized.startsWith(`${FRONTMATTER_BOUNDARY}\n`) && !normalized.startsWith(`${FRONTMATTER_BOUNDARY}\r\n`)) {
    return { frontmatter: {}, body: normalized };
  }

  const boundaryMatch = normalized.match(/^---\r?\n/);
  const startLength = boundaryMatch?.[0]?.length ?? 4;
  const closing = normalized.indexOf(`\n${FRONTMATTER_BOUNDARY}`, startLength);
  if (closing < 0) return { frontmatter: {}, body: normalized };

  const rawFrontmatter = normalized.slice(startLength, closing).trim();
  const afterClosing = normalized
    .slice(closing + FRONTMATTER_BOUNDARY.length + 1)
    .replace(/^\r?\n/, "")
    .replace(/^\r?\n/, "");
  const frontmatter = {};

  const lines = rawFrontmatter.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf(":");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!value) {
      const values = [];
      let cursor = i + 1;
      while (cursor < lines.length) {
        const next = lines[cursor];
        const nextTrimmed = next.trim();
        if (!nextTrimmed) {
          cursor += 1;
          continue;
        }
        if (!/^\s+-\s+/.test(next)) break;
        values.push(nextTrimmed.replace(/^-\s+/, "").replace(/^["']|["']$/g, ""));
        cursor += 1;
      }
      if (values.length) {
        frontmatter[key] = values;
        i = cursor - 1;
        continue;
      }
    }
    frontmatter[key] = parseScalar(value);
  }

  return { frontmatter, body: afterClosing };
}

export function serializeMarkdownWithFrontmatter(frontmatter, body) {
  const metadata = frontmatter && typeof frontmatter === "object" ? frontmatter : {};
  const lines = [FRONTMATTER_BOUNDARY];
  for (const [key, value] of Object.entries(metadata)) {
    lines.push(`${key}: ${serializeScalar(value)}`);
  }
  lines.push(FRONTMATTER_BOUNDARY, "", String(body ?? ""));
  return lines.join("\n");
}
