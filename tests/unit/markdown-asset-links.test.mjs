import test from "node:test";
import assert from "node:assert/strict";
import { rewriteVaultAssetLinks } from "../../packages/domain/src/markdown-asset-links.mjs";

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
