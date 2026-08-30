import fs from "node:fs/promises";
import path from "node:path";
import { parseMarkdownWithFrontmatter } from "./frontmatter.mjs";

const cache = new Map();
const MAX_CACHE_ENTRIES = 3000;
const MAX_CACHE_BYTES = 32 * 1024 * 1024;
let cacheBytes = 0;

async function readSearchText(vaultPath, row) {
  const filePath = path.resolve(vaultPath, row.markdown_path);
  const stat = await fs.stat(filePath);
  const stamp = `${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
  const previous = cache.get(filePath);
  if (previous?.stamp === stamp) return previous.text;
  const parsed = parseMarkdownWithFrontmatter(await fs.readFile(filePath, "utf8"));
  const tags = parsed.frontmatter?.tags;
  const text = `${parsed.body}\n${Array.isArray(tags) ? tags.join(" ") : typeof tags === "string" ? tags : ""}`;
  cacheBytes -= cache.get(filePath)?.bytes || 0;
  cache.delete(filePath);
  const bytes = text.length * 2;
  if (bytes <= MAX_CACHE_BYTES) {
    cache.set(filePath, { stamp, text, bytes });
    cacheBytes += bytes;
  }
  while (cache.size > MAX_CACHE_ENTRIES || cacheBytes > MAX_CACHE_BYTES) {
    const first = cache.keys().next().value;
    cacheBytes -= cache.get(first).bytes;
    cache.delete(first);
  }
  return text;
}

export function searchExcerpt(text, query, length = 180) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  const index = normalized.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return "";
  const start = Math.max(0, index - 45);
  return `${start ? "…" : ""}${normalized.slice(start, start + length)}${start + length < normalized.length ? "…" : ""}`;
}

export async function searchNoteContent(vaultPath, rows, query, mapMetadata) {
  const matches = [];
  let unreadableCount = 0;
  // Bounded reads keep large libraries from exhausting file handles.
  for (let offset = 0; offset < rows.length; offset += 16) {
    const batch = await Promise.all(rows.slice(offset, offset + 16).map(async (row) => {
      const item = mapMetadata(row, query);
      let text = "";
      try { text = await readSearchText(vaultPath, row); }
      catch { unreadableCount += 1; }
      const excerpt = searchExcerpt(text, query);
      if (item.matchKind === "recent" && !excerpt) return null;
      return { ...item, ...(item.matchKind === "recent" ? { matchKind: "body_contains", rank: 8 } : {}), excerpt };
    }));
    matches.push(...batch.filter(Boolean));
  }
  matches.sort((a, b) => a.rank - b.rank || String(b.updatedAt).localeCompare(String(a.updatedAt)) || String(a.title).localeCompare(String(b.title)));
  return { matches, unreadableCount };
}
