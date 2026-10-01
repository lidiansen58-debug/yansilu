import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createDirectory, createNoteInDirectory, createNoteRelation, getNoteById, initVault, listNoteRelations, moveNoteToDirectory, syncMarkdownNoteCatalogRelations, updateNoteContent } from "../../packages/domain/src/index.mjs";
import { findVaultAssetLinks, rewriteVaultAssetLinks } from "../../packages/domain/src/markdown-asset-links.mjs";

test("asset embeds retain heading, block and alias suffixes during path rewrites", () => {
  for (const suffix of ["#第二页", "^block-1", "#第二页^block-1", "#第二页|材料", "^block-1|我的引用", "|240x160", "#第二页|包含|竖线"]) {
    const body = `![[../../../assets/files/材料.pdf${suffix}]]`;
    assert.equal(rewriteVaultAssetLinks(body, "notes/original/deep/旧.md", "notes/original/新.md"), `![[../../assets/files/材料.pdf${suffix}]]`);
    assert.deepEqual(findVaultAssetLinks(body, "notes/original/deep/旧.md"), ["assets/files/材料.pdf"]);
  }
});

test("Markdown attachment fragments use the actual file and keep the locator", () => {
  const body = "[材料](<../../../assets/files/材料 (最终).pdf#page=2>)\n\n![图](../../../assets/images/real.svg#区域)";
  const moved = rewriteVaultAssetLinks(body, "notes/original/deep/旧.md", "notes/original/新.md");
  assert.equal(moved, "[材料](<../../assets/files/材料 (最终).pdf#page=2>)\n\n![图](../../assets/images/real.svg#区域)");
  assert.deepEqual(new Set(findVaultAssetLinks(body, "notes/original/deep/旧.md")), new Set(["assets/files/材料 (最终).pdf", "assets/images/real.svg"]));
  assert.equal(rewriteVaultAssetLinks("[外部](https://example.com/file.pdf#page=2) [本页](#标题)", "notes/original/旧.md", "notes/original/deep/新.md"), "[外部](https://example.com/file.pdf#page=2) [本页](#标题)");
});

test("moving asset links preserves code and escaped examples while rewriting live links", () => {
  const ordinary = "![图](../../../assets/images/real.png)", embed = "![[../../../assets/files/real.txt|材料]]";
  const examples = ["`![图](../../../assets/images/code.png)`", "``![[../../../assets/files/code.txt]]``", "```md\n![图](../../../assets/images/code.png)\n![[../../../assets/files/code.txt]]\n```", "~~~md\n![[../../../assets/files/tilde.txt]]\n~~~", "    ![图](../../../assets/images/indented.png)", "\\![图](../../../assets/images/escaped-bang.png)", "\\[图](../../../assets/images/escaped-link.png)", "\\![[../../../assets/files/escaped-embed.txt]]"];
  const body = [ordinary, embed, ...examples].join("\n\n");
  const moved = rewriteVaultAssetLinks(body, "notes/original/deep/旧.md", "notes/original/新.md");
  for (const example of examples.filter(text => !text.startsWith("\\![图]"))) assert.ok(moved.includes(example), example);
  assert.ok(moved.includes("![图](../../assets/images/real.png)"));
  assert.ok(moved.includes("![[../../assets/files/real.txt|材料]]"));
  // Escaping ! leaves an ordinary Markdown link active; escaping [ makes it literal.
  assert.ok(moved.includes("\\![图](../../assets/images/escaped-bang.png)"));
  assert.deepEqual(findVaultAssetLinks(body, "notes/original/deep/旧.md"), ["assets/files/real.txt", "assets/images/escaped-bang.png", "assets/images/real.png"]);
});

test("asset discovery and movement agree on angle-wrapped paths with parentheses", () => {
  const body = "[材料](<../../assets/files/材料 (最终).pdf>)";
  assert.deepEqual(findVaultAssetLinks(body, "notes/original/旧.md"), ["assets/files/材料 (最终).pdf"]);
  assert.equal(rewriteVaultAssetLinks(body, "notes/original/旧.md", "notes/original/deep/新.md"), "[材料](<../../../assets/files/材料 (最终).pdf>)");
});

test("inline code in a live attachment label does not hide its destination", () => {
  const body = "[读取 `变量`](../../../assets/files/real.txt)";
  assert.deepEqual(findVaultAssetLinks(body, "notes/original/deep/旧.md"), ["assets/files/real.txt"]);
  assert.equal(rewriteVaultAssetLinks(body, "notes/original/deep/旧.md", "notes/original/新.md"), "[读取 `变量`](../../assets/files/real.txt)");
});

test("rename and move keep old note links, code literals and independent relations on disk", async () => {
  const vault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-move-code-assets-"));
  await initVault(vault);
  const target = await createNoteInDirectory(vault, { directoryId: "dir_literature_default", body: "# 关联目标\n\n独立材料。" });
  const code = "`![示例](../../assets/images/code.png)`\n\n```md\n![[../../assets/files/code.txt]]\n[[关联目标]]\n```\n\n\\![[../../assets/files/escaped.txt]]";
  const body = `# 待移动笔记\n\n[[关联目标|材料]]\n\n[附件](<../../assets/files/材料 (最终).txt#page=2>)\n\n![[../../assets/files/real.txt#段落^block|附件]]\n\n${code}`;
  const source = await createNoteInDirectory(vault, { directoryId: "dir_literature_default", body });
  const independent = await createNoteRelation(vault, source.id, { toNoteId: target.id, relationType: "supports", rationale: "保留独立支持关系" });
  await updateNoteContent(vault, target.id, { body: "# 重命名目标\n\n独立材料。" });
  const sourceAfterRename = await getNoteById(vault, source.id);
  assert.ok(sourceAfterRename.body.includes(code));
  assert.ok(sourceAfterRename.body.includes("[[关联目标|材料]]"));
  const aliasSync = await syncMarkdownNoteCatalogRelations(vault, source.id);
  assert.ok(!aliasSync.unresolvedWikilinks.includes("关联目标"));
  assert.ok((await listNoteRelations(vault, source.id)).outgoingLinks.some(link => link.id === independent.id));
  const directory = await createDirectory(vault, { title: "深入目录", parentDirectoryId: "dir_literature_default", fsPath: path.join(vault, "notes/literature/deep") });
  await moveNoteToDirectory(vault, source.id, directory.id);
  const moved = await getNoteById(vault, source.id);
  assert.ok(moved.body.includes(code));
  assert.ok(moved.body.includes("[附件](<../../../assets/files/材料 (最终).txt#page=2>)"));
  assert.ok(moved.body.includes("![[../../../assets/files/real.txt#段落^block|附件]]"));
  assert.ok(moved.body.includes("[[关联目标|材料]]"));
  await fs.access(path.join(vault, moved.markdownPath));
  await assert.rejects(fs.access(path.join(vault, source.markdownPath)), { code: "ENOENT" });
  const links = (await listNoteRelations(vault, source.id)).outgoingLinks;
  const kept = links.find(link => link.id === independent.id);
  assert.equal(kept.toNoteId, target.id);
  assert.equal(kept.relationType, "supports");
  assert.equal(kept.rationale, "保留独立支持关系");
  assert.deepEqual(new Set(findVaultAssetLinks(moved.body, moved.markdownPath)), new Set(["assets/files/real.txt", "assets/files/材料 (最终).txt"]));
});

test("rewriteVaultAssetLinks preserves angle-wrapped asset paths with spaces and parentheses", () => {
  const body = [
    "# Renamed asset note",
    "",
    "![chart](<../../../assets/images/pn_1/chart (1).png>)",
    "[reference file](<../../../assets/files/pn_1/reference file (final).pdf>)"
  ].join("\n");

  const rewritten = rewriteVaultAssetLinks(
    body,
    "notes/original/deep/Old title.md",
    "notes/original/New title.md"
  );

  assert.match(rewritten, /!\[chart\]\(<\.\.\/\.\.\/assets\/images\/pn_1\/chart \(1\)\.png>\)/);
  assert.match(rewritten, /\[reference file\]\(<\.\.\/\.\.\/assets\/files\/pn_1\/reference file \(final\)\.pdf>\)/);
});

test("rewriteVaultAssetLinks rewrites Obsidian asset embeds when note paths change", () => {
  const body = [
    "# Embedded asset note",
    "",
    "![[../../../assets/images/chart 1.png]]",
    "![[../../../assets/files/reference file.txt|Reference]]"
  ].join("\n");

  const rewritten = rewriteVaultAssetLinks(
    body,
    "notes/original/deep/Old title.md",
    "notes/original/New title.md"
  );

  assert.match(rewritten, /!\[\[\.\.\/\.\.\/assets\/images\/chart 1\.png\]\]/);
  assert.match(rewritten, /!\[\[\.\.\/\.\.\/assets\/files\/reference file\.txt\|Reference\]\]/);
});

test("findVaultAssetLinks includes Obsidian asset embeds", () => {
  const body = [
    "# Embedded asset note",
    "",
    "![[assets/images/chart 1.png]]",
    "![[../../assets/files/reference file.txt|Reference]]",
    "[normal](../../assets/files/normal.txt)"
  ].join("\n");

  assert.deepEqual(findVaultAssetLinks(body, "notes/original/Example.md"), [
    "assets/files/normal.txt",
    "assets/files/reference file.txt",
    "assets/images/chart 1.png"
  ]);
});
