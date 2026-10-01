import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";
import { extractWikilinks, parseWikilinks, wikilinkTargets } from "../../packages/markdown-engine/src/markdown-importer.mjs";
import { parseLinks } from "../../apps/web/src/prototype-store.js";
import { createNoteInDirectory, createNoteRelation, initVault, listNoteRelations, serializeMarkdownWithFrontmatter, syncMarkdownNoteCatalogRelations, updateNoteContent } from "../../packages/domain/src/index.mjs";

test("browser code context is generated from the shared Markdown source", async () => {
  const shared = await fs.readFile(new URL("../../packages/markdown-engine/src/markdown-code-context.mjs", import.meta.url), "utf8");
  const browser = await fs.readFile(new URL("../../apps/web/src/markdown-code-context.js", import.meta.url), "utf8");
  assert.equal(browser, "// Generated from packages/markdown-engine/src/markdown-code-context.mjs by build:toastui.\n" + shared);
});

for (const code of ["`[[code]]`", "``含 ` 和 [[code]]``", "`跨行\n[[code]]`", "```md\n[[code]]\n```", "~~~\n[[code]]\n~~~", "    [[code]]", "\t[[code]]", "\\[[code]]", "```\n[[code]]"]) {
  test(`link metadata ignores literal code: ${JSON.stringify(code)}`, () => {
    const body = `[[real#段落|别名]] 与 ![[embed]]\n\n${code}`;
    assert.deepEqual(extractWikilinks(body), ["real#段落|别名", "embed"]);
    assert.deepEqual(wikilinkTargets(parseWikilinks(body)), ["real", "embed"]);
    assert.deepEqual(parseLinks(body), ["real", "embed"]);
    assert.equal(parseWikilinks(body)[1].embed, true);
  });
}

test("escaped embed markers retain ordinary links and malformed multiline references do not link", () => {
  assert.deepEqual(parseWikilinks("\\![[real]]").map(link => [link.target, link.embed]), [["real", false]]);
  assert.deepEqual(parseLinks("[[跨\n行]] [[outer [[inner]]"), ["inner"]);
  assert.deepEqual(parseLinks("\\\\[[real]]"), ["real"]);
});

test("create, save and catalog resync exclude code while preserving independent relations", async () => {
  const vault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-code-relations-"));
  await initVault(vault);
  const create = (id, body) => createNoteInDirectory(vault, { id, directoryId: "dir_literature_default", body });
  await create("ln_code_target", "# 代码目标\n\n材料");
  await create("ln_real_target", "# 正文目标\n\n材料");
  const code = "`[[ln_code_target|示例]]`\n\n```md\n[[ln_code_target]]\n```\n\n    [[ln_code_target]]\n\n\\[[ln_code_target]]";
  const source = await create("ln_code_source", `# 引用边界\n\n[[ln_real_target]]\n\n${code}`);
  const readLinks = async () => (await listNoteRelations(vault, source.id)).outgoingLinks;
  assert.deepEqual((await readLinks()).map(link => link.toNoteId), ["ln_real_target"]);
  const independent = await createNoteRelation(vault, source.id, { toNoteId: "ln_code_target", relationType: "supports", rationale: "独立建立的支持关系" });
  // Simulate a pre-fix catalog containing an erroneous automatically generated edge.
  const db = new DatabaseSync(path.join(vault, ".yansilu/catalog.db"));
  try {
    const now = new Date().toISOString();
    db.prepare("INSERT INTO links (id, from_note_id, to_note_id, relation_type, rationale, created_by, confidence, created_at, status, updated_at) VALUES (?, ?, ?, 'associated_with', 'markdown_wikilink', 'user', 1, ?, 'confirmed', ?)").run("lnk_stale_code", source.id, "ln_code_target", now, now);
  } finally { db.close(); }
  await syncMarkdownNoteCatalogRelations(vault, source.id);
  assert.ok(!(await readLinks()).some(link => link.id === "lnk_stale_code"));
  await updateNoteContent(vault, source.id, { body: `# 引用边界\n\n${code}\n\n\`[[ln_real_target]]\`` });
  const remaining = await readLinks();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, independent.id);
  assert.equal(remaining[0].relationType, "supports");
  assert.equal(remaining[0].rationale, "独立建立的支持关系");
  // External disk edit followed by the same catalog synchronization used after import.
  await fs.writeFile(path.join(vault, source.markdownPath), serializeMarkdownWithFrontmatter({ id: source.id, title: "引用边界", note_type: "literature" }, `正文 [[ln_real_target|材料]]\n\n${code}`), "utf8");
  const synced = await syncMarkdownNoteCatalogRelations(vault, source.id);
  assert.deepEqual(synced.wikilinkTargets, ["ln_real_target"]);
  assert.deepEqual(synced.unresolvedWikilinks, []);
  assert.equal((await readLinks()).length, 2);
  await syncMarkdownNoteCatalogRelations(vault, source.id);
  assert.equal((await readLinks()).length, 2);
});
