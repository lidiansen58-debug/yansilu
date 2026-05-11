import test from "node:test";
import assert from "node:assert/strict";
import {
  assetMarkdownSnippet,
  formatMarkdownLinkDestination,
  parseMarkdownLinkSyntax
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

test("parseMarkdownLinkSyntax supports angle-wrapped asset destinations", () => {
  assert.deepEqual(parseMarkdownLinkSyntax("![chart](<../../../assets/images/pn_1/chart (1).png>)"), {
    isImage: true,
    label: "chart",
    href: "<../../../assets/images/pn_1/chart (1).png>",
    raw: "![chart](<../../../assets/images/pn_1/chart (1).png>)",
    length: 53
  });
  assert.deepEqual(parseMarkdownLinkSyntax("[reference file.txt](<../../../assets/files/pn_1/reference file.txt>)"), {
    isImage: false,
    label: "reference file.txt",
    href: "<../../../assets/files/pn_1/reference file.txt>",
    raw: "[reference file.txt](<../../../assets/files/pn_1/reference file.txt>)",
    length: 69
  });
});
