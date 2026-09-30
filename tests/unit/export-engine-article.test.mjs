import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { exportArticle } from "../../packages/export-engine/src/index.mjs";
import { initVault, createNoteInDirectory, getNoteById } from "../../packages/domain/src/index.mjs";

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-article-export-"));
  const vaultPath = path.join(root, "vault");
  const targetPath = path.join(root, "输出目录");
  await initVault(vaultPath);
  const note = await createNoteInDirectory(vaultPath, { directoryId: "dir_original_default", title: "Saved draft", body: "Old saved body" });
  return { root, vaultPath, targetPath, noteId: note.id, fileName: "中文 文章.md", markdown: "# 中文 文章\n\nNEW-BODY [[真实观点]]\n" };
}

test("article export writes the submitted live body and selected assets with portable paths", async () => {
  const input = await fixture();
  const image = path.join(input.vaultPath, "assets", "images", "图 1.png");
  await fs.mkdir(path.dirname(image), { recursive: true });
  await fs.writeFile(image, Buffer.from([1, 2, 3, 4]));
  input.markdown += "\n![图](<../../assets/images/图 1.png>)\n";
  const result = await exportArticle(input);
  assert.equal(result.status, "completed");
  assert.equal(result.assetCount, 1);
  assert.equal(await fs.readFile(result.articlePath, "utf8"), "# 中文 文章\n\nNEW-BODY [[真实观点]]\n\n![图](<assets/images/图 1.png>)\n");
  assert.deepEqual(await fs.readFile(path.join(result.targetPath, "assets", "images", "图 1.png")), Buffer.from([1, 2, 3, 4]));
  const sourceNote = await getNoteById(input.vaultPath, input.noteId);
  const source = await fs.readFile(path.join(input.vaultPath, sourceNote.markdownPath), "utf8");
  assert.match(source, /Old saved body/);
  assert.doesNotMatch(source, /NEW-BODY/);
});

test("repeated export creates separate bundles without overwriting existing work", async () => {
  const input = await fixture();
  const first = await exportArticle(input);
  const second = await exportArticle({ ...input, markdown: "# New\nChanged\n" });
  assert.notEqual(first.articlePath, second.articlePath);
  assert.match(await fs.readFile(first.articlePath, "utf8"), /NEW-BODY/);
});

test("missing attachments fail before publishing any article", async () => {
  const input = await fixture();
  await assert.rejects(exportArticle({ ...input, markdown: "# A\n![image](../../assets/missing.png)" }), /找不到附件.*missing/);
  await assert.rejects(fs.stat(input.targetPath), { code: "ENOENT" });
});

test("unsafe file names and target directories inside the vault are rejected", async () => {
  const input = await fixture();
  for (const fileName of ["../escaped.md", "CON.md", "a.txt", "x\\y.md"]) {
    await assert.rejects(exportArticle({ ...input, fileName }), /文件名无效/);
  }
  await assert.rejects(exportArticle({ ...input, targetPath: path.join(input.vaultPath, "exports") }), /笔记库之外/);
  await assert.rejects(exportArticle({ ...input, targetPath: "relative" }), /完整/);
});

test("symlink target cannot write into the active vault", async () => {
  const input = await fixture();
  const link = path.join(input.root, "vault-link");
  await fs.symlink(input.vaultPath, link, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(exportArticle({ ...input, targetPath: path.join(link, "output") }), /笔记库之外/);
});

test("attachment symlink cannot read outside the asset root", async () => {
  const input = await fixture();
  const outside = path.join(input.root, "private");
  await fs.mkdir(outside);
  await fs.writeFile(path.join(outside, "secret.png"), "private", "utf8");
  await fs.symlink(outside, path.join(input.vaultPath, "assets", "outside"), process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(exportArticle({ ...input, markdown: "# A\n![image](../../assets/outside/secret.png)" }), /笔记库之外/);
});
