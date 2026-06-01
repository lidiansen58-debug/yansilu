import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import {
  buildNotePathIndex,
  initVault,
  parseMarkdownWithFrontmatter,
  readNote,
  serializeMarkdownWithFrontmatter,
  writeLiteratureNoteIfAbsent,
  writePermanentNoteIfAbsent,
  writeSourceIfAbsent
} from "../../packages/domain/src/index.mjs";

async function makeTempVault() {
  return fs.mkdtemp(path.join(os.tmpdir(), "yansilu-vault-"));
}

test("initVault creates the core vault layout", async () => {
  const vaultPath = await makeTempVault();
  await initVault(vaultPath);

  const expectedDirs = [
    ".yansilu",
    "imports",
    "exports",
    "assets",
    path.join("notes", "fleeting"),
    path.join("notes", "sources"),
    path.join("notes", "literature"),
    path.join("notes", "permanent"),
    path.join("notes", "original")
  ];

  for (const dir of expectedDirs) {
    const stat = await fs.stat(path.join(vaultPath, dir));
    assert.equal(stat.isDirectory(), true);
  }
});

test("frontmatter parse and serialize preserve unknown fields", () => {
  const markdown = serializeMarkdownWithFrontmatter(
    {
      id: "ln_test",
      title: "A note",
      tags: ["reading", "method"],
      custom_field: "kept"
    },
    "Body text"
  );

  const parsed = parseMarkdownWithFrontmatter(markdown);
  assert.equal(parsed.frontmatter.id, "ln_test");
  assert.equal(parsed.frontmatter.title, "A note");
  assert.deepEqual(parsed.frontmatter.tags, ["reading", "method"]);
  assert.equal(parsed.frontmatter.custom_field, "kept");
  assert.equal(parsed.body, "Body text");
});

test("frontmatter inline arrays preserve commas inside quoted items", () => {
  const markdown = serializeMarkdownWithFrontmatter(
    {
      three_line_summary: [
        "Claim, reason, and use are separate.",
        "Commas inside a line should not split items.",
        "The parser should restore exactly three lines."
      ]
    },
    "# Body"
  );

  const parsed = parseMarkdownWithFrontmatter(markdown);
  assert.deepEqual(parsed.frontmatter.three_line_summary, [
    "Claim, reason, and use are separate.",
    "Commas inside a line should not split items.",
    "The parser should restore exactly three lines."
  ]);
});

test("Source, LiteratureNote, and PermanentNote write and read back", async () => {
  const vaultPath = await makeTempVault();
  const now = new Date().toISOString();

  await writeSourceIfAbsent(vaultPath, {
    id: "src_test",
    source_type: "markdown",
    title: "Source title",
    imported_from: "local",
    created_at: now,
    updated_at: now,
    description: "Source body"
  });

  await writeLiteratureNoteIfAbsent(vaultPath, {
    id: "ln_test",
    source_id: "src_test",
    title: "Literature title",
    quote_text: "Quoted passage",
    paraphrase_text: "",
    status: "draft",
    created_at: now,
    updated_at: now
  });

  await writePermanentNoteIfAbsent(vaultPath, {
    id: "pn_test",
    title: "Permanent title",
    core_claim: "My own claim",
    rationale: "Why this claim matters",
    authorship: { user_confirmed: true, ai_assisted: false },
    originality_status: "pass",
    status: "draft",
    created_at: now,
    updated_at: now
  });

  const source = await readNote(vaultPath, "source", "src_test");
  const literature = await readNote(vaultPath, "literature", "ln_test");
  const permanent = await readNote(vaultPath, "permanent", "pn_test");

  assert.equal(source.note.title, "Source title");
  assert.equal(source.note.body, "Source body");
  assert.match(source.markdown, /^---[\s\S]*\n# Source title\n\nSource body$/);
  assert.equal(literature.note.source_id, "src_test");
  assert.equal(literature.note.body, "Quoted passage");
  assert.match(literature.markdown, /^---[\s\S]*\n# Literature title\n\nQuoted passage$/);
  assert.equal(permanent.note.title, "Permanent title");
  assert.equal(permanent.note.body, "My own claim");
  assert.match(permanent.markdown, /^---[\s\S]*\n# Permanent title\n\nMy own claim$/);
});

test("writeNoteIfAbsent skips existing files", async () => {
  const vaultPath = await makeTempVault();
  const now = new Date().toISOString();
  const first = await writeSourceIfAbsent(vaultPath, {
    id: "src_test",
    source_type: "markdown",
    title: "First",
    imported_from: "local",
    created_at: now,
    updated_at: now,
    description: "First body"
  });

  const second = await writeSourceIfAbsent(vaultPath, {
    id: "src_test",
    source_type: "markdown",
    title: "Second",
    imported_from: "local",
    created_at: now,
    updated_at: now,
    description: "Second body"
  });

  const source = await readNote(vaultPath, "source", "src_test");
  assert.equal(first.written, true);
  assert.equal(second.written, false);
  assert.equal(second.reason, "exists");
  assert.equal(source.note.title, "First");
  assert.equal(source.note.body, "First body");
});

test("writeLiteratureNoteIfAbsent can target a specific directory fs path", async () => {
  const vaultPath = await makeTempVault();
  const now = new Date().toISOString();
  const targetDir = path.join(vaultPath, "notes", "literature", "custom-import-box");
  await fs.mkdir(targetDir, { recursive: true });

  const result = await writeLiteratureNoteIfAbsent(
    vaultPath,
    {
      id: "ln_targeted",
      source_id: "src_targeted",
      title: "Targeted literature",
      quote_text: "Quote in targeted directory",
      paraphrase_text: "",
      status: "draft",
      created_at: now,
      updated_at: now
    },
    {
      directoryFsPath: targetDir
    }
  );

  assert.equal(result.written, true);
  assert.equal(result.path, path.join(targetDir, "ln_targeted.md"));
  const markdown = await fs.readFile(result.path, "utf8");
  assert.match(markdown, /# Targeted literature/);

  const targeted = await readNote(vaultPath, "literature", "ln_targeted");
  assert.equal(targeted.path, path.join(targetDir, "ln_targeted.md"));
  assert.equal(targeted.note.title, "Targeted literature");
  assert.equal(targeted.note.body, "Quote in targeted directory");
});

test("writeLiteratureNoteIfAbsent blocks duplicate ids across different directories", async () => {
  const vaultPath = await makeTempVault();
  const now = new Date().toISOString();
  const firstDir = path.join(vaultPath, "notes", "literature", "batch-a");
  const secondDir = path.join(vaultPath, "notes", "literature", "batch-b");
  await fs.mkdir(firstDir, { recursive: true });
  await fs.mkdir(secondDir, { recursive: true });

  const first = await writeLiteratureNoteIfAbsent(
    vaultPath,
    {
      id: "ln_duplicate",
      source_id: "src_duplicate",
      title: "First duplicate",
      quote_text: "First body",
      paraphrase_text: "",
      status: "draft",
      created_at: now,
      updated_at: now
    },
    { directoryFsPath: firstDir }
  );
  const second = await writeLiteratureNoteIfAbsent(
    vaultPath,
    {
      id: "ln_duplicate",
      source_id: "src_duplicate",
      title: "Second duplicate",
      quote_text: "Second body",
      paraphrase_text: "",
      status: "draft",
      created_at: now,
      updated_at: now
    },
    { directoryFsPath: secondDir }
  );
  const note = await readNote(vaultPath, "literature", "ln_duplicate");
  assert.equal(first.written, true);
  assert.equal(second.written, false);
  assert.equal(second.reason, "exists");
  assert.equal(second.path, first.path);
  assert.equal(note.path, first.path);
  assert.equal(note.note.title, "First duplicate");
  assert.equal(note.note.body, "First body");
});

test("writeLiteratureNoteIfAbsent with a prebuilt path index does not rescan unmatched files", async () => {
  const vaultPath = await makeTempVault();
  const now = new Date().toISOString();
  const targetDir = path.join(vaultPath, "notes", "literature", "batch-indexed");
  await fs.mkdir(targetDir, { recursive: true });
  const notePathIndex = await buildNotePathIndex(vaultPath, "literature");

  const result = await writeLiteratureNoteIfAbsent(
    vaultPath,
    {
      id: "ln_indexed",
      source_id: "src_indexed",
      title: "Indexed literature",
      quote_text: "Indexed body",
      paraphrase_text: "",
      status: "draft",
      created_at: now,
      updated_at: now
    },
    {
      directoryFsPath: targetDir,
      notePathIndex,
      skipInit: true
    }
  );

  assert.equal(result.written, true);
  assert.equal(result.path, path.join(targetDir, "ln_indexed.md"));
  assert.deepEqual(notePathIndex.get("ln_indexed.md"), [path.join(targetDir, "ln_indexed.md")]);
});

test("readNote reports ambiguous paths when legacy duplicate files exist without catalog metadata", async () => {
  const vaultPath = await makeTempVault();
  const firstDir = path.join(vaultPath, "notes", "literature", "legacy-a");
  const secondDir = path.join(vaultPath, "notes", "literature", "legacy-b");
  await fs.mkdir(firstDir, { recursive: true });
  await fs.mkdir(secondDir, { recursive: true });
  const filename = "ln_legacy_dup.md";
  const markdown = [
    "---",
    "id: ln_legacy_dup",
    "title: Legacy duplicate",
    "note_type: literature",
    "---",
    "",
    "# Legacy duplicate",
    "",
    "Duplicate body"
  ].join("\n");
  await fs.writeFile(path.join(firstDir, filename), markdown, "utf8");
  await fs.writeFile(path.join(secondDir, filename), markdown, "utf8");

  await assert.rejects(() => readNote(vaultPath, "literature", "ln_legacy_dup"), {
    code: "NOTE_PATH_AMBIGUOUS"
  });
});

test("readNote ignores stale catalog paths when the markdown file is missing", async () => {
  const vaultPath = await makeTempVault();
  const liveDir = path.join(vaultPath, "notes", "literature", "live");
  const staleDir = path.join(vaultPath, "notes", "literature", "stale");
  await fs.mkdir(liveDir, { recursive: true });
  await fs.mkdir(staleDir, { recursive: true });
  const filename = "ln_stale_catalog.md";
  const markdown = [
    "---",
    "id: ln_stale_catalog",
    "title: Live copy",
    "note_type: literature",
    "---",
    "",
    "# Live copy",
    "",
    "Live body"
  ].join("\n");
  const livePath = path.join(liveDir, filename);
  await fs.writeFile(livePath, markdown, "utf8");

  const note = await readNote(vaultPath, "literature", "ln_stale_catalog");
  assert.equal(note.path, livePath);
  assert.equal(note.note.title, "Live copy");
});

test("title is derived from first markdown line when title field is absent", async () => {
  const vaultPath = await makeTempVault();
  const now = new Date().toISOString();

  await writePermanentNoteIfAbsent(vaultPath, {
    id: "pn_without_title",
    core_claim: "第一行作为标题\n这里是正文第二行",
    rationale: "Rationale",
    authorship: { user_confirmed: true, ai_assisted: false },
    originality_status: "pass",
    status: "draft",
    created_at: now,
    updated_at: now
  });

  const permanent = await readNote(vaultPath, "permanent", "pn_without_title");
  assert.equal(permanent.note.title, "第一行作为标题");
  assert.equal(permanent.note.body, "这里是正文第二行");
  assert.match(permanent.markdown, /^---[\s\S]*\n# 第一行作为标题\n\n这里是正文第二行$/);
});
