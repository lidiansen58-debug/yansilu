import test from "node:test";
import assert from "node:assert/strict";
import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function fixture(body, rich = false) {
  let value = body;
  let selection = { from: body.indexOf("\n") < 0 ? body.length : body.indexOf("\n") };
  selection.to = selection.from;
  const replace = (from, to, text, options) => {
    value = value.slice(0, from) + text + value.slice(to);
    selection = { from: options.selectionStart, to: options.selectionEnd };
    return true;
  };
  const pane = Object.assign(Object.create(EditorPane.prototype), {
    getEditorValue: () => value,
    editorSelection: () => selection,
    isWysiwygMode: () => rich,
    replaceEditorRange: replace,
    replaceMarkdownWhileInWysiwyg: replace,
    setEditorSelectionRange: (from, to) => { selection = { from, to }; }
  });
  return { pane, body: () => value, select: (from, to = from) => { selection = { from, to }; },
    type: text => { value = value.slice(0, selection.from) + text + value.slice(selection.to); } };
}

for (const gap of ["\n", "\n\n", "\n\n\n", "\n\n\n\n"]) {
  test(`source title Enter separates a template after ${gap.length} line breaks`, () => {
    const template = "## 核心观点\n\n写下判断。\n\n## 自定义字段\n\n保留提示。";
    const f = fixture(`# 新想法${gap}${template}`);
    assert.equal(f.pane.enterBodyFromTitle(), true);
    f.type("第一段正文。");
    assert.equal(f.body(), `# 新想法\n\n第一段正文。\n\n${template}`);
  });
}
for (const gap of ["", "\n", "\n\n"]) {
  test(`source title Enter allows direct typing with ${gap.length} trailing line breaks`, () => {
    const f = fixture(`# 新想法${gap}`);
    assert.equal(f.pane.enterBodyFromTitle(), true);
    f.type("第一段正文。");
    assert.equal(f.body(), "# 新想法\n\n第一段正文。");
  });
}

test("rich-text title Enter uses the editor's native paragraph handling", () => {
  const f = fixture("# 新想法\n\n## 核心观点", true);
  assert.equal(f.pane.enterBodyFromTitle(), false);
  assert.equal(f.body(), "# 新想法\n\n## 核心观点");
});

test("title Enter keeps existing body text separate", () => {
  const f = fixture("# 记录\n\n已有正文，不要拼接。");
  f.pane.enterBodyFromTitle();
  f.type("新的第一段。");
  assert.equal(f.body(), "# 记录\n\n新的第一段。\n\n已有正文，不要拼接。");
});

test("body Enter and a selected title are left to the editor", () => {
  const body = "# 记录\n\n已有正文。";
  const f = fixture(body);
  f.select(body.length);
  assert.equal(f.pane.enterBodyFromTitle(), false);
  f.select(2, 4);
  assert.equal(f.pane.enterBodyFromTitle(), false);
  assert.equal(f.body(), body);
});
