import test from "node:test";
import assert from "node:assert/strict";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing draft surfaces reuse projected draft continuity before a project is reopened", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const draftStatus = hasDraft/);
  assert.match(source, /!hasProject && projectEntry\?\.projectId && projectEntry\?\.action === "open-draft"/);
  assert.match(source, /const draftNote = hasDraft/);
  assert.match(source, /renderWritingStatusCard\("草稿", draftStatus, draftNote, draftTone\)/);
  assert.match(source, /projectEntryAction: hasProject \? "" : String\(projectEntry\?\.action \|\| ""\)\.trim\(\)/);
});
