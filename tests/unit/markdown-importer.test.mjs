import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { buildMarkdownCandidates, extractTags, extractWikilinks } from "../../packages/markdown-engine/src/index.mjs";

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), "yansilu-md-import-"));
}

test("extractTags and extractWikilinks return unique markdown metadata", () => {
  const text = "See [[Alpha]] and [[Beta|B]] #reading #reading #topic/sub";
  assert.deepEqual(extractTags(text), ["reading", "topic/sub"]);
  assert.deepEqual(extractWikilinks(text), ["Alpha", "Beta|B"]);
});

test("extractTags supports Chinese and mixed Obsidian tags", () => {
  const text = "中文标签 #读书/论文 #产品-策略 (#AI/研究) and inline#not-a-tag";
  assert.deepEqual(extractTags(text), ["读书/论文", "产品-策略", "AI/研究"]);
});

test("buildMarkdownCandidates preserves frontmatter, aliases, tags, and wikilinks", async () => {
  const cwd = await makeTempDir();
  const notesDir = path.join(cwd, "vault");
  await fs.mkdir(notesDir, { recursive: true });
  await fs.writeFile(
    path.join(notesDir, "claim.md"),
    [
      "---",
      "title: A durable claim",
      "type: permanent",
      'tags: ["permanent", "method"]',
      'aliases: ["Claim A"]',
      "custom_field: kept",
      "---",
      "",
      "This is my claim linked to [[Source Note]]. #zettel"
    ].join("\n"),
    "utf8"
  );

  const result = await buildMarkdownCandidates({
    connector: "obsidian",
    payload: { path: "vault" },
    options: {},
    cwd
  });

  assert.equal(result.sources.length, 1);
  assert.equal(result.literature.length, 1);
  assert.equal(result.permanent.length, 1);
  assert.deepEqual(result.sources[0].aliases, ["Claim A"]);
  assert.deepEqual(result.literature[0].wikilinks, ["Source Note"]);
  assert.deepEqual(result.literature[0].tags, ["permanent", "method", "zettel"]);
  assert.equal(result.literature[0].original_frontmatter.custom_field, "kept");
  assert.equal(result.permanent[0].candidate_only, true);
});

test("buildMarkdownCandidates warns when no markdown files are found", async () => {
  const cwd = await makeTempDir();
  await fs.mkdir(path.join(cwd, "empty"), { recursive: true });

  const result = await buildMarkdownCandidates({
    connector: "markdown",
    payload: { path: "empty" },
    cwd
  });

  assert.equal(result.sources.length, 0);
  assert.equal(result.warnings[0].code, "IMPORT_NO_MARKDOWN_FILE");
});
