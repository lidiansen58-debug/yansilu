import fs from "node:fs/promises";
import { parseMarkdownWithFrontmatter, serializeMarkdownWithFrontmatter } from "./frontmatter.mjs";
import { rewriteVaultAssetLinks } from "./markdown-asset-links.mjs";

export async function rewriteAssetLinksInMarkdownFile(filePath, fromMarkdownPath, toMarkdownPath, updatedAt = "") {
  const currentMarkdown = await fs.readFile(filePath, "utf8");
  const normalized = String(currentMarkdown || "").replace(/^\uFEFF/, "");
  const hadFrontmatter = normalized.startsWith("---\n") || normalized.startsWith("---\r\n");
  const parsed = parseMarkdownWithFrontmatter(currentMarkdown);
  const nextBody = rewriteVaultAssetLinks(parsed.body, fromMarkdownPath, toMarkdownPath);
  if (nextBody === parsed.body) return false;

  let nextMarkdown = nextBody;
  if (hadFrontmatter || (parsed.frontmatter && Object.keys(parsed.frontmatter).length > 0)) {
    const nextFrontmatter =
      parsed.frontmatter && typeof parsed.frontmatter === "object" ? { ...parsed.frontmatter } : {};
    if (updatedAt) nextFrontmatter.updated_at = updatedAt;
    nextMarkdown = serializeMarkdownWithFrontmatter(nextFrontmatter, nextBody);
  }
  await fs.writeFile(filePath, nextMarkdown, "utf8");
  return true;
}
