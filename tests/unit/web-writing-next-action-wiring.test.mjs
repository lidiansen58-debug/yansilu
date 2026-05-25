import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing center scaffold preview passes projected continuity into next-action planning", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /projectEntryProjectId: Boolean\(writingState\.project\?\.id\) \? "" : String\(projectEntry\?\.projectId \|\| ""\)\.trim\(\)/);
  assert.match(source, /projectEntryAction: Boolean\(writingState\.project\?\.id\) \? "" : String\(projectEntry\?\.action \|\| ""\)\.trim\(\)/);
  assert.match(source, /projectEntryActionLabel: Boolean\(writingState\.project\?\.id\) \? "" : String\(projectEntry\?\.actionLabel \|\| ""\)\.trim\(\)/);
});
