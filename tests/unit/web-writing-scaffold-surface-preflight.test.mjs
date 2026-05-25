import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing scaffold status card reflects project clarification before scaffold generation", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const scaffoldNote = hasScaffold[\s\S]*hasProject && projectPreflightSummary\.level === "needs_clarification"[\s\S]*先澄清项目关键问题，再生成草稿骨架/);
  assert.match(source, /const scaffoldStatus = hasScaffold[\s\S]*hasProject && projectPreflightSummary\.level === "needs_clarification"[\s\S]*先澄清项目问题/);
  assert.match(source, /const scaffoldTone =[\s\S]*hasProject && projectPreflightSummary\.level !== "ready"[\s\S]*"warn"/);
});

test("writing scaffold status card reflects project gaps before scaffold generation", async () => {
  const source = await readPrototypeAppSource();

  assert.match(
    source,
    /const scaffoldNote = hasScaffold[\s\S]*hasProject && projectPreflightSummary\.level === "has_gaps"[\s\S]*\u5148\u8865\u9879\u76ee\u7f3a\u53e3\uff0c\u518d\u751f\u6210\u8349\u7a3f\u9aa8\u67b6\u3002/
  );
  assert.match(
    source,
    /const scaffoldStatus = hasScaffold[\s\S]*hasProject && projectPreflightSummary\.level === "has_gaps"[\s\S]*\u5148\u8865\u9879\u76ee\u7f3a\u53e3/
  );
});
