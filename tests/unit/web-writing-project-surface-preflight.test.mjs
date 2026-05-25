import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing project status card reflects project clarification before downstream steps", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const projectStatus = hasProject[\s\S]*projectPreflightSummary\.level === "needs_clarification"[\s\S]*先澄清项目问题/);
  assert.match(source, /renderWritingStatusCard\("项目", projectStatus, projectNote, projectTone\)/);
});

test("writing project status card reflects project gaps before downstream steps", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const projectStatus = hasProject[\s\S]*projectPreflightSummary\.level === "has_gaps"[\s\S]*先补项目缺口/);
});
