import test from "node:test";
import assert from "node:assert/strict";
import { findVaultAssetLinks, rewriteVaultAssetLinks } from "../../packages/domain/src/markdown-asset-links.mjs";

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
