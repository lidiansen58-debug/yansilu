import test from "node:test";
import assert from "node:assert/strict";
import { EditorPane } from "../../apps/web/src/components-editor-pane.js";
import { parsePermanentWorkspace } from "../../apps/web/src/editor-template-workspace.js";
import {
  defaultPermanentTemplateSource,
  legacyPermanentTemplateSource
} from "../../apps/web/src/prototype-note-templates.js";

const save = (body) => EditorPane.prototype.normalizePermanentBodyForSave.call({}, body);
const headings = (body) => body.split("\n").filter((line) => line.startsWith("## "));

for (const [name, template] of [
  ["current", defaultPermanentTemplateSource],
  ["legacy", legacyPermanentTemplateSource]
]) {
  test(`${name} permanent template keeps evidence and related notes distinct on save`, () => {
    const body = template("模板保存验证");
    const saved = save(body);
    assert.ok(headings(saved).includes("## 证据 / 来源"));
    assert.equal(headings(saved).filter((heading) => heading === "## 相关笔记").length, 1);
    assert.match(saved, /来自哪条文献笔记、经验、案例或观察？/);
    assert.match(saved, /它.*连接到哪些已有笔记/);
    assert.equal(save(saved), saved);
  });
}

for (const evidenceHeading of ["证据 / 来源", "证据来源", "来源线索"]) {
  for (const evidenceFirst of [true, false]) {
    test(`${evidenceHeading} keeps source links separate, evidence first=${evidenceFirst}`, () => {
      const evidence = `## ${evidenceHeading}\n\n来源 [[source-note]]。`;
      const related = "## 相关笔记\n\n延伸 [[related-note]]。";
      const body = `# 观点\n\n## 核心观点\n\n判断。\n\n${[evidence, related][evidenceFirst ? 0 : 1]}\n\n${[evidence, related][evidenceFirst ? 1 : 0]}`;
      const saved = save(body);
      assert.equal(parsePermanentWorkspace(saved).relatedClues, "延伸 [[related-note]]。");
      assert.ok(saved.includes(evidence));
      assert.ok(saved.includes(related));
      assert.equal(saved.indexOf(evidence) < saved.indexOf(related), evidenceFirst);
      assert.equal(save(saved), saved);
    });
  }

  test(`source-only legacy ${evidenceHeading} remains accepted`, () => {
    const body = `# 旧笔记\n\n## 核心观点\n\n判断。\n\n## ${evidenceHeading}\n\n来源 [[old-source]]。`;
    assert.equal(parsePermanentWorkspace(body).relatedClues, "来源 [[old-source]]。");
    assert.match(save(body), /来源 \[\[old-source\]\]。/);
  });
}

test("saving preserves intentional repeated related sections and custom sections", () => {
  const body = "# 观点\n\n## 核心观点\n\n判断。\n\n## 证据 / 来源\n\n证据 [[source]]。\n\n## 相关笔记\n\n第一条 [[one]]。\n\n## 我的观察\n\n自定义内容。\n\n## 相关笔记\n\n第二条 [[two]]。";
  assert.equal(save(body).trim(), body);
});
