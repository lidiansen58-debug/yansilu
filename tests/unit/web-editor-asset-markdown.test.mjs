import test from "node:test";
import assert from "node:assert/strict";
import {
  assetMarkdownSnippet,
  formatMarkdownLinkDestination,
  parseLiteratureWorkspace,
  parseMarkdownLinkSyntax,
  renderMarkdownPreview
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

test("renderMarkdownPreview resolves angle-wrapped vault image destinations", () => {
  const html = renderMarkdownPreview(
    "![\u56fe\u50cf \u8d44\u6599](<../../assets/images/pn_1/\u56fe\u50cf \u8d44\u6599.png>)",
    { noteMarkdownPath: "notes/original/source.md" }
  );

  assert.match(html, /preview-image-asset/);
  assert.match(html, /assets%2Fimages%2Fpn_1%2F/);
  assert.doesNotMatch(html, /preview-attachment-block/);
});

test("parseLiteratureWorkspace reads judgment seed, question, and boundary sections", () => {
  const parsed = parseLiteratureWorkspace(`# 文献 A

## 引用信息

- 标题：Source
- 作者：Author
- 年份：2026
- 页码 / 定位：p. 7
- DOI / ISBN / arXiv / URL / PDF：doi:10/example

## 原文

原文摘录

## 转述

用户转述

## 判断种子

一个可继续发展的判断

## 追问

还需要验证什么？

## 边界 / 反例

不适用的条件

## 保留原因

为什么保留
`);

  assert.equal(parsed.supportsJudgment, "一个可继续发展的判断");
  assert.equal(parsed.question, "还需要验证什么？");
  assert.equal(parsed.boundary, "不适用的条件");
  assert.equal(parsed.whyKeep, "为什么保留");
});

test("parseLiteratureWorkspace keeps backward-compatible literature headings", () => {
  const parsed = parseLiteratureWorkspace(`# 文献 B

## 原文

旧原文

## 转述

旧转述

## 支持判断

旧判断

## 边界与反例

旧边界
`);

  assert.equal(parsed.supportsJudgment, "旧判断");
  assert.equal(parsed.boundary, "旧边界");
});
