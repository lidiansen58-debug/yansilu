import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { buildMarkdownCandidates } from "../../packages/markdown-engine/src/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("buildMarkdownCandidates parses markdown/obsidian files into candidates", async () => {
  const sourceDir = await makeTempDir("yansilu-md-engine-");
  await fs.writeFile(
    path.join(sourceDir, "sample.md"),
    [
      "---",
      "title: Engine sample",
      "type: permanent",
      'aliases: ["Engine alias"]',
      'tags: ["method"]',
      "---",
      "",
      "A note body with #insight and [[linked-note]]."
    ].join("\n"),
    "utf8"
  );

  const result = await buildMarkdownCandidates({
    connector: "obsidian",
    payload: { path: sourceDir },
    options: { detectWikilinks: true }
  });

  assert.equal(result.sources.length, 1);
  assert.equal(result.literature.length, 1);
  assert.equal(result.permanent.length, 1);
  assert.equal(result.sources[0].imported_from, "obsidian");
  assert.deepEqual(result.sources[0].aliases, ["Engine alias"]);
  assert.deepEqual(result.literature[0].wikilinks, ["linked-note"]);
  assert.deepEqual(result.literature[0].wikilink_targets, ["linked-note"]);
  assert.ok(result.literature[0].tags.includes("method"));
  assert.ok(result.literature[0].tags.includes("insight"));
});

test("buildMarkdownCandidates parses Obsidian aliases and wikilink variants", async () => {
  const sourceDir = await makeTempDir("yansilu-md-engine-variants-");
  await fs.writeFile(
    path.join(sourceDir, "variants.md"),
    [
      "---",
      "title: Variant sample",
      "aliases:",
      "  - First alias",
      "  - Second alias",
      "---",
      "",
      [
        "[[Target Note|Readable title]]",
        "[[Target Note#Section]]",
        "[[Target Note#Section^block-id|Block title]]",
        "[[#Local heading|Local title]]",
        "![[Image.png]]",
        "[[Target Note|Readable title]]"
      ].join(" ")
    ].join("\n"),
    "utf8"
  );

  const result = await buildMarkdownCandidates({
    connector: "obsidian",
    payload: { path: sourceDir }
  });

  const note = result.literature[0];
  assert.deepEqual(note.aliases, ["First alias", "Second alias"]);
  assert.deepEqual(note.wikilinks, [
    "Target Note|Readable title",
    "Target Note#Section",
    "Target Note#Section^block-id|Block title",
    "#Local heading|Local title",
    "Image.png"
  ]);
  assert.deepEqual(note.wikilink_targets, ["Target Note", "Image.png"]);
  assert.deepEqual(note.parsed_wikilinks[0], {
    raw: "Target Note|Readable title",
    target: "Target Note",
    heading: null,
    block: null,
    alias: "Readable title",
    display: "Readable title",
    embed: false
  });
  assert.deepEqual(note.parsed_wikilinks[2], {
    raw: "Target Note#Section^block-id|Block title",
    target: "Target Note",
    heading: "Section",
    block: "block-id",
    alias: "Block title",
    display: "Block title",
    embed: false
  });
  assert.deepEqual(note.parsed_wikilinks[3], {
    raw: "#Local heading|Local title",
    target: null,
    heading: "Local heading",
    block: null,
    alias: "Local title",
    display: "Local title",
    embed: false
  });
  assert.equal(note.parsed_wikilinks[4].embed, true);
});

test("buildMarkdownCandidates can disable wikilink detection", async () => {
  const sourceDir = await makeTempDir("yansilu-md-engine-no-links-");
  await fs.writeFile(path.join(sourceDir, "plain.md"), "Body with [[Target|Alias]].", "utf8");

  const result = await buildMarkdownCandidates({
    connector: "markdown",
    payload: { path: sourceDir },
    options: { detectWikilinks: false }
  });

  assert.deepEqual(result.literature[0].wikilinks, []);
  assert.deepEqual(result.literature[0].parsed_wikilinks, []);
  assert.deepEqual(result.literature[0].wikilink_targets, []);
});

test("buildMarkdownCandidates reports empty directories and unreadable roots as warnings", async () => {
  const sourceDir = await makeTempDir("yansilu-md-engine-empty-");
  const empty = await buildMarkdownCandidates({
    connector: "markdown",
    payload: { path: sourceDir }
  });

  assert.equal(empty.sources.length, 0);
  assert.equal(empty.warnings[0].code, "IMPORT_NO_MARKDOWN_FILE");

  const unreadable = await buildMarkdownCandidates({
    connector: "markdown",
    payload: { path: path.join(sourceDir, "missing") }
  });

  assert.equal(unreadable.sources.length, 0);
  assert.equal(unreadable.warnings[0].code, "IMPORT_SOURCE_UNREADABLE");
});

test("buildMarkdownCandidates warns on malformed frontmatter but keeps preview candidates", async () => {
  const sourceDir = await makeTempDir("yansilu-md-engine-malformed-");
  await fs.writeFile(
    path.join(sourceDir, "broken.md"),
    ["---", "title: Missing close", "", "Body after malformed frontmatter [[Target]]."].join("\n"),
    "utf8"
  );

  const result = await buildMarkdownCandidates({
    connector: "obsidian",
    payload: { path: sourceDir }
  });

  assert.equal(result.sources.length, 1);
  assert.equal(result.literature.length, 1);
  assert.equal(result.warnings[0].code, "IMPORT_MALFORMED_FRONTMATTER");
  assert.deepEqual(result.literature[0].wikilink_targets, ["Target"]);
});

test("buildMarkdownCandidates parses the edge-case Obsidian fixture vault", async () => {
  const fixturePath = path.join(REPO_ROOT, "tests", "fixtures", "imports", "obsidian-edge-vault");
  const result = await buildMarkdownCandidates({
    connector: "obsidian",
    payload: { path: fixturePath }
  });

  assert.equal(result.sources.length, 5);
  assert.equal(result.literature.length, 5);
  assert.equal(result.permanent.length, 1);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].code, "IMPORT_MALFORMED_FRONTMATTER");

  const sourceNote = result.literature.find((note) => note.title === "Source Note");
  assert.ok(sourceNote);
  assert.deepEqual(sourceNote.aliases, ["Source Alias", "Source Alt"]);
  assert.ok(sourceNote.tags.includes("edge"));
  assert.ok(sourceNote.tags.includes("writing"));
  assert.deepEqual(sourceNote.wikilink_targets, ["Target Note", "image.png"]);
  assert.deepEqual(sourceNote.parsed_wikilinks[0], {
    raw: "Target Note|Readable target",
    target: "Target Note",
    heading: null,
    block: null,
    alias: "Readable target",
    display: "Readable target",
    embed: false
  });
  assert.equal(sourceNote.parsed_wikilinks[2].target, null);
  assert.equal(sourceNote.parsed_wikilinks[3].embed, true);

  const duplicateNotes = result.literature.filter((note) => note.title === "Duplicate Idea");
  assert.equal(duplicateNotes.length, 2);

  const malformedNote = result.literature.find((note) => note.title === "malformed-frontmatter");
  assert.ok(malformedNote);
  assert.deepEqual(malformedNote.wikilink_targets, ["Target Note"]);
});

test("buildMarkdownCandidates parses realistic nested Obsidian vault with Chinese tags", async () => {
  const fixturePath = path.join(REPO_ROOT, "tests", "fixtures", "imports", "obsidian-realistic-vault");
  const result = await buildMarkdownCandidates({
    connector: "obsidian",
    payload: { path: fixturePath }
  });

  assert.equal(result.sources.length, 2);
  assert.equal(result.literature.length, 2);
  assert.equal(result.permanent.length, 1);
  assert.deepEqual(result.warnings, []);

  const chineseNote = result.literature.find((note) => note.title === "中文阅读卡片");
  assert.ok(chineseNote);
  assert.deepEqual(chineseNote.aliases, ["CN reading note"]);
  assert.ok(chineseNote.tags.includes("研究/方法"));
  assert.ok(chineseNote.tags.includes("来源/访谈"));
  assert.equal(chineseNote.tags.includes("#来源/访谈"), false);
  assert.ok(chineseNote.tags.includes("读书/论文"));
  assert.ok(chineseNote.tags.includes("产品-策略"));
  assert.deepEqual(chineseNote.wikilink_targets, ["Research/Spacing Note", "assets/chart 1.png"]);
  assert.equal(chineseNote.parsed_wikilinks[1].embed, true);
  assert.match(chineseNote.source_id, /^src_/);

  const permanent = result.permanent[0];
  assert.equal(permanent.title, "Spacing Note");
  assert.ok(permanent.tags.includes("学习/记忆"));
  assert.ok(permanent.from_literature_note_ids[0].startsWith("ln_"));
});

test("buildMarkdownCandidates decodes GB18030 markdown and warns that non-UTF8 decoding was used", async () => {
  const sourceDir = await makeTempDir("yansilu-md-engine-gb18030-");
  const gb18030Hex =
    "2d2d2d0a7469746c653a20d6d0cec4d4c4b6c1bfa8c6ac0a746167733a0a20202d20d1d0bebf2fb7bdb7a80a2d2d2d0a0ad5fdcec42023b1eac7a9";
  await fs.writeFile(path.join(sourceDir, "gb18030.md"), Buffer.from(gb18030Hex, "hex"));

  const result = await buildMarkdownCandidates({
    connector: "obsidian",
    payload: { path: sourceDir }
  });

  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].title, "中文阅读卡片");
  assert.ok(result.literature[0].tags.includes("研究/方法"));
  assert.match(result.literature[0].quote_text, /正文/);
  assert.ok(result.warnings.some((warning) => warning.code === "IMPORT_NON_UTF8_MARKDOWN_DECODED"));
});

test("buildMarkdownCandidates keeps GB18030 Chinese body notes even without frontmatter", async () => {
  const sourceDir = await makeTempDir("yansilu-md-engine-gb18030-plain-body-");
  const gb18030Hex = "d5e2cac7d2bbb6ced6d0cec4d5fdcec4a3acb2bbbbe1b1bbbaf6c2d4a1a3";
  await fs.writeFile(path.join(sourceDir, "plain-body.md"), Buffer.from(gb18030Hex, "hex"));

  const result = await buildMarkdownCandidates({
    connector: "obsidian",
    payload: { path: sourceDir }
  });

  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].title, "plain-body");
  assert.match(result.literature[0].quote_text, /这是一段中文正文，不会被忽略。/);
  assert.ok(result.warnings.some((warning) => warning.code === "IMPORT_NON_UTF8_MARKDOWN_DECODED"));
});

test("buildMarkdownCandidates normalizes escaped newlines in imported titles", async () => {
  const sourceDir = await makeTempDir("yansilu-md-engine-title-normalize-");
  await fs.writeFile(
    path.join(sourceDir, "picker.md"),
    ['---', 'title: "Picker Position Source 349681988\\n\\nBody starts here."', "---", "", "Body"].join("\n"),
    "utf8"
  );

  const result = await buildMarkdownCandidates({
    connector: "obsidian",
    payload: { path: sourceDir }
  });

  assert.equal(result.sources[0].title, "Picker Position Source 349681988 Body starts here.");
  assert.ok(result.warnings.some((warning) => warning.code === "IMPORT_TITLE_NORMALIZED"));
});

test("buildMarkdownCandidates warns when imported text looks already corrupted", async () => {
  const sourceDir = await makeTempDir("yansilu-md-engine-corruption-warning-");
  await fs.writeFile(
    path.join(sourceDir, "corrupted.md"),
    ["---", "title: ???? ae26d5", "---", "", "??????????????????"].join("\n"),
    "utf8"
  );

  const result = await buildMarkdownCandidates({
    connector: "obsidian",
    payload: { path: sourceDir }
  });

  assert.equal(result.sources[0].title, "???? ae26d5");
  assert.ok(result.warnings.some((warning) => warning.code === "IMPORT_TEXT_SUSPECT_CORRUPTION"));
});

test("buildMarkdownCandidates skips legacy files that are neither UTF-8 nor safely decodable as GB18030", async () => {
  const sourceDir = await makeTempDir("yansilu-md-engine-unsupported-encoding-");
  const cp1252Hex = "2d2d2d0a7469746c653a20436166e9206e6f74650a2d2d2d0a0a426f64790a";
  await fs.writeFile(path.join(sourceDir, "cp1252.md"), Buffer.from(cp1252Hex, "hex"));

  const result = await buildMarkdownCandidates({
    connector: "obsidian",
    payload: { path: sourceDir }
  });

  assert.equal(result.sources.length, 0);
  assert.equal(result.literature.length, 0);
  assert.equal(result.permanent.length, 0);
  assert.ok(result.warnings.some((warning) => warning.code === "IMPORT_MARKDOWN_ENCODING_UNSUPPORTED"));
});

test("buildMarkdownCandidates does not flag normal question-heavy notes as corruption", async () => {
  const sourceDir = await makeTempDir("yansilu-md-engine-question-heavy-");
  await fs.writeFile(
    path.join(sourceDir, "questions.md"),
    [
      "---",
      "title: Interview prompts",
      "---",
      "",
      "What changed? Why now? Which user? What evidence? What risk? What boundary? What next?"
    ].join("\n"),
    "utf8"
  );

  const result = await buildMarkdownCandidates({
    connector: "obsidian",
    payload: { path: sourceDir }
  });

  assert.equal(result.sources.length, 1);
  assert.equal(result.literature.length, 1);
  assert.equal(result.warnings.some((warning) => warning.code === "IMPORT_TEXT_SUSPECT_CORRUPTION"), false);
});
