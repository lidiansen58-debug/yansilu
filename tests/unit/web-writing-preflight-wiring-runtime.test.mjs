import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `missing start marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

test("writing status strip keeps projected strong-model continuity out of primary readiness", async () => {
  const source = await readPrototypeAppSource();
  const statusStripBlock = sliceBetween(source, "function renderWritingStatusStrip()", "function renderWritingFlowSteps(");

  assert.doesNotMatch(statusStripBlock, /canContinueProjectedStrongModel/);
  assert.match(statusStripBlock, /const strongModelTone = strongModelReady \? "good" : "warn";/);
  assert.doesNotMatch(statusStripBlock, /basketReadiness\.level === "strong_model_ready"/);
});

test("writing flow steps declares project preflight state before using it in step wiring", async () => {
  const source = await readPrototypeAppSource();
  const flowStepsBlock = sliceBetween(source, "function renderWritingFlowSteps(", "function renderWritingScaffoldPreview()");

  assert.match(flowStepsBlock, /const projectPreflight = writingState\.project\?\.preflight \|\| null;/);
  assert.match(flowStepsBlock, /const projectPreflightSummary = describeWritingProjectPreflight\(projectPreflight\);/);
  assert.match(flowStepsBlock, /const projectPreflightChecks = Array\.isArray\(projectPreflight\?\.checks\) \? projectPreflight\.checks : \[\];/);
  assert.match(flowStepsBlock, /projectPreflightLevel: hasProject \? projectPreflightSummary\.level : ""/);
  assert.match(flowStepsBlock, /projectPreflightChecksLength: hasProject \? projectPreflightChecks\.length : 0/);
});
