import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildWritingOutlineOutput } from "../../apps/web/src/writing-outline-output.js";

function fixture() {
  return {
    project: { id: "wp_internal", title: "理解与写作", goal: "解释自己的判断", basket_notes: [{ id: "pn_internal", title: "解释是理解的起点" }] },
    scaffold: { id: "ds_internal", sections: [{ order: 9, heading: "用解释检验理解", purpose: "写下自己的解释。", key_points: ["不能只背结论"], evidence_note_ids: ["pn_internal"], gaps: ["补一个实例"], counterpoints: ["解释流畅不等于正确"], open_questions: ["如何检验？"] }], open_questions: ["还需要什么证据？"] },
    markdown: "就绪检查 wp_internal pn_internal ds_internal"
  };
}

test("outline output keeps authored content and real source links without the internal report", () => {
  const output = buildWritingOutlineOutput(fixture());
  for (const content of ["# 理解与写作", "目标：解释自己的判断", "### 1. 用解释检验理解", "写下自己的解释。", "不能只背结论", "[[解释是理解的起点]]", "补一个实例", "解释流畅不等于正确", "如何检验？", "还需要什么证据？"]) assert.ok(output.includes(content), content);
  assert.doesNotMatch(output, /wp_internal|pn_internal|ds_internal|就绪检查|段落-证据对照表|待补充/);
  assert.equal(output.match(/^## 文章提纲$/gm).length, 1);
});

test("outline source titles never fall back to identifiers", () => {
  const input = fixture();
  input.project.basket_notes = [];
  const output = buildWritingOutlineOutput(input);
  assert.match(output, /来源笔记暂不可用/);
  assert.doesNotMatch(output, /pn_internal/);
});

test("outline output preserves section order and does not mutate stored data", () => {
  const input = fixture();
  input.scaffold.sections.unshift({ order: 42, heading: "用户重排的章节", purpose: "保留 pn_internal 这段用户文字" });
  const snapshot = structuredClone(input);
  const output = buildWritingOutlineOutput(input);
  assert.match(output, /### 1\. 用户重排的章节/);
  assert.match(output, /### 2\. 用解释检验理解/);
  assert.match(output, /保留 pn_internal 这段用户文字/);
  assert.deepEqual(input, snapshot);
});

test("outline output omits empty fields and rejects an absent outline", () => {
  assert.throws(() => buildWritingOutlineOutput(), /请先生成提纲/);
  const output = buildWritingOutlineOutput({ scaffold: { sections: [{ heading: "\n第一章\r\n继续", gaps: [null, "", " "] }] } });
  assert.match(output, /^# 未命名文章/);
  assert.match(output, /### 1\. 第一章 继续/);
  assert.doesNotMatch(output, /待补内容|来源笔记|null|undefined/);
});

test("copy and export use the same structured outline output", async () => {
  const host = await readFile(new URL("../../apps/web/src/prototype-app.js", import.meta.url), "utf8");
  for (const name of ["copyWritingScaffold", "exportWritingScaffold"]) {
    const body = host.slice(host.indexOf(`async function ${name}(`)).split("\n}\n")[0];
    assert.match(body, /const markdown = buildWritingOutlineOutput\(bundle\)\.trim\(\)/);
    assert.doesNotMatch(body, /String\(bundle\.markdown/);
  }
});
