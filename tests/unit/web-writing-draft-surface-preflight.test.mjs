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

  assert.match(source, /hasProject && hasScaffold && projectPreflightSummary\.level === "has_gaps"\s*\?\s*"\u5148\u8865\u9879\u76ee\u7f3a\u53e3"/);
  assert.match(
    source,
    /hasProject && hasScaffold && projectPreflightSummary\.level === "has_gaps"[\s\S]*projectPreflightSummary\.hint \|\| "\u5148\u8865\u9879\u76ee\u7f3a\u53e3\uff0c\u518d\u4fdd\u5b58\u8349\u7a3f\u3002"/
  );
  assert.match(source, /renderWritingStatusCard\("\u8349\u7a3f", draftStatus, draftNote, draftTone\)/);
});
