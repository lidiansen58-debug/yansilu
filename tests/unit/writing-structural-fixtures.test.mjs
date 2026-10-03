import test from "node:test";
import assert from "node:assert/strict";
import { buildStructuralFixture, structuralFixtureChecksPassed } from "../../scripts/writing-structural-fixtures.mjs";
import { buildWritingStrongModelRequest } from "../../packages/ai-orchestrator/src/writing-analysis.mjs";

for (const kind of ["transition", "evidence_gap", "unclear"]) {
  test(`${kind} fixture changes only the target purpose and reaches the actual request`, () => {
    const faulty = buildStructuralFixture(kind);
    const clean = buildStructuralFixture(kind, true);
    assert.deepEqual(faulty.input.notes, clean.input.notes);
    assert.deepEqual(faulty.input.currentOutline.sections.slice(0, 2), clean.input.currentOutline.sections.slice(0, 2));
    assert.notEqual(faulty.input.currentOutline.sections[2].purpose, clean.input.currentOutline.sections[2].purpose);
    const request = buildWritingStrongModelRequest(faulty.input);
    const payload = JSON.parse(request.messages[1].content);
    assert.equal(payload.currentOutline.sections[2].purpose, faulty.input.currentOutline.sections[2].purpose);
    assert.equal(payload.currentOutline.sections[2].sectionNumber, 3);
    assert.equal(request.outlineCheckContext.sourceExcerpts.test_quality_record, faulty.input.notes[0].body);
  });
}

test("structural gates reject missing findings, wrong location and extra suggestions", () => {
  const { expected } = buildStructuralFixture("unclear");
  const check = { kind: "unclear", sectionNumbers: [3] };
  assert.equal(structuralFixtureChecksPassed([check], expected), true);
  assert.equal(structuralFixtureChecksPassed([], expected), false);
  assert.equal(structuralFixtureChecksPassed([{ ...check, sectionNumbers: [2] }], expected), false);
  assert.equal(structuralFixtureChecksPassed([check, check], expected), false);
  assert.equal(structuralFixtureChecksPassed([{ ...check, kind: "repetition" }], expected), false);
  assert.equal(structuralFixtureChecksPassed([], { ...expected, clean: true }), true);
  assert.equal(structuralFixtureChecksPassed([check], { ...expected, clean: true }), false);
  assert.throws(() => buildStructuralFixture("unknown"), /Unknown/);
});

test("unclear-expression fixture does not include unrelated zero-defect evidence", () => {
  assert.equal(buildStructuralFixture("unclear").input.notes[0].body.includes("未发现缺陷"), false);
  assert.equal(buildStructuralFixture("evidence_gap").input.notes[0].body.includes("未发现缺陷"), false);
  assert.equal(buildStructuralFixture("transition").input.notes[0].body.includes("未发现缺陷"), true);
});

test("clean evidence fixture plans data collection without presuming missing baseline data exists", () => {
  const fixture = buildStructuralFixture("evidence_gap", true);
  assert.match(fixture.input.notes[0].body, /没有流程实施前后的缺陷统计/);
  assert.match(fixture.input.currentOutline.sections[2].purpose, /先按同一口径采集基线/);
  assert.match(fixture.input.currentOutline.sections[2].purpose, /待两组数据具备后再计算/);
});
