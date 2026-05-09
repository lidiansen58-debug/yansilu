import test from "node:test";
import assert from "node:assert/strict";
import {
  assetMarkdownSnippet,
  formatMarkdownLinkDestination
} from "../../apps/web/src/components-editor-pane.js";

test("formatMarkdownLinkDestination wraps local paths that need Markdown angle destinations", () => {
  assert.equal(
    formatMarkdownLinkDestination("../../../assets/images/pn_1/image data.png"),
    "<../../../assets/images/pn_1/image data.png>"
  );
  assert.equal(
    formatMarkdownLinkDestination("../../../assets/files/pn_1/report(1).pdf"),
    "<../../../assets/files/pn_1/report(1).pdf>"
  );
  assert.equal(
    formatMarkdownLinkDestination("<../../../assets/files/pn_1/already wrapped.txt>"),
    "<../../../assets/files/pn_1/already wrapped.txt>"
  );
  assert.equal(
    formatMarkdownLinkDestination("../../../assets/files/pn_1/plain.txt"),
    "../../../assets/files/pn_1/plain.txt"
  );
});

test("assetMarkdownSnippet inserts stable Markdown for image and file assets with spaced paths", () => {
  assert.equal(
    assetMarkdownSnippet({
      assetKind: "image",
      fileName: "\u56fe\u50cf \u8d44\u6599.png",
      markdownLinkPath: "../../../assets/images/pn_1/\u56fe\u50cf \u8d44\u6599.png"
    }),
    "![\u56fe\u50cf \u8d44\u6599](<../../../assets/images/pn_1/\u56fe\u50cf \u8d44\u6599.png>)"
  );
  assert.equal(
    assetMarkdownSnippet({
      assetKind: "file",
      fileName: "reference file.txt",
      markdownLinkPath: "../../../assets/files/pn_1/reference file.txt"
    }),
    "[reference file.txt](<../../../assets/files/pn_1/reference file.txt>)"
  );
});
