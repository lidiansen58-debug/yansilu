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
      targetPath: "literature/Body.md"
    },
    {
      kind: "asset",
      sourcePath: "assets/images/chart.txt",
      targetPath: "assets/images/chart.txt"
    }
  ]);

  const copied = await fs.readFile(path.join(targetPath, "literature", "Body.md"), "utf8");
  const copiedAsset = await fs.readFile(path.join(targetPath, "assets", "images", "chart.txt"), "utf8");
  assert.equal(copied, "Body");
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

test("exportMarkdown skips missing markdown files recorded in the catalog", async () => {
  const vaultPath = await makeTempDir("yansilu-export-missing-note-vault-");
  const targetPath = await makeTempDir("yansilu-export-missing-note-target-");
  await initVault(vaultPath);

  const existing = await createNoteInDirectory(vaultPath, {
    directoryId: "dir_original_default",
    title: "Existing export note",
    body: "Keep me."
  });
  const missing = await createNoteInDirectory(vaultPath, {
    directoryId: "dir_original_default",
    title: "Missing export note",
    body: "Delete me before export."
  });
  await fs.unlink(path.join(vaultPath, missing.markdownPath));

  const result = await exportMarkdown({
    vaultPath,
    targetPath,
    directoryId: "dir_original_default"
  });

  assert.equal(result.status, "queued");
  assert.equal(result.copied, 1);
  assert.deepEqual(result.copiedBreakdown, {
    markdownFiles: 1,
    assetFiles: 0,
    totalFiles: 1
  });
  assert.deepEqual(result.skippedFiles, [
    {
      kind: "markdown",
      sourcePath: missing.markdownPath,
      reason: "missing"
    }
  ]);
  await fs.access(path.join(targetPath, path.posix.relative("notes", existing.markdownPath)));
  await assert.rejects(
    () => fs.access(path.join(targetPath, path.posix.relative("notes", missing.markdownPath))),
    /ENOENT/
  );
});

test("exportMarkdown uses human-readable titles and rewrites asset links for id-named notes", async () => {
  const vaultPath = await makeTempDir("yansilu-export-human-readable-vault-");
  const targetPath = await makeTempDir("yansilu-export-human-readable-target-");
  const sourcePath = path.join(vaultPath, "notes", "original", "pn_test.md");
  const assetPath = path.join(vaultPath, "assets", "images", "chart.txt");
  await fs.mkdir(path.dirname(sourcePath), { recursive: true });
  await fs.mkdir(path.dirname(assetPath), { recursive: true });
  await fs.writeFile(
    sourcePath,
    [
      "---",
      "id: pn_test",
      "title: 中文 阅读卡片",
      "---",
      "",
      "# 中文 阅读卡片",
      "",
      "![图](../../assets/images/chart.txt)"
    ].join("\n"),
    "utf8"
  );
  await fs.writeFile(assetPath, "asset-body", "utf8");

  const result = await exportMarkdown({
    vaultPath,
    targetPath
  });

  assert.equal(result.copied, 2);
  assert.deepEqual(result.exportedFiles, [
    {
      kind: "markdown",
      sourcePath: "notes/original/pn_test.md",
      targetPath: "original/中文 阅读卡片.md"
    },
    {
      kind: "asset",
      sourcePath: "assets/images/chart.txt",
      targetPath: "assets/images/chart.txt"
    }
  ]);

  const exportedMarkdown = await fs.readFile(path.join(targetPath, "original", "中文 阅读卡片.md"), "utf8");
  assert.match(exportedMarkdown, /# 中文 阅读卡片/);
  assert.match(exportedMarkdown, /!\[图\]\(\.\.\/assets\/images\/chart\.txt\)/);
});

test("exportMarkdown strips internal frontmatter fields and keeps useful properties", async () => {
  const vaultPath = await makeTempDir("yansilu-export-frontmatter-clean-vault-");
  const targetPath = await makeTempDir("yansilu-export-frontmatter-clean-target-");
  const sourcePath = path.join(vaultPath, "notes", "original", "pn_frontmatter.md");
  await fs.mkdir(path.dirname(sourcePath), { recursive: true });
  await fs.writeFile(
    sourcePath,
    [
      "---",
      "id: pn_frontmatter",
      "note_type: permanent",
      "title: Clean Export Note",
      "status: draft",
      "created_at: 2026-06-04T06:24:36.839Z",
      "updated_at: 2026-06-04T06:24:36.839Z",
      "connector: obsidian",
      "candidate_only: true",
      "citations: [\"[object Object]\"]",
      "aliases: [\"Quick Alias\"]",
      "tags: [\"learning/science\"]",
      "thesis: Keep this thesis",
      "rationale:",
      "---",
      "",
      "# Clean Export Note",
      "",
      "Body paragraph."
    ].join("\n"),
    "utf8"
  );

  const result = await exportMarkdown({
    vaultPath,
    targetPath
  });

  assert.equal(result.copiedBreakdown.markdownFiles, 1);
  const exportedMarkdown = await fs.readFile(path.join(targetPath, "original", "Clean Export Note.md"), "utf8");
  assert.ok(exportedMarkdown.startsWith("---\n"));
  assert.match(exportedMarkdown, /aliases: \["Quick Alias"\]/);
  assert.match(exportedMarkdown, /tags: \["learning\/science"\]/);
  assert.match(exportedMarkdown, /thesis: Keep this thesis/);
  assert.doesNotMatch(exportedMarkdown, /^id:/m);
  assert.doesNotMatch(exportedMarkdown, /^note_type:/m);
  assert.doesNotMatch(exportedMarkdown, /^title:/m);
  assert.doesNotMatch(exportedMarkdown, /^status:/m);
  assert.doesNotMatch(exportedMarkdown, /^created_at:/m);
  assert.doesNotMatch(exportedMarkdown, /^updated_at:/m);
  assert.doesNotMatch(exportedMarkdown, /^connector:/m);
  assert.doesNotMatch(exportedMarkdown, /^candidate_only:/m);
  assert.doesNotMatch(exportedMarkdown, /^citations:/m);
  assert.doesNotMatch(exportedMarkdown, /^rationale:/m);
  assert.match(exportedMarkdown, /# Clean Export Note/);
});

test("exportMarkdown rewrites wikilinks to exported title paths when the target is unique", async () => {
  const vaultPath = await makeTempDir("yansilu-export-wikilink-vault-");
  const targetPath = await makeTempDir("yansilu-export-wikilink-target-");
  await initVault(vaultPath);

  const targetNote = await createNoteInDirectory(vaultPath, {
    directoryId: "dir_original_default",
    title: "中文阅读卡片",
    body: "# 中文阅读卡片\n\nTarget body."
  });
  const sourceNote = await createNoteInDirectory(vaultPath, {
    directoryId: "dir_original_default",
    title: "Spacing Note",
    body: "# Spacing Note\n\nBacklink to [[中文阅读卡片#中文阅读卡片|中文阅读]]."
  });

  const result = await exportMarkdown({
    vaultPath,
    targetPath,
    noteIds: [sourceNote.id, targetNote.id]
  });

  assert.deepEqual(
    result.exportedFiles.filter((item) => item.kind === "markdown").map((item) => item.targetPath).sort(),
    ["original/Spacing Note.md", "original/中文阅读卡片.md"].sort()
  );

  const exportedSource = await fs.readFile(path.join(targetPath, "original", "Spacing Note.md"), "utf8");
  assert.match(exportedSource, /\[\[original\/中文阅读卡片#中文阅读卡片\|中文阅读\]\]/);
});

test("exportMarkdown rewrites imported obsidian path links and does not let source titles create ambiguity", async () => {
  const vaultPath = await makeTempDir("yansilu-export-imported-path-vault-");
  const targetPath = await makeTempDir("yansilu-export-imported-path-target-");
  await fs.mkdir(path.join(vaultPath, "notes", "sources"), { recursive: true });
  await fs.mkdir(path.join(vaultPath, "notes", "literature"), { recursive: true });
  await fs.mkdir(path.join(vaultPath, "notes", "original"), { recursive: true });

  await fs.writeFile(
    path.join(vaultPath, "notes", "sources", "src_spacing.md"),
    [
      "---",
      "id: src_spacing",
      "note_type: source",
      "title: Spacing Note",
      "url_or_path: C:/fixtures/Research/Spacing Note.md",
      "---",
      "",
      "# Spacing Note"
    ].join("\n"),
    "utf8"
  );
  await fs.writeFile(
    path.join(vaultPath, "notes", "sources", "src_cn.md"),
    [
      "---",
      "id: src_cn",
      "note_type: source",
      "title: 中文阅读卡片",
      "url_or_path: C:/fixtures/00 Inbox/中文 阅读.md",
      "---",
      "",
      "# 中文阅读卡片"
    ].join("\n"),
    "utf8"
  );
  await fs.writeFile(
    path.join(vaultPath, "notes", "literature", "ln_cn.md"),
    [
      "---",
      "id: ln_cn",
      "note_type: literature",
      "title: 中文阅读卡片",
      "---",
      "",
      "# 中文阅读卡片",
      "",
      "它链接到 [[Research/Spacing Note|英文材料]]."
    ].join("\n"),
    "utf8"
  );
  await fs.writeFile(
    path.join(vaultPath, "notes", "original", "pn_spacing.md"),
    [
      "---",
      "id: pn_spacing",
      "note_type: permanent",
      "title: Spacing Note",
      "---",
      "",
      "# Spacing Note",
      "",
      "Backlink to [[中文阅读卡片|中文阅读]]."
    ].join("\n"),
    "utf8"
  );

  const result = await exportMarkdown({
    vaultPath,
    targetPath
  });

  assert.equal(result.copiedBreakdown.markdownFiles, 4);
  const exportedLiterature = await fs.readFile(path.join(targetPath, "literature", "中文阅读卡片.md"), "utf8");
  const exportedPermanent = await fs.readFile(path.join(targetPath, "original", "Spacing Note.md"), "utf8");
  assert.match(exportedLiterature, /\[\[sources\/Spacing Note\|英文材料\]\]/);
  assert.match(exportedPermanent, /\[\[literature\/中文阅读卡片\|中文阅读\]\]/);
});

test("exportMarkdown strips importer-only frontmatter without rewriting metadata strings", async () => {
  const vaultPath = await makeTempDir("yansilu-export-imported-frontmatter-vault-");
  const targetPath = await makeTempDir("yansilu-export-imported-frontmatter-target-");
  await fs.mkdir(path.join(vaultPath, "notes", "sources"), { recursive: true });
  await fs.mkdir(path.join(vaultPath, "notes", "literature"), { recursive: true });

  await fs.writeFile(
    path.join(vaultPath, "notes", "sources", "src_spacing.md"),
    [
      "---",
      "id: src_spacing",
      "note_type: source",
      "title: Spacing Note",
      "aliases: [\"Spacing Effect\"]",
      "source_type: markdown",
      "imported_from: obsidian",
      "url_or_path: C:/fixtures/Research/Spacing Note.md",
      "original_frontmatter: {\"alias\":\"Spacing Effect\"}",
      "---",
      "",
      "# Spacing Note",
      "",
      "Source body."
    ].join("\n"),
    "utf8"
  );
  await fs.writeFile(
    path.join(vaultPath, "notes", "literature", "ln_imported.md"),
    [
      "---",
      "id: ln_imported",
      "note_type: literature",
      "title: Imported Literature",
      "source_id: src_spacing",
      "quote_text: \"Original metadata keeps [[Research/Spacing Note|英文材料]] untouched.\"",
      "paraphrase_text:",
      "imported_from: obsidian",
      "wikilinks: [\"Research/Spacing Note|英文材料\"]",
      "parsed_wikilinks: [\"[object Object]\"]",
      "wikilink_targets: [\"Research/Spacing Note\"]",
      "original_frontmatter: {\"aliases\":[\"Imported Alias\"]}",
      "aliases: [\"Imported Alias\"]",
      "tags: [\"imported\"]",
      "---",
      "",
      "# Imported Literature",
      "",
      "Body link to [[Research/Spacing Note|英文材料]]."
    ].join("\n"),
    "utf8"
  );

  await exportMarkdown({
    vaultPath,
    targetPath
  });

  const exportedLiterature = await fs.readFile(path.join(targetPath, "literature", "Imported Literature.md"), "utf8");
  const exportedSource = await fs.readFile(path.join(targetPath, "sources", "Spacing Note.md"), "utf8");

  assert.match(exportedLiterature, /\[\[sources\/Spacing Note\|英文材料\]\]/);
  assert.match(exportedLiterature, /aliases: \["Imported Alias"\]/);
  assert.match(exportedLiterature, /tags: \["imported"\]/);
  assert.doesNotMatch(exportedLiterature, /^source_id:/m);
  assert.doesNotMatch(exportedLiterature, /^quote_text:/m);
  assert.doesNotMatch(exportedLiterature, /^paraphrase_text:/m);
  assert.doesNotMatch(exportedLiterature, /^imported_from:/m);
  assert.doesNotMatch(exportedLiterature, /^wikilinks:/m);
  assert.doesNotMatch(exportedLiterature, /^parsed_wikilinks:/m);
  assert.doesNotMatch(exportedLiterature, /^wikilink_targets:/m);
  assert.doesNotMatch(exportedLiterature, /^original_frontmatter:/m);
  assert.doesNotMatch(exportedLiterature, /Original metadata keeps \[\[sources\/Spacing Note\|英文材料\]\] untouched\./);

  assert.match(exportedSource, /aliases: \["Spacing Effect"\]/);
  assert.doesNotMatch(exportedSource, /^source_type:/m);
  assert.doesNotMatch(exportedSource, /^imported_from:/m);
  assert.doesNotMatch(exportedSource, /^url_or_path:/m);
  assert.doesNotMatch(exportedSource, /^original_frontmatter:/m);
});

test("exportMarkdown copies assets referenced by Obsidian embeds", async () => {
  const vaultPath = await makeTempDir("yansilu-export-obsidian-embed-vault-");
  const targetPath = await makeTempDir("yansilu-export-obsidian-embed-target-");
  await initVault(vaultPath);
  await fs.mkdir(path.join(vaultPath, "assets", "images"), { recursive: true });
  await fs.writeFile(path.join(vaultPath, "assets", "images", "chart 1.png"), "png-bytes", "utf8");

  await createNoteInDirectory(vaultPath, {
    directoryId: "dir_original_default",
    title: "Embedded asset note",
    body: "# Embedded asset note\n\n![[assets/images/chart 1.png]]"
  });

  const result = await exportMarkdown({
    vaultPath,
    targetPath,
    directoryId: "dir_original_default"
  });

  assert.equal(result.copiedBreakdown.markdownFiles, 1);
  assert.equal(result.copiedBreakdown.assetFiles, 1);
  assert.ok(result.exportedFiles.some((item) => item.kind === "asset" && item.targetPath === "assets/images/chart 1.png"));
  await fs.access(path.join(targetPath, "assets", "images", "chart 1.png"));
  const exportedMarkdown = await fs.readFile(path.join(targetPath, "original", "Embedded asset note.md"), "utf8");
  assert.match(exportedMarkdown, /!\[\[\.\.\/assets\/images\/chart 1\.png\]\]/);
});
