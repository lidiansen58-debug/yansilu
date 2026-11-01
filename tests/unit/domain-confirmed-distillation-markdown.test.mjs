import test from "node:test";
import assert from "node:assert/strict";
import { upsertConfirmedDistillationMarkdown as upsert } from "../../packages/domain/src/confirmed-distillation-markdown.mjs";

const section = thesis => `## 提炼观点\n\n### 当前观点\n\n${thesis}`;

for (const prompt of ["用自己的话，把这个想法写成一个清楚的判断。", "用自己的话写出一个判断，不直接照抄来源。", "写成一句可被反驳、可被引用、值得保留的判断。", "> 写成一句可被反驳、可被引用、值得保留的判断。"]) {
  test("confirmation replaces the untouched core-claim prompt: " + prompt, () => {
    const rest = "## 为什么成立\n\nMy reasons.\n\n## 相关笔记\n\n[[source]]\n\n## 补充内容\n\nOriginal observation.";
    const first = upsert(`# Note\n\n## 核心观点\n\n${prompt}\n\n${rest}`, section("My confirmed judgment."));
    assert.doesNotMatch(first, /## 核心观点/);
    assert.ok(first.includes(rest));
    assert.ok(first.includes("My confirmed judgment."));
    assert.equal(upsert(first, section("My confirmed judgment.")), first);
  });
}

test("confirmation retains authored core claims, additions and examples inside code", () => {
  const prompt = "用自己的话，把这个想法写成一个清楚的判断。";
  for (const body of [
    "## 核心观点\n\nMy own claim.\n\n## 为什么成立\n\nReason.",
    `## 核心观点\n\n${prompt}\n\nMy extra paragraph.\n\n## 为什么成立\n\nReason.`,
    `\`\`\`md\n## 核心观点\n\n${prompt}\n\n## 为什么成立\n\n\`\`\``,
    `## 核心观点\n\nMy own claim.\n\n## 来源\n\n## 核心观点\n\n${prompt}\n\n## 为什么成立\n\nQuoted example.`
  ]) assert.ok(upsert(`# Note\n\n${body}`, section("Confirmed")).includes(body));
});
test("repeated confirmations replace only the generated block and retain unsectioned user prose", () => {
  const prose = "Original observation.\n\nAnother paragraph with [[real_note]].\n\n![photo](photo.png)";
  const first = upsert(`# Note\n\n${prose}`, section("First"));
  const second = upsert(first, section("Second"));
  assert.ok(second.includes(prose));
  assert.equal((second.match(/## 提炼观点/g) || []).length, 1);
  assert.ok(second.includes("Second") && !second.includes("First"));
  assert.equal(upsert(second, section("Second")), second);
});

test("legacy unmarked blocks retain original prose and custom headings after known fields", () => {
  const trailing = "Original observation.\n\n### My annotation\n\nDo not erase this.\n\n## Sources\n\n[[source]]";
  const legacy = `# Note\n\n${section("Old")}\n\n### 补充说明\n\n1. One\n2. Two\n3. Three\n\n### 边界\n\nA known boundary.\n\n${trailing}`;
  const updated = upsert(legacy, section("New"));
  assert.ok(updated.includes(trailing));
  assert.ok(!updated.includes("Old") && !updated.includes("A known boundary."));
  assert.ok(upsert(updated, section("Again")).includes(trailing));
});

for (const code of ["```md\n## 提炼观点\n\n### 当前观点\n\nExample\n```", "~~~md\n## 提炼观点\nExample\n~~~", "    ## 提炼观点\n    Example"]) {
  test(`headings in code remain unchanged (${code.slice(0, 6)})`, () => {
    const original = `# Note\n\n${code}\n\nOriginal observation.`;
    const result = upsert(upsert(original, section("First")), section("Second"));
    assert.ok(result.includes(code));
    assert.ok(result.includes("Original observation."));
  });
}

test("an authored section with the same name is preserved rather than treated as generated content", () => {
  const authored = "## 提炼观点\n\nMy authored paragraph.\n\n## Another section\n\nKeep this.";
  const result = upsert(`# Note\n\n${authored}`, section("Confirmed"));
  assert.ok(result.includes(authored));
  const repeated = upsert(result, section("Updated"));
  assert.ok(repeated.includes(authored));
  assert.equal((repeated.match(/## 提炼观点/g) || []).length, 2);
  assert.equal(upsert(repeated, section("Updated")), repeated);
});
