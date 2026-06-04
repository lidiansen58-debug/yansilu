import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { assertNoAcceptanceErrors, buildAcceptanceReport, localMarkdownTargets } from "../../scripts/obsidian-export-acceptance.mjs";

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("localMarkdownTargets ignores pure heading anchors and strips file fragments", () => {
  const targets = localMarkdownTargets([
    "[jump](#section)",
    "[note](./Target Note.md#part-two)",
    "[external](https://example.com/page#section)"
  ].join("\n"));

  assert.deepEqual(targets, ["./Target Note.md"]);
});

test("buildAcceptanceReport accepts heading anchors and alias-based wikilinks", async () => {
  const targetPath = await makeTempDir("yansilu-obsidian-export-acceptance-");
  await fs.writeFile(
    path.join(targetPath, "Target Note.md"),
    [
      "---",
      "aliases: [\"Alias Name\"]",
      "---",
      "",
      "# Target Note",
      "",
      "## Part Two"
    ].join("\n"),
    "utf8"
  );
  await fs.writeFile(
    path.join(targetPath, "Source Note.md"),
    [
      "# Source Note",
      "",
      "[jump](#local-heading)",
      "[target](./Target Note.md#part-two)",
      "",
      "[[Alias Name]]"
    ].join("\n"),
    "utf8"
  );

  const report = buildAcceptanceReport(targetPath, {
    recordPath: path.join(targetPath, "dummy-record.json"),
    copiedBreakdown: {
      markdownFiles: 2,
      assetFiles: 0,
      totalFiles: 2
    }
  });

  assert.equal(report.severityCounts.error, 0);
  assert.equal(report.severityCounts.warning, 0);
  assert.deepEqual(report.issues, []);
});

test("buildAcceptanceReport accepts obsidian asset embeds", async () => {
  const targetPath = await makeTempDir("yansilu-obsidian-export-embed-acceptance-");
  await fs.mkdir(path.join(targetPath, "original"), { recursive: true });
  await fs.mkdir(path.join(targetPath, "assets", "images"), { recursive: true });
  await fs.writeFile(
    path.join(targetPath, "original", "Embedded asset note.md"),
    "# Embedded asset note\n\n![[../assets/images/chart 1.png]]\n",
    "utf8"
  );
  await fs.writeFile(path.join(targetPath, "assets", "images", "chart 1.png"), "png-bytes", "utf8");

  const report = buildAcceptanceReport(targetPath, {
    recordPath: path.join(targetPath, "dummy-record.json"),
    copiedBreakdown: {
      markdownFiles: 1,
      assetFiles: 1,
      totalFiles: 2
    }
  });

  assert.equal(report.severityCounts.error, 0);
  assert.deepEqual(report.issues, []);
});

test("assertNoAcceptanceErrors throws when export acceptance has errors", () => {
  assert.throws(
    () => assertNoAcceptanceErrors({ severityCounts: { error: 2, warning: 0 } }, "Export acceptance"),
    /Export acceptance failed with 2 errors/
  );
});
