import test from "node:test";
import assert from "node:assert/strict";
import { buildWritingStrongModelRequest, mergeWritingStrongModelResponse } from "../../packages/ai-orchestrator/src/writing-analysis.mjs";

function request() {
  return buildWritingStrongModelRequest({ privacyMode: "local_only",
    currentOutline: { sections: [{ heading: "Only memorize", purpose: "Memorization proves understanding" }, { heading: "Explain" }, { heading: "Explain" }] },
    notes: [{ noteId: "n1", body: "Fluent memorization is not understanding. Explain the reason." }]
  });
}

const contradiction = { kind: "contradiction", sectionNumbers: [1], problem: "This conflicts with the note", action: "Distinguish memorization and understanding", sourceNoteIds: ["n1"], evidenceQuote: "Fluent memorization is not understanding." };
const repetition = { kind: "repetition", sectionNumbers: [2, 3], problem: "These chapters repeat", action: "Combine them", sourceNoteIds: [], evidenceQuote: "",
  repeatedClaim: "Explain", sectionEvidence: [{ sectionNumber: 2, quote: "Explain" }, { sectionNumber: 3, quote: "Explain" }] };

test("outline checks retain located diagnostics, verified quotes and missing evidence without generating prose", () => {
  const response = { checks: [contradiction,
    repetition,
    { kind: "evidence_gap", sectionNumbers: [2], problem: "Missing example", action: "Find a real example", sourceNoteIds: ["n1"], evidenceQuote: "" }
  ] };
  const result = mergeWritingStrongModelResponse(request(), response);
  assert.deepEqual(result.artifacts.map(item => item.type), ["WritingMove", "WritingMove", "SourceGap"]);
  assert.match(result.artifacts[0].body, /第 1 节「Only memorize」/);
  assert.match(result.artifacts[0].payload.whyItMatters, /依据原文：Fluent memorization/);
  assert.match(result.artifacts[1].body, /第 2 节.*第 3 节/);
  assert.match(result.artifacts[1].payload.whyItMatters, /共同判断：Explain/);
  assert.match(result.artifacts[1].payload.whyItMatters, /第 3 节原文：Explain/);
  assert.equal(result.summary.outlineDraftCount, 0);
  assert.match(result.summary.message, /3 处待核对/);
  assert.equal(result.provenance.canAutoConfirm, false);
  assert.ok(result.artifacts.every(item => item.status === "pending_review"));
  assert.deepEqual(result.raw, response);
});

test("repetition needs an identical complete purpose or heading and full section evidence", () => {
  for (const change of [
    { repeatedClaim: "" }, { sectionEvidence: [] },
    { sectionEvidence: [{ sectionNumber: 2, quote: "Explain" }, { sectionNumber: 2, quote: "Explain" }] },
    { sectionEvidence: [{ sectionNumber: 2, quote: "Explain" }, { sectionNumber: 3, quote: "Invented" }] },
    { repeatedClaim: "Explain why", sectionEvidence: [{ sectionNumber: 2, quote: "Explain" }, { sectionNumber: 3, quote: "Explain" }] },
    { sectionEvidence: [{ sectionNumber: 2, quote: "Explain" }, { sectionNumber: 1, quote: "Only memorize" }] }
  ]) assert.throws(() => mergeWritingStrongModelResponse(request(), { checks: [{ ...repetition, ...change }] }));
});

test("shared topics in complementary sections cannot pass as repeated claims", () => {
  const outlineRequest = buildWritingStrongModelRequest({ privacyMode: "local_only",
    currentOutline: { sections: [
      { heading: "Exercise and sleep", purpose: "Explain how exercise can improve sleep." },
      { heading: "Routine and sleep", purpose: "Explain how a regular bedtime can improve sleep." }
    ] }, notes: [{ noteId: "n1", body: "Exercise and a regular bedtime can both improve sleep." }]
  });
  const complementary = {
    kind: "repetition", sectionNumbers: [1, 2], problem: "These sections repeat", action: "Combine them",
    sourceNoteIds: [], evidenceQuote: "", repeatedClaim: "improve sleep",
    sectionEvidence: [
      { sectionNumber: 1, quote: "Exercise and sleep — Explain how exercise can improve sleep." },
      { sectionNumber: 2, quote: "Routine and sleep — Explain how a regular bedtime can improve sleep." }
    ]
  };
  assert.throws(() => mergeWritingStrongModelResponse(outlineRequest, { checks: [complementary] }), /完整要点一致/);
  assert.equal(mergeWritingStrongModelResponse(outlineRequest, { checks: [] }).artifacts.length, 0);
});

test("source-free structural checks may omit empty source IDs, but supplied IDs remain strict", () => {
  const { sourceNoteIds, ...structural } = repetition;
  const result = mergeWritingStrongModelResponse(request(), { checks: [structural] });
  assert.equal(result.artifacts.length, 1);
  assert.deepEqual(result.artifacts[0].sources.noteIds, []);
  for (const invalid of ["n1", null, ["invented"]]) {
    assert.throws(() => mergeWritingStrongModelResponse(request(), { checks: [{ ...structural, sourceNoteIds: invalid }] }));
  }
  const { sourceNoteIds: conflictIds, ...conflict } = contradiction;
  assert.throws(() => mergeWritingStrongModelResponse(request(), { checks: [conflict] }));
});

test("outline check rejects wrong tasks, invented sources, quotes and section positions", () => {
  const invalid = [
    { writingMoves: [{ text: "Invented example", sourceNoteIds: ["n1"] }] },
    { checks: [{ ...contradiction, kind: "example" }] },
    { checks: [{ ...contradiction, kind: "constructor" }] },
    { checks: [{ ...contradiction, sourceNoteIds: ["invented"] }] },
    { checks: [{ ...contradiction, evidenceQuote: "A made-up source quote" }] },
    { checks: [{ ...contradiction, sectionNumbers: [0] }] },
    { checks: [{ ...contradiction, sectionNumbers: [4] }] },
    { checks: [{ ...contradiction, evidenceQuote: "" }] },
    { checks: [{ ...contradiction, kind: "repetition", sectionNumbers: [2, 2] }] }
  ];
  for (const response of invalid) assert.throws(() => mergeWritingStrongModelResponse(request(), response));
  const empty = mergeWritingStrongModelResponse(request(), { checks: [] });
  assert.equal(empty.summary.artifactCount, 0);
  assert.match(empty.summary.message, /这次检查未发现明确问题/);
});
