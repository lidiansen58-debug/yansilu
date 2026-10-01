import test from "node:test";
import assert from "node:assert/strict";
import { markdownCodeRanges, selectionTouchesMarkdownCode } from "../../apps/web/src/markdown-code-context.js";
import { bodyLinkRangeAtSelection } from "../../apps/web/src/editor-body-links.js";
import { EditorPane } from "../../apps/web/src/components-editor-pane.js";
import { normalizeToastuiWidgetMarkdown } from "../../apps/web/src/toastui-widget-markdown.js";
import { createCodeSafeMarkdownParagraphs } from "../../apps/web/src/toastui-code-paragraphs.js";

for (const [name, body] of [
  ["inline", "前文 `[[target|示例]]` 后文"],
  ["long inline delimiter", "``含 ` 和 [[target|示例]]``"],
  ["multiline inline", "`第一行\n[[target|示例]]`"],
  ["backtick fence", "```md\n[[target|示例]]\n```\n正文"],
  ["tilde fence", "~~~md\n[[target|示例]]\n~~~"],
  ["unclosed fence", "```md\n[[target|示例]]"],
  ["indented", "说明\n\n    [[target|示例]]\n\n正文"],
  ["tab indented", "\t[[target|示例]]"]
]) {
  test(`code example links stay literal (${name})`, () => {
    const from = body.indexOf("target"), selection = { from, to: from };
    assert.equal(selectionTouchesMarkdownCode(body, selection), true);
    assert.equal(bodyLinkRangeAtSelection(body, selection), null);
  });
}

test("a fence closes only with a matching marker and no trailing content", () => {
  const body = "````md\n```\n````not a close\n~~~\n[[target]]\n````\n[[real]]";
  assert.equal(bodyLinkRangeAtSelection(body, { from: body.indexOf("target"), to: body.indexOf("target") }), null);
  assert.equal(bodyLinkRangeAtSelection(body, { from: body.indexOf("real"), to: body.indexOf("real") }).raw, "real");
});

test("escaped backticks and links are literal while an even slash count permits a link", () => {
  assert.deepEqual(markdownCodeRanges("\\`literal"), []);
  assert.equal(bodyLinkRangeAtSelection("\\[[target]]", { from: 4, to: 4 }), null);
  assert.equal(bodyLinkRangeAtSelection("\\\\[[target]]", { from: 5, to: 5 }).raw, "target");
  assert.equal(bodyLinkRangeAtSelection("`unmatched [[target]]", { from: 15, to: 15 }).raw, "target");
});

test("inline link suggestions ignore code and escaped triggers but resume in prose", () => {
  const pane = Object.create(EditorPane.prototype);
  pane.isWysiwygMode = () => false;
  for (const body of ["`[[材料`", "```md\n[[材料", "\n    [[材料", "\\[[材料"]) {
    pane.getEditorValue = () => body;
    pane.editorSelection = () => ({ from: body.indexOf("材料") + 2, to: body.indexOf("材料") + 2 });
    assert.equal(pane.detectInlineLinkContext(), null);
  }
  pane.getEditorValue = () => "`代码` 正文 [[材料";
  pane.editorSelection = () => ({ from: 12, to: 12 });
  assert.equal(pane.detectInlineLinkContext().query, "材料");
});

test("code ranges preserve widget-looking literals and protect the unclosed EOF cursor", () => {
  const body = "    $$widget0 [[示例]]$$\n\n$$widget1 [[真实]]$$";
  assert.equal(normalizeToastuiWidgetMarkdown(body).value, "    $$widget0 [[示例]]$$\n\n[[真实]]");
  assert.equal(selectionTouchesMarkdownCode("~~~\n", { from: 4, to: 4 }), true);
  assert.equal(selectionTouchesMarkdownCode("`示例`正文", { from: 4, to: 4 }), false);
  assert.equal(selectionTouchesMarkdownCode("正文 `示例`", { from: 0, to: 5 }), true);
});

test("Markdown model keeps code and literal widget wrappers out of token conversion", () => {
  const widgetInputs = [], schema = { text: text => ({ text, literal: true }) };
  const createWidgets = text => { widgetInputs.push(text); return [{ text, widget: true }]; };
  const code = "$$widget0 [[示例]]$$ #代码";
  const body = `正文 [[真实]] 与 \`${code}\`。\r\n\r\n~~~md\r\n${code}\r\n~~~\r\n\r\n    [[缩进代码]]\r\n\r\n末尾 [[真实]]`;
  const paragraphs = createCodeSafeMarkdownParagraphs(body, schema, createWidgets, (_, nodes) => nodes);
  assert.equal(paragraphs.map(nodes => nodes.map(node => node.text).join("")).join("\r\n"), body);
  assert.ok(widgetInputs.some(text => text.includes("[[真实]]")));
  assert.ok(widgetInputs.every(text => !text.includes("示例") && !text.includes("缩进代码") && !text.includes("#代码")));
  assert.ok(paragraphs[3].every(node => node.literal));
});
