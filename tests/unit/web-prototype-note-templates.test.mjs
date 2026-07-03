import test from "node:test";
import assert from "node:assert/strict";
import {
  NOTE_TEMPLATE_STORAGE_KEYS,
  applyTitleToNoteTemplate,
  composePermanentTemplateDraft,
  defaultLiteratureTemplateSource,
  defaultPermanentTemplateSource,
  legacyPermanentTemplateSource,
  normalizeNoteTemplateHistory,
  normalizeNoteTemplateSource,
  normalizeStoredNoteTemplateSource,
  noteTemplateHistoryWithPrevious
} from "../../apps/web/src/prototype-note-templates.js";

test("prototype note template helpers keep default template sources stable", () => {
  assert.equal(NOTE_TEMPLATE_STORAGE_KEYS.permanent, "yansilu:settings:note-template:permanent");
  assert.match(defaultPermanentTemplateSource(), /## 核心观点/);
  assert.match(defaultPermanentTemplateSource(), /## 相关笔记/);
  assert.match(defaultLiteratureTemplateSource(), /## 引用信息/);
  assert.match(defaultLiteratureTemplateSource(), /## 保留原因/);
});

test("prototype note template helpers normalize empty and legacy templates", () => {
  const oldStoredDefault = legacyPermanentTemplateSource();
  assert.match(normalizeNoteTemplateSource("", "permanent"), /## 核心观点/);
  assert.match(oldStoredDefault, /## 关联线索/);
  assert.equal(
    normalizeStoredNoteTemplateSource(oldStoredDefault, "permanent"),
    defaultPermanentTemplateSource()
  );
  assert.match(normalizeStoredNoteTemplateSource(oldStoredDefault, "permanent"), /## 相关笔记/);
  assert.equal(normalizeStoredNoteTemplateSource("  # Custom  ", "permanent"), "# Custom");
});

test("prototype note template helpers dedupe history and keep previous source first", () => {
  const first = "# First\n\n## 核心观点\n\nA";
  const second = "# Second\n\n## 核心观点\n\nB";
  assert.deepEqual(normalizeNoteTemplateHistory([first, first, second], "permanent"), [first, second]);
  assert.deepEqual(noteTemplateHistoryWithPrevious([second], first, "permanent"), [first, second]);
});

test("prototype note template helpers apply titles and compose permanent drafts", () => {
  const titled = applyTitleToNoteTemplate("Body without heading", "真正标题", "permanent", {
    ensureEditableNoteBody: (body) => `editable:${body}`
  });
  assert.match(titled, /^editable:# 真正标题/);

  const draft = composePermanentTemplateDraft({
    title: "判断卡",
    coreClaim: "核心判断",
    whyTrue: "因为",
    boundary: "边界"
  }, {
    permanentNoteTemplateBody: () => "# {{title}}\n\n## 核心观点\n\n旧判断"
  });
  assert.match(draft, /# 判断卡/);
  assert.match(draft, /旧判断/);
  assert.match(draft, /核心判断/);
  assert.match(draft, /来源生成提示/);
});
