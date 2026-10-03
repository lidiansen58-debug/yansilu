import test from "node:test";
import assert from "node:assert/strict";
import { buildComparisonExperiment, comparisonExperimentChecks, isolatedComparisonTasks, isolatedComparisonMessages } from "../../scripts/writing-comparison-experiment.mjs";

const request = { messages: [{ role: "system", content: "" }, { role: "user", content: JSON.stringify({
  currentOutline: { sections: [
    { sectionNumber: 1, heading: "A", purpose: "claim A", sourceNoteIds: ["n1"] },
    { sectionNumber: 2, heading: "B", purpose: "claim B", sourceNoteIds: ["n1"] }
  ] }, notes: [{ noteId: "n1", excerpt: "actual source text" }]
}) }] };

test("comparison experiment binds locations and quotes to input, not model output", () => {
  const experiment = buildComparisonExperiment(request);
  const result = comparisonExperimentChecks(experiment, { judgments: [
    { id: "source-1", relation: "conflict", reason: "opposite claim", sourceNoteId: "n1", evidenceQuote: "invented text" },
    { id: "source-2", relation: "compatible", reason: "supported" },
    { id: "pair-1-2", relation: "duplicate", reason: "same claim", sharedClaim: "shared proposition", sectionNumbers: [99] }
  ] });
  assert.equal(result.checks[0].evidenceQuote, "actual source text");
  assert.deepEqual(result.checks[0].sectionNumbers, [1]);
  assert.deepEqual(result.checks[1].sectionNumbers, [1, 2]);
  assert.deepEqual(result.checks[1].sectionEvidence.map(item => item.quote), ["claim A", "claim B"]);
});

test("comparison experiment rejects omitted tasks, duplicate IDs and invented sources", () => {
  const experiment = buildComparisonExperiment(request);
  const judgments = [
    { id: "source-1", relation: "compatible", reason: "supported" },
    { id: "source-2", relation: "compatible", reason: "supported" },
    { id: "pair-1-2", relation: "distinct", reason: "different claims" }
  ];
  assert.deepEqual(comparisonExperimentChecks(experiment, { judgments }), { checks: [] });
  assert.throws(() => comparisonExperimentChecks(experiment, { judgments: judgments.slice(1) }), /omitted/);
  assert.throws(() => comparisonExperimentChecks(experiment, { judgments: [judgments[0], judgments[0], judgments[2]] }), /invalid/);
  assert.throws(() => comparisonExperimentChecks(experiment, { judgments: [{ ...judgments[0], relation: "conflict", sourceNoteId: "fake" }, ...judgments.slice(1)] }), /invented/);
});

test("isolated source comparisons include exactly one source and its chapter", () => {
  const experiment = buildComparisonExperiment(request);
  experiment.tasks[0].sources.push({ noteId: "n2", excerpt: "second source text" });
  const tasks = isolatedComparisonTasks(experiment);
  assert.deepEqual(tasks.map(task => task.id), ["source-1-0", "source-1-1", "source-2-0", "pair-1-2"]);
  for (const task of tasks.filter(task => task.type === "source")) {
    assert.equal(task.sources.length, 1);
    const messages = isolatedComparisonMessages(task);
    assert.deepEqual(messages.map(message => message.role), ["system", "user"]);
    assert.deepEqual(JSON.parse(messages[1].content), {
      claimToVerify: { heading: task.section.heading, claim: task.section.purpose },
      sourceText: task.sources[0].excerpt
    });
  }
  assert.equal(experiment.tasks[0].sources.length, 2);
});

test("isolated pair comparisons exclude sources and unrelated chapters", () => {
  const task = isolatedComparisonTasks(buildComparisonExperiment(request)).find(task => task.type === "pair");
  const payload = JSON.parse(isolatedComparisonMessages(task)[1].content);
  assert.deepEqual(payload, {
    chapterA: { heading: "A", claim: "claim A" },
    chapterB: { heading: "B", claim: "claim B" }
  });
  assert.equal(JSON.stringify(payload).includes("actual source text"), false);
});
