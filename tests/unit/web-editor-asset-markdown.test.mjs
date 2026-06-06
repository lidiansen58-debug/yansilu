import test from "node:test";
import assert from "node:assert/strict";
import {
  assetMarkdownSnippet,
  composePermanentWorkspace,
  deriveLiteratureSectionLabelsFromTemplate,
  formatMarkdownLinkDestination,
  parseLiteratureWorkspace,
  parseMarkdownLinkSyntax,
  parsePermanentWorkspace,
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
      fileName: "图像 资料.png",
      markdownLinkPath: "../../../assets/images/pn_1/图像 资料.png"
    }),
    "![图像 资料](<../../../assets/images/pn_1/图像 资料.png>)"
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
    "![图像 资料](<../../assets/images/pn_1/图像 资料.png>)",
    { noteMarkdownPath: "notes/original/source.md" }
  );

  assert.match(html, /preview-image-asset/);
  assert.match(html, /assets%2Fimages%2Fpn_1%2F/);
  assert.doesNotMatch(html, /preview-attachment-block/);
});

test("renderMarkdownPreview supports editor heading levels and ordered lists", () => {
  const html = renderMarkdownPreview(`### Section Three

###### Section Six

3. first ordered item
4. second ordered item`);

  assert.match(html, /<h3>Section Three<\/h3>/);
  assert.match(html, /<h6>Section Six<\/h6>/);
  assert.match(html, /<ol start="3">/);
  assert.match(html, /<li>first ordered item<\/li>/);
  assert.match(html, /<li>second ordered item<\/li>/);
  assert.doesNotMatch(html, /### Section Three/);
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

为什么值得保留
`);

  assert.equal(parsed.supportsJudgment, "一个可继续发展的判断");
  assert.equal(parsed.question, "还需要验证什么？");
  assert.equal(parsed.boundary, "不适用的条件");
  assert.equal(parsed.whyKeep, "为什么值得保留");
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

test("parseLiteratureWorkspace follows renamed headings inferred from template order", () => {
  const sectionLabels = deriveLiteratureSectionLabelsFromTemplate(`# {{title}}

## Source Card

- 标题：
- 作者：
- 年份：
- 页码 / 定位：
- DOI / ISBN / arXiv / URL / PDF：

## Excerpt

## My Paraphrase

## Claim Seed

## Open Question

## Constraints

## Why Keep
`);
  const parsed = parseLiteratureWorkspace(`# Renamed Literature Note

## Source Card

- 标题：Source
- 作者：Author
- 年份：2026
- 页码 / 定位：p. 8
- DOI / ISBN / arXiv / URL / PDF：doi:10/example

## Excerpt

Quoted passage

## My Paraphrase

User paraphrase

## Claim Seed

Possible claim

## Open Question

What still needs testing?

## Constraints

Where does this stop holding?

## Why Keep

Useful later in synthesis
`, { sectionLabels });

  assert.equal(parsed.originalText, "Quoted passage");
  assert.equal(parsed.paraphrase, "User paraphrase");
  assert.equal(parsed.supportsJudgment, "Possible claim");
  assert.equal(parsed.question, "What still needs testing?");
  assert.equal(parsed.boundary, "Where does this stop holding?");
  assert.equal(parsed.whyKeep, "Useful later in synthesis");
});

test("deriveLiteratureSectionLabelsFromTemplate stays conservative when custom headings would shift known fields", () => {
  const sectionLabels = deriveLiteratureSectionLabelsFromTemplate(`# {{title}}

## Source Card

## Excerpt

## Research Notes

## My Paraphrase

## Claim Seed

## Open Question

## Constraints

## Why Keep
`);

  assert.equal(sectionLabels.citation, "引用信息");
  assert.equal(sectionLabels.originalText, "原文");
  assert.equal(sectionLabels.paraphrase, "转述");
  assert.equal(sectionLabels.supportsJudgment, "判断种子");
  assert.equal(sectionLabels.question, "追问");
  assert.equal(sectionLabels.boundary, "边界 / 反例");
  assert.equal(sectionLabels.whyKeep, "保留原因");
});

test("parseLiteratureWorkspace can keep reading older renamed headings from template history candidates", () => {
  const currentLabels = deriveLiteratureSectionLabelsFromTemplate(`# {{title}}

## Source Card

## Excerpt

## My Paraphrase

## Claim Seed

## Open Question

## Constraints

## Why Keep
`);
  const oldLabels = deriveLiteratureSectionLabelsFromTemplate(`# {{title}}

## Metadata

## Quote

## Restatement

## Thesis Seed

## Tension

## Limits

## Worth Keeping
`);
  const parsed = parseLiteratureWorkspace(`# Historic Literature Note

## Metadata

- 标题：Source
- 作者：Author
- 年份：2025
- 页码 / 定位：p. 9
- DOI / ISBN / arXiv / URL / PDF：doi:10/history

## Quote

Original text

## Restatement

Old paraphrase

## Thesis Seed

Historical claim

## Tension

Historical question

## Limits

Historical boundary

## Worth Keeping

Historical reason
`, { sectionLabelCandidates: [currentLabels, oldLabels] });

  assert.equal(parsed.originalText, "Original text");
  assert.equal(parsed.paraphrase, "Old paraphrase");
  assert.equal(parsed.supportsJudgment, "Historical claim");
  assert.equal(parsed.question, "Historical question");
  assert.equal(parsed.boundary, "Historical boundary");
  assert.equal(parsed.whyKeep, "Historical reason");
});

test("parsePermanentWorkspace reads structured core sections and aliases", () => {
  const parsed = parsePermanentWorkspace(`# Permanent note

## 核心观点

Claim that can stand on its own.

## 为什么成立

Reasoning chain.

## 边界 / 反例

Counterexample or limit.

## 证据来源

- [[Source note]]

## 补充说明

Legacy detail that should stay editable.
`);

  assert.equal(parsed.coreClaim, "Claim that can stand on its own.");
  assert.equal(parsed.whyTrue, "Reasoning chain.");
  assert.equal(parsed.boundary, "Counterexample or limit.");
  assert.equal(parsed.relatedClues, "- [[Source note]]");
  assert.equal(parsed.supplement, "Legacy detail that should stay editable.");
  assert.deepEqual(parsed.extraSections, []);
  assert.equal(parsed.structured, true);
});

test("parsePermanentWorkspace preserves structured preface outside recognized sections", () => {
  const parsed = parsePermanentWorkspace(`# Permanent note

Intro paragraph stays outside sections.

## 核心观点

Claim that can stand on its own.

## 关联线索

- [[Source note]]
`);

  assert.equal(parsed.preface, "Intro paragraph stays outside sections.");
  assert.equal(parsed.coreClaim, "Claim that can stand on its own.");
  assert.equal(parsed.relatedClues, "- [[Source note]]");
  assert.equal(parsed.supplement, "");
  assert.deepEqual(parsed.sectionLayout, [
    { kind: "known", key: "coreClaim" },
    { kind: "known", key: "relatedClues" }
  ]);
});

test("parsePermanentWorkspace keeps legacy freeform content editable without forcing migration", () => {
  const parsed = parsePermanentWorkspace(`# Legacy note

A concise legacy claim.

Freeform supporting paragraph that did not use the new section headings yet.
`);

  assert.equal(parsed.coreClaim, "A concise legacy claim.");
  assert.equal(parsed.supplement, "Freeform supporting paragraph that did not use the new section headings yet.");
  assert.deepEqual(parsed.extraSections, []);
  assert.equal(parsed.structured, false);
});

test("composePermanentWorkspace omits empty optional sections in saved Markdown", () => {
  const markdown = composePermanentWorkspace({
    title: "Permanent note",
    coreClaim: "A stable claim.",
    whyTrue: "",
    boundary: "",
    relatedClues: "- [[Related note]]",
    supplement: ""
  });

  assert.match(markdown, /^# Permanent note/m);
  assert.match(markdown, /## 核心观点/);
  assert.match(markdown, /## 关联线索/);
  assert.doesNotMatch(markdown, /## 为什么成立/);
  assert.doesNotMatch(markdown, /## 补充内容/);
});

test("parsePermanentWorkspace preserves unknown top-level sections for round-trip save", () => {
  const parsed = parsePermanentWorkspace(`# Permanent note

## 核心观点

A stable claim.

## 自定义问题

This custom section should stay top-level.

## 关联线索

- [[Related note]]
`);

  assert.equal(parsed.coreClaim, "A stable claim.");
  assert.equal(parsed.relatedClues, "- [[Related note]]");
  assert.equal(parsed.supplement, "");
  assert.deepEqual(parsed.extraSections, [{ heading: "自定义问题", body: "This custom section should stay top-level." }]);
  assert.deepEqual(parsed.sectionLayout, [
    { kind: "known", key: "coreClaim" },
    { kind: "unknown", index: 0 },
    { kind: "known", key: "relatedClues" }
  ]);
});

test("composePermanentWorkspace keeps unknown sections top-level instead of nesting them under supplement", () => {
  const markdown = composePermanentWorkspace(
    {
      title: "Permanent note",
      coreClaim: "A stable claim.",
      relatedClues: "- [[Related note]]"
    },
    {
      extraSections: [{ heading: "自定义问题", body: "This custom section should stay top-level." }]
    }
  );

  assert.match(markdown, /## 核心观点/);
  assert.match(markdown, /## 自定义问题/);
  assert.match(markdown, /This custom section should stay top-level\./);
  assert.doesNotMatch(markdown, /## 补充内容/);
  assert.doesNotMatch(markdown, /### 自定义问题/);
});

test("composePermanentWorkspace preserves structured preface ahead of core sections", () => {
  const markdown = composePermanentWorkspace(
    {
      title: "Permanent note",
      coreClaim: "A stable claim.",
      relatedClues: "- [[Related note]]"
    },
    {
      preface: "Intro paragraph stays outside sections.",
      extraSections: [{ heading: "自定义问题", body: "This custom section should stay top-level." }]
    }
  );

  assert.match(markdown, /^# Permanent note\n\nIntro paragraph stays outside sections\./);
  assert.match(markdown, /\n\n## 核心观点/);
  assert.match(markdown, /\n\n## 自定义问题/);
  assert.doesNotMatch(markdown, /## 补充内容/);
});

test("composePermanentWorkspace preserves custom section order from parsed layout", () => {
  const parsed = parsePermanentWorkspace(`# Permanent note

## 核心观点

A stable claim.

## 自定义问题

Custom before related.

## 关联线索

- [[Related note]]
`);

  const markdown = composePermanentWorkspace(
    {
      title: parsed.title,
      preface: parsed.preface,
      coreClaim: "A revised stable claim.",
      relatedClues: parsed.relatedClues,
      supplement: parsed.supplement
    },
    {
      sectionLayout: parsed.sectionLayout,
      extraSections: parsed.extraSections
    }
  );

  const customIndex = markdown.indexOf("## 自定义问题");
  const relatedIndex = markdown.indexOf("## 关联线索");
  assert.notEqual(customIndex, -1);
  assert.notEqual(relatedIndex, -1);
  assert.ok(customIndex < relatedIndex, markdown);
});

test("composePermanentWorkspace can avoid appending omitted known sections when asked", () => {
  const markdown = composePermanentWorkspace(
    {
      title: "Permanent note",
      coreClaim: "A stable claim.",
      whyTrue: "This explanation should stay hidden when the template omits it.",
      relatedClues: "- [[Related note]]"
    },
    {
      sectionLayout: [
        { kind: "unknown", index: 0 }
      ],
      extraSections: [{ heading: "Context", body: "Template-defined custom section." }],
      appendRemainingKnown: false
    }
  );

  assert.match(markdown, /^# Permanent note/m);
  assert.match(markdown, /## Context/);
  assert.match(markdown, /Template-defined custom section\./);
  assert.doesNotMatch(markdown, /## \u6838\u5fc3\u89c2\u70b9/);
  assert.doesNotMatch(markdown, /## \u4e3a\u4ec0\u4e48\u6210\u7acb/);
  assert.doesNotMatch(markdown, /## \u5173\u8054\u7ebf\u7d22/);
});

test("parsePermanentWorkspace preserves legacy custom sections without wrapping them in supplement", () => {
  const parsed = parsePermanentWorkspace(`# Permanent note

Intro paragraph stays outside sections.

## Context

First block.

## Examples

Second block.
`);

  assert.equal(parsed.structured, false);
  assert.equal(parsed.preface, "Intro paragraph stays outside sections.");
  assert.equal(parsed.supplement, "");
  assert.deepEqual(parsed.extraSections, [
    { heading: "Context", body: "First block." },
    { heading: "Examples", body: "Second block." }
  ]);
  assert.deepEqual(parsed.sectionLayout, [
    { kind: "unknown", index: 0 },
    { kind: "unknown", index: 1 }
  ]);

  const markdown = composePermanentWorkspace(
    {
      title: parsed.title,
      preface: parsed.preface,
      supplement: parsed.supplement
    },
    {
      sectionLayout: parsed.sectionLayout,
      extraSections: parsed.extraSections
    }
  );

  assert.equal(
    markdown,
    `# Permanent note

Intro paragraph stays outside sections.

## Context

First block.

## Examples

Second block.
`
  );
});

test("parsePermanentWorkspace preserves repeated known sections as separate blocks", () => {
  const parsed = parsePermanentWorkspace(`# Permanent note

## \u6838\u5fc3\u89c2\u70b9

Claim one.

## \u6838\u5fc3\u89c2\u70b9

Claim two.

## \u5173\u8054\u7ebf\u7d22

- [[Related note]]
`);

  assert.equal(parsed.coreClaim, "Claim one.");
  assert.equal(parsed.relatedClues, "- [[Related note]]");
  assert.deepEqual(parsed.repeatedKnownSections, [
    {
      key: "coreClaim",
      heading: "\u6838\u5fc3\u89c2\u70b9",
      body: "Claim two."
    }
  ]);
  assert.deepEqual(parsed.sectionLayout, [
    { kind: "known", key: "coreClaim" },
    { kind: "duplicate_known", index: 0 },
    { kind: "known", key: "relatedClues" }
  ]);

  const markdown = composePermanentWorkspace(
    {
      title: parsed.title,
      preface: parsed.preface,
      coreClaim: parsed.coreClaim,
      relatedClues: parsed.relatedClues,
      supplement: parsed.supplement
    },
    {
      sectionLayout: parsed.sectionLayout,
      repeatedKnownSections: parsed.repeatedKnownSections
    }
  );

  assert.equal(
    markdown,
    `# Permanent note

## \u6838\u5fc3\u89c2\u70b9

Claim one.

## \u6838\u5fc3\u89c2\u70b9

Claim two.

## \u5173\u8054\u7ebf\u7d22

- [[Related note]]
`
  );
});
