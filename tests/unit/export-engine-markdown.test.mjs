import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { exportMarkdown } from "../../packages/export-engine/src/index.mjs";
import { createDirectory, createNoteInDirectory, initVault } from "../../packages/domain/src/index.mjs";

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("exportMarkdown copies vault notes markdown files and writes an export record", async () => {
  const vaultPath = await makeTempDir("yansilu-export-vault-");
  const targetPath = await makeTempDir("yansilu-export-target-");
  const sourcePath = path.join(vaultPath, "notes", "literature", "ln_1.md");
  const assetPath = path.join(vaultPath, "assets", "images", "chart.txt");
  await fs.mkdir(path.dirname(sourcePath), { recursive: true });
  await fs.mkdir(path.dirname(assetPath), { recursive: true });
  await fs.writeFile(sourcePath, "---\nid: ln_1\n---\n\nBody", "utf8");
  await fs.writeFile(assetPath, "asset-body", "utf8");

  const result = await exportMarkdown({
    vaultPath,
    targetPath,
    requestId: "req_test",
    now: new Date("2026-04-22T00:00:00.000Z")
  });

  assert.equal(result.status, "queued");
  assert.equal(result.copied, 2);
  assert.deepEqual(result.copiedBreakdown, {
    markdownFiles: 1,
    assetFiles: 1,
    totalFiles: 2
  });
  assert.deepEqual(result.exportedFiles, [
    {
      kind: "markdown",
      sourcePath: "notes/literature/ln_1.md",
      targetPath: "literature/ln_1.md"
    },
    {
      kind: "asset",
      sourcePath: "assets/images/chart.txt",
      targetPath: "assets/images/chart.txt"
    }
  ]);

  const copied = await fs.readFile(path.join(targetPath, "literature", "ln_1.md"), "utf8");
  const copiedAsset = await fs.readFile(path.join(targetPath, "assets", "images", "chart.txt"), "utf8");
  assert.equal(copied, "---\nid: ln_1\n---\n\nBody");
  assert.equal(copiedAsset, "asset-body");

  const record = JSON.parse(await fs.readFile(result.recordPath, "utf8"));
  assert.equal(record.exportJobId, result.exportJobId);
  assert.equal(record.copied, 2);
  assert.deepEqual(record.copiedBreakdown, result.copiedBreakdown);
  assert.deepEqual(record.exportedFiles, result.exportedFiles);
  assert.equal(record.requestId, "req_test");
  assert.equal(record.time, "2026-04-22T00:00:00.000Z");
});

test("exportMarkdown succeeds with zero copied files when notes directory is absent", async () => {
  const vaultPath = await makeTempDir("yansilu-export-empty-vault-");
  const targetPath = await makeTempDir("yansilu-export-empty-target-");

  const result = await exportMarkdown({ vaultPath, targetPath });

  assert.equal(result.status, "queued");
  assert.equal(result.copied, 0);
  assert.deepEqual(result.copiedBreakdown, {
    markdownFiles: 0,
    assetFiles: 0,
    totalFiles: 0
  });
  assert.deepEqual(result.exportedFiles, []);
  await fs.access(result.recordPath);
});

test("exportMarkdown rejects targets inside the active vault", async () => {
  const vaultPath = await makeTempDir("yansilu-export-target-guard-vault-");
  const targetPath = path.join(vaultPath, "notes", "export-copy");

  await assert.rejects(
    () => exportMarkdown({ vaultPath, targetPath }),
    (error) =>
      error?.code === "EXPORT_TARGET_INSIDE_VAULT" &&
      String(error.message || "").includes("outside the active vault")
  );

  await assert.rejects(
    () => fs.access(targetPath),
    /ENOENT/
  );
});

test("exportMarkdown can export selected noteIds and only their linked assets", async () => {
  const vaultPath = await makeTempDir("yansilu-export-noteids-vault-");
  const targetPath = await makeTempDir("yansilu-export-noteids-target-");
  await initVault(vaultPath);
  await fs.mkdir(path.join(vaultPath, "assets", "scoped"), { recursive: true });
  await fs.writeFile(path.join(vaultPath, "assets", "scoped", "chart.txt"), "selected asset", "utf8");
  await fs.writeFile(path.join(vaultPath, "assets", "scoped", "unused.txt"), "unused asset", "utf8");

  const selected = await createNoteInDirectory(vaultPath, {
    directoryId: "dir_literature_default",
    title: "Selected export note",
    body: "Selected body.\n\n![Chart](../../assets/scoped/chart.txt)"
  });
  const omitted = await createNoteInDirectory(vaultPath, {
    directoryId: "dir_literature_default",
    title: "Omitted export note",
    body: "Omitted body."
  });

  const result = await exportMarkdown({
    vaultPath,
    targetPath,
    noteIds: [selected.id],
    requestId: "req_noteids",
    now: new Date("2026-05-11T00:00:00.000Z")
  });

  assert.equal(result.copied, 2);
  assert.deepEqual(result.scope, { type: "noteIds", noteIds: [selected.id] });
  assert.deepEqual(result.exportedFiles, [
    {
      kind: "markdown",
      sourcePath: selected.markdownPath,
      targetPath: path.posix.relative("notes", selected.markdownPath)
    },
    {
      kind: "asset",
      sourcePath: "assets/scoped/chart.txt",
      targetPath: "assets/scoped/chart.txt"
    }
  ]);

  assert.match(
    await fs.readFile(path.join(targetPath, path.posix.relative("notes", selected.markdownPath)), "utf8"),
    /Selected body/
  );
  await assert.rejects(
    () => fs.access(path.join(targetPath, path.posix.relative("notes", omitted.markdownPath))),
    /ENOENT/
  );
  await assert.rejects(() => fs.access(path.join(targetPath, "assets", "scoped", "unused.txt")), /ENOENT/);
});

test("exportMarkdown can export a directory tree and only linked assets", async () => {
  const vaultPath = await makeTempDir("yansilu-export-directory-vault-");
  const targetPath = await makeTempDir("yansilu-export-directory-target-");
  await initVault(vaultPath);
  await fs.mkdir(path.join(vaultPath, "assets", "directory-scope"), { recursive: true });
  await fs.writeFile(path.join(vaultPath, "assets", "directory-scope", "included.txt"), "included asset", "utf8");
  await fs.writeFile(path.join(vaultPath, "assets", "directory-scope", "outside.txt"), "outside asset", "utf8");

  const parentDir = await createDirectory(vaultPath, {
    title: "Directory export parent",
    fsPath: path.join(vaultPath, "notes", "original", "directory-export-parent")
  });
  const childDir = await createDirectory(vaultPath, {
    title: "Directory export child",
    parentDirectoryId: parentDir.id,
    fsPath: path.join(vaultPath, "notes", "original", "directory-export-parent", "child")
  });
  const outsideDir = await createDirectory(vaultPath, {
    title: "Directory export outside",
    fsPath: path.join(vaultPath, "notes", "original", "directory-export-outside")
  });

  const parentNote = await createNoteInDirectory(vaultPath, {
    directoryId: parentDir.id,
    title: "Parent scoped note",
    body: "Parent directory body."
  });
  const childNote = await createNoteInDirectory(vaultPath, {
    directoryId: childDir.id,
    title: "Child scoped note",
    body: "Child directory body.\n\n[Included](../../../../assets/directory-scope/included.txt)"
  });
  const outsideNote = await createNoteInDirectory(vaultPath, {
    directoryId: outsideDir.id,
    title: "Outside scoped note",
    body: "Outside directory body.\n\n[Outside](../../../assets/directory-scope/outside.txt)"
  });

  const result = await exportMarkdown({
    vaultPath,
    targetPath,
    directoryId: parentDir.id,
    includeDescendants: true,
    requestId: "req_directory_scope",
    now: new Date("2026-05-11T01:00:00.000Z")
  });

  assert.deepEqual(result.scope, { type: "directory", directoryId: parentDir.id, includeDescendants: true });
  assert.equal(result.copied, 3);
  assert.deepEqual(
    result.exportedFiles.map((item) => item.sourcePath).sort(),
    [parentNote.markdownPath, childNote.markdownPath, "assets/directory-scope/included.txt"].sort()
  );

  await fs.access(path.join(targetPath, path.posix.relative("notes", parentNote.markdownPath)));
  await fs.access(path.join(targetPath, path.posix.relative("notes", childNote.markdownPath)));
  await assert.rejects(
    () => fs.access(path.join(targetPath, path.posix.relative("notes", outsideNote.markdownPath))),
    /ENOENT/
  );
  await assert.rejects(() => fs.access(path.join(targetPath, "assets", "directory-scope", "outside.txt")), /ENOENT/);

  const shallowTargetPath = await makeTempDir("yansilu-export-directory-shallow-target-");
  const shallow = await exportMarkdown({
    vaultPath,
    targetPath: shallowTargetPath,
    directoryId: parentDir.id,
    includeDescendants: false
  });
  assert.deepEqual(shallow.scope, { type: "directory", directoryId: parentDir.id, includeDescendants: false });
  assert.deepEqual(shallow.exportedFiles.map((item) => item.sourcePath), [parentNote.markdownPath]);
  await assert.rejects(
    () => fs.access(path.join(shallowTargetPath, path.posix.relative("notes", childNote.markdownPath))),
    /ENOENT/
  );
});
