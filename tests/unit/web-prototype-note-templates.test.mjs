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
import { legacyLiteratureTemplateSource } from "../../apps/web/src/literature-note-template.js";
import { parseLiteratureWorkspace, validateLiteratureTemplateSource } from "../../apps/web/src/editor-template-workspace.js";

test("prototype note template helpers keep default template sources stable", () => {
  assert.equal(NOTE_TEMPLATE_STORAGE_KEYS.permanent, "yansilu:settings:note-template:permanent");
  assert.match(defaultPermanentTemplateSource(), /## 核心观点/);
  assert.match(defaultPermanentTemplateSource(), /## 相关笔记/);
  const literature = defaultLiteratureTemplateSource();
  assert.deepEqual([...literature.matchAll(/^## (.+)$/gm)].map(match => match[1]), ["出处", "原文", "我的理解"]);
  assert.equal((literature.match(/^- /gm) || []).length, 3);
  assert.doesNotMatch(literature, /判断种子|年份|容器|DOI|保留原因/);
  assert.equal(validateLiteratureTemplateSource(literature).ok, true);
  const parsed = parseLiteratureWorkspace(literature);
  assert.equal(parsed.originalText, "");
  assert.equal(parsed.paraphrase, "");
});

test("only the exact old literature default upgrades; custom templates and history are preserved", () => {
  const legacy = legacyLiteratureTemplateSource();
  assert.equal(normalizeStoredNoteTemplateSource(legacy, "literature"), defaultLiteratureTemplateSource());
  assert.equal(normalizeStoredNoteTemplateSource(legacy.replace(/\n/g, "\r\n"), "literature"), defaultLiteratureTemplateSource());
  const custom = legacy.replace("用你自己的话重写，不要贴原句。", "保留我的研究笔记。用自己的话说明原文。");
  assert.equal(normalizeStoredNoteTemplateSource(custom, "literature"), custom.trim());
  assert.deepEqual(normalizeNoteTemplateHistory([legacy, custom], "literature"), [legacy.trim(), custom.trim()]);
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

test("generated default permanent template uses one source section and one prompt per field", () => {
  const draft = composePermanentTemplateDraft({
    title: "自己的判断",
    coreClaim: "写出自己的判断。",
    whyTrue: "真实依据",
    boundary: "实际边界",
    relatedClues: "- 来源：[[真实材料]]"
  });
  assert.equal((draft.match(/^## 相关笔记$/gm) || []).length, 1);
  assert.match(draft, /\[\[真实材料\]\]/);
  assert.match(draft, /实际边界/);
  assert.doesNotMatch(draft, /来自哪条文献笔记|写成一句可被反驳|来源生成提示/);
});
