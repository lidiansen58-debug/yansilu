import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing draft status card reflects project clarification before draft saving", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /hasProject && hasScaffold && projectPreflightSummary\.level === "needs_clarification"\s*\?\s*"先澄清项目问题"/);
  assert.match(source, /hasProject && hasScaffold && projectPreflightSummary\.level === "needs_clarification"[\s\S]*projectPreflightSummary\.hint \|\| "先澄清项目关键问题，再保存草稿。"/);
});

test("writing draft status card reflects project gaps before draft saving", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /hasProject && hasScaffold && projectPreflightSummary\.level === "has_gaps"\s*\?\s*"先补项目缺口"/);
  assert.match(source, /hasProject && hasScaffold && projectPreflightSummary\.level === "has_gaps"[\s\S]*projectPreflightSummary\.hint \|\| "先补项目条件，再保存草稿。"/);
  assert.match(source, /renderWritingStatusCard\("草稿", draftStatus, draftNote, draftTone\)/);
});
